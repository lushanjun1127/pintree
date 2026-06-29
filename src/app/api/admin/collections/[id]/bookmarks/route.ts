import { requireApiSession } from "@/lib/api/auth";
import { parseSortField, parseSortOrder } from "@/lib/api/params";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_SORT_FIELDS = ["createdAt", "updatedAt", "sortOrder"] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireApiSession();
    if (auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const sortField = parseSortField(searchParams.get("sortField"), ADMIN_SORT_FIELDS, "createdAt");
    const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const currentBookmarks = await prisma.bookmark.findMany({
      where: {
        collectionId: id,
        ...(folderId ? { folderId } : { folderId: null }),
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      include: {
        collection: {
          select: {
            name: true,
          },
        },
        folder: {
          select: {
            name: true,
          },
        },
      },
    });

    const subfolders = await prisma.folder.findMany({
      where: {
        collectionId: id,
        parentId: folderId || null,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      currentBookmarks,
      subfolders,
    });
  } catch (error) {
    console.error("Failed to get content:", error);
    return NextResponse.json(
      { error: "Failed to get content" },
      { status: 500 }
    );
  }
}
