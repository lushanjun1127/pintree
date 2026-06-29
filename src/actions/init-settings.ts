"use server";

import { prisma } from "@/lib/prisma";
import { defaultSettings, defaultImages } from "@/lib/defaultSettings";
import pLimit from "p-limit"; // 推荐使用 p-limit 控制并发
import { headers } from "next/headers";

export async function updateSettingsWithDefaults() {
  // 尝试从多个来源获取 baseUrl
  const referer = headers().get('referer');
  const host = headers().get('host');
  
  let baseUrl = '';

  if (referer) {
    // 优先使用 Referer 的完整 URL
    baseUrl = new URL(referer).origin;
  } else if (host) {
    // 如果没有 Referer，使用 host
    // 注意：在生产环境中，可能需要 HTTPS
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    baseUrl = `${protocol}://${host}`;
  } else {
    // 如果以上都失败，尝试使用环境变量中的应用URL
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
              (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
              'http://localhost:3000');
  }

  console.log(`Current base URL: ${baseUrl}`);

  try {
    // 使用并发处理
    const limit = pLimit(5); // 限制 5 个并发请求

    // 并发处理设置
    await Promise.all(
      defaultSettings.map((setting) =>
        limit(() => 
          // {
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
          // console.log(`处理设置 ${setting.key} 成功`);
        // }
      )
      )
    );

    // 并发处理图片
    await Promise.all(
      defaultImages.map(async (imageData) => {

        for (const settingKey of imageData.settingKeys || []) {
          const setting = await prisma.siteSetting.findUnique({
            where: { key: settingKey.key },
          });

          if (setting) {
            const existingSettingImage = await prisma.settingImage.findFirst({
              where: { settingId: setting.id },
            });

            if (!existingSettingImage) {
              const imagesToProcess = imageData.images || [imageData.image];

              await Promise.all(
                imagesToProcess.map(async (imagePath) => {
                  try {
                    // 构建完整的图片URL
                    const imageUrl = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`;
                    
                    const response = await fetch(imageUrl);
                    
                    // 检查响应是否成功
                    if (!response.ok) {
                      console.warn(`Failed to fetch image ${imageUrl}: ${response.status} ${response.statusText}`);
                      // 跳过此图片，继续处理其他图片
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
                    console.log(`Processed image ${imagePath} successfully`);
                  } catch (error) {
                    console.error(`Failed to process image ${imagePath}:`, error);
                    // 记录错误但不抛出，让其他图片继续处理
                  }
                })
              );
            }
          }
        }
      })
    );

    console.log("Settings and images updated successfully");
  } catch (error) {
    console.error("Failed to update settings:", error);
    throw error;
  }
}

// 获取文件的 MIME 类型
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