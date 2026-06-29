import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folder = await prisma.folder.findUnique({
      where: { id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await prisma.folder.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Delete success" });
  } catch (error) {
    console.error("Delete folder failed:", error);
    return NextResponse.json({ error: "Delete folder failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const folder = await prisma.folder.findUnique({
      where: { id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const parentId = Object.prototype.hasOwnProperty.call(data, "parentId")
      ? data.parentId || null
      : folder.parentId;
    if (parentId) {
      if (parentId === id) {
        return NextResponse.json({ error: "A folder cannot be its own parent" }, { status: 400 });
      }

      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          collectionId: folder.collectionId,
        },
        select: { id: true },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder does not exist or does not belong to this collection" },
          { status: 400 }
        );
      }

      if (await isDescendantFolder(parentId, id)) {
        return NextResponse.json(
          { error: "A folder cannot be moved under one of its descendants" },
          { status: 400 }
        );
      }
    }

    const isPublic = data.isPublic ?? folder.isPublic;
    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        name: data.name ?? folder.name,
        icon: data.icon,
        isPublic,
        password: isPublic ? null : data.password || null,
        sortOrder: Number.isFinite(data.sortOrder) ? data.sortOrder : folder.sortOrder,
        parentId,
      },
    });

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error("Update folder failed:", error);
    return NextResponse.json({ error: "Update folder failed" }, { status: 500 });
  }
}

async function isDescendantFolder(candidateParentId: string, folderId: string) {
  let current = await prisma.folder.findUnique({
    where: { id: candidateParentId },
    select: { parentId: true },
  });

  while (current?.parentId) {
    if (current.parentId === folderId) {
      return true;
    }

    current = await prisma.folder.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }

  return false;
}
