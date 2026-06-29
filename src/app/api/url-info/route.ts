import { assertPublicHttpUrl } from "@/lib/api/url";
import { requireApiSession } from "@/lib/api/auth";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 1024 * 1024;

async function fetchPublicUrl(url: string, init?: RequestInit, redirects = 0): Promise<Response> {
  const parsedUrl = await assertPublicHttpUrl(url);
  const response = await fetch(parsedUrl.href, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      ...init?.headers,
    },
  });

  if (response.status >= 300 && response.status < 400) {
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("Too many redirects");
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    const nextUrl = new URL(location, parsedUrl).href;
    return fetchPublicUrl(nextUrl, init, redirects + 1);
  }

  return response;
}

async function checkUrl(url: string) {
  try {
    const response = await fetchPublicUrl(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function getFallbackIcons(domain: string) {
  const encodedDomain = encodeURIComponent(domain);
  return [
    `https://${domain}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${encodedDomain}&sz=128`,
    `https://logo.clearbit.com/${encodedDomain}`,
  ];
}

async function getIconUrl(domain: string, pageUrl: string, $?: CheerioAPI): Promise<string> {
  const icons = await getAllIcons(domain, pageUrl, $);
  return icons[0] || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

async function getAllIcons(domain: string, pageUrl?: string, $?: CheerioAPI): Promise<string[]> {
  const icons: string[] = [];

  if ($ && pageUrl) {
    const iconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
      'meta[property="og:image"]',
    ];

    for (const selector of iconSelectors) {
      const iconElement = $(selector);
      const iconUrl = iconElement.attr("href") || iconElement.attr("content");
      if (!iconUrl) {
        continue;
      }

      try {
        const absoluteUrl = new URL(iconUrl, pageUrl).href;
        if (await checkUrl(absoluteUrl)) {
          icons.push(absoluteUrl);
        }
      } catch {
        // Ignore malformed icon URLs from remote pages.
      }
    }
  }

  for (const iconUrl of getFallbackIcons(domain)) {
    if (await checkUrl(iconUrl)) {
      icons.push(iconUrl);
    }
  }

  return [...new Set(icons)];
}

async function readLimitedText(response: Response) {
  const contentLength = Number.parseInt(response.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_HTML_BYTES) {
    throw new Error("Remote document is too large");
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    received += value.byteLength;
    if (received > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Remote document is too large");
    }

    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode();
  return result;
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) {
      return auth.response;
    }

    const { url } = await request.json();

    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "Please enter a URL" }, { status: 400 });
    }

    const parsedUrl = await assertPublicHttpUrl(url.trim());
    const domain = parsedUrl.hostname;
    const response = await fetchPublicUrl(parsedUrl.href, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      return NextResponse.json({
        title: parsedUrl.href,
        description: "",
        icons: await getAllIcons(domain),
        icon: await getIconUrl(domain, parsedUrl.href),
      });
    }

    const html = await readLimitedText(response);
    const $ = cheerio.load(html);

    const title =
      $("title").text() ||
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      domain;

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      "";

    return NextResponse.json({
      title: title.trim(),
      description: description.trim(),
      icons: await getAllIcons(domain, parsedUrl.href, $),
      icon: await getIconUrl(domain, parsedUrl.href, $),
    });
  } catch (error) {
    console.error("Error in URL info API:", error);
    return NextResponse.json(
      { error: "Failed to get URL information, please check if the URL is correct" },
      { status: 400 }
    );
  }
}
