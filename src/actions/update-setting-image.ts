"use server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

async function uploadImage(file: File, existingImageId: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Unsupported image type");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image file is too large");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return prisma.image.upsert({
      where: { id: existingImageId },
      update: {
        name: file.name,
        data: buffer,
        mimeType: file.type,
        size: file.size,
        description: `Setting image: ${file.name}`,
      },
      create: {
        id: existingImageId,
        name: file.name,
        data: buffer,
        mimeType: file.type,
        type: "setting",
        size: file.size,
        description: `Setting image: ${file.name}`,
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
      },
    });
  } catch (error) {
    console.error("Failed to upload image:", error);
    throw new Error(`Failed to upload image ${file.name}`);
  }
}

export async function updateSettingImage(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }

  const settingKey = formData.get("settingKey");
  const imageId = formData.get("imageId");
  const file = formData.get("file");

  if (typeof settingKey !== "string" || !(file instanceof File)) {
    throw new Error("Missing required parameters");
  }

  const setting = await prisma.siteSetting.findUnique({
    where: { key: settingKey },
    include: {
      images: {
        select: { imageId: true },
      },
    },
  });

  if (!setting) {
    throw new Error(`Could not find the corresponding setting item: ${settingKey}`);
  }

  const existingImageId =
    (typeof imageId === "string" && imageId) || setting.images[0]?.imageId;

  if (!existingImageId) {
    throw new Error(`Could not find the corresponding image: ${settingKey}`);
  }

  const uploadedImage = await uploadImage(file, existingImageId);

  return {
    settingKey,
    success: true,
    image: uploadedImage,
  };
}
