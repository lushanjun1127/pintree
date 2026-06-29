"use server";

import { defaultImages, defaultSettings } from "@/lib/defaultSettings";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import pLimit from "p-limit";

export async function updateSettingsWithDefaults() {
  const baseUrl = await getTrustedBaseUrl();

  try {
    const limit = pLimit(5);

    await Promise.all(
      defaultSettings.map((setting) =>
        limit(() =>
          prisma.siteSetting.upsert({
            where: { key: setting.key },
            update: {},
            create: {
              key: setting.key,
              value: setting.value,
              type: setting.type,
              group: setting.group,
              description: setting.description,
            },
          })
        )
      )
    );

    await Promise.all(
      defaultImages.map(async (imageData) => {
        for (const settingKey of imageData.settingKeys || []) {
          const setting = await prisma.siteSetting.findUnique({
            where: { key: settingKey.key },
          });

          if (!setting) {
            continue;
          }

          const existingSettingImage = await prisma.settingImage.findFirst({
            where: { settingId: setting.id },
          });

          if (existingSettingImage) {
            continue;
          }

          const imagesToProcess = imageData.images || [imageData.image];

          await Promise.all(
            imagesToProcess.map(async (imagePath) => {
              try {
                const imageUrl = imagePath.startsWith("http")
                  ? imagePath
                  : `${baseUrl}${imagePath}`;

                const response = await fetch(imageUrl);

                if (!response.ok) {
                  console.warn(`Failed to fetch image ${imageUrl}: ${response.status} ${response.statusText}`);
                  return;
                }

                const buffer = await response.arrayBuffer();

                const image = await prisma.image.create({
                  data: {
                    name: imageData.name,
                    data: Buffer.from(buffer),
                    mimeType: getMimeType(imagePath),
                    type: imageData.type,
                    size: buffer.byteLength,
                    isPublic: true,
                  },
                });

                await prisma.settingImage.create({
                  data: {
                    settingId: setting.id,
                    imageId: image.id,
                    description: `Default ${imageData.name} for ${settingKey.key}`,
                  },
                });
              } catch (error) {
                console.error(`Failed to process image ${imagePath}:`, error);
              }
            })
          );
        }
      })
    );
  } catch (error) {
    console.error("Failed to update settings:", error);
    throw error;
  }
}

async function getTrustedBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configuredUrl) {
    return new URL(configuredUrl).origin;
  }

  const host = (await headers()).get("host");
  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
