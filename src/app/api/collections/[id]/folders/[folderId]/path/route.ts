import { getCollectionAccess } from "@/lib/api/collections";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const { id, folderId } = await params;

    if (!id || !folderId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const access = await getCollectionAccess(id);
    if (access.response) {
      return access.response;
    }

    const canViewPrivate = !!access.session;
    const path = [];
    let currentFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        collectionId: id,
        ...(canViewPrivate ? {} : { isPublic: true }),
      },
    });

    if (!currentFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    while (currentFolder) {
      path.unshift({
        id: currentFolder.id,
        name: currentFolder.name,
        parentId: currentFolder.parentId,
      });

      if (!currentFolder.parentId) {
        break;
      }

      currentFolder = await prisma.folder.findFirst({
        where: {
          id: currentFolder.parentId,
          collectionId: id,
          ...(canViewPrivate ? {} : { isPublic: true }),
        },
      });

      if (!currentFolder) {
        return NextResponse.json({ error: "Folder path not found" }, { status: 404 });
      }
    }

    return NextResponse.json(path);
  } catch (error) {
    console.error("Failed to get folder path:", error);
    return NextResponse.json(
      { error: "Failed to get folder path" },
      { status: 500 }
    );
  }
}
