import { mkdir, writeFile } from "fs/promises";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "path";

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
const UPLOAD_TARGETS: Record<string, { path: string; publicPath: string; types: Set<string> }> = {
  logo: {
    path: "public/logo.png",
    publicPath: "/logo.png",
    types: new Set(["image/png", "image/jpeg"]),
  },
  favicon: {
    path: "public/favicon/favicon.ico",
    publicPath: "/favicon/favicon.ico",
    types: new Set(["image/x-icon", "image/vnd.microsoft.icon", "image/png"]),
  },
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }

    if (typeof type !== "string" || !UPLOAD_TARGETS[type]) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const target = UPLOAD_TARGETS[type];
    if (!target.types.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: "File is too large" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fullPath = path.join(process.cwd(), target.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);

    return NextResponse.json({
      success: true,
      path: target.publicPath,
    });
  } catch (error) {
    console.error("File upload failed:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}

export const preferredRegion = "auto";
