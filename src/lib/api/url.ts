import { lookup } from "dns/promises";
import net from "net";

const PRIVATE_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIPv4(address: string) {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIPv6(address: string) {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function assertPublicHttpUrl(value: string) {
  if (!isHttpUrl(value)) {
    throw new Error("Only http and https URLs are allowed");
  }

  const parsedUrl = new URL(value);
  const hostname = parsedUrl.hostname.toLowerCase();

  if (parsedUrl.username || parsedUrl.password || PRIVATE_HOSTNAMES.has(hostname)) {
    throw new Error("URL host is not allowed");
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 && isPrivateIPv4(hostname)) {
    throw new Error("Private network URLs are not allowed");
  }
  if (ipVersion === 6 && isPrivateIPv6(hostname)) {
    throw new Error("Private network URLs are not allowed");
  }

  if (ipVersion === 0) {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length) {
      throw new Error("URL host cannot be resolved");
    }

    for (const address of addresses) {
      if (
        (address.family === 4 && isPrivateIPv4(address.address)) ||
        (address.family === 6 && isPrivateIPv6(address.address))
      ) {
        throw new Error("Private network URLs are not allowed");
      }
    }
  }

  return parsedUrl;
}

export function normalizeHttpUrl(value: unknown) {
  if (!isHttpUrl(value)) {
    return null;
  }

  return new URL(value).href;
}
