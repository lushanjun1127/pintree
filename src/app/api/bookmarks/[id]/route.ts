import { normalizeHttpUrl } from "@/lib/api/url";
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

    await prisma.bookmark.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Delete success" });
  } catch (error) {
    console.error("Delete bookmark failed:", error);
    return NextResponse.json({ error: "Delete bookmark failed" }, { status: 500 });
  }
}

export async function PUT(
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
    const normalizedUrl = normalizeHttpUrl(data.url);

    if (!data.title || !normalizedUrl || !data.collectionId) {
      return NextResponse.json(
        { error: "A title, valid HTTP(S) URL and collection are required" },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findUnique({
      where: { id: data.collectionId },
      select: { id: true },
    });

    if (!collection) {
      return NextResponse.json({ error: "Selected collection does not exist" }, { status: 400 });
    }

    const folderId = data.folderId && data.folderId !== "none" ? data.folderId : null;
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          collectionId: data.collectionId,
        },
        select: { id: true },
      });

      if (!folder) {
        return NextResponse.json(
          { error: "Selected folder does not exist or does not belong to this collection" },
          { status: 400 }
        );
      }
    }

    const bookmark = await prisma.bookmark.update({
      where: {
        id,
      },
      data: {
        title: data.title,
        url: normalizedUrl,
        description: data.description,
        collectionId: data.collectionId,
        folderId,
        isFeatured: data.isFeatured,
        icon: data.icon,
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

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("Update bookmark failed:", error);
    return NextResponse.json({ error: "Update bookmark failed" }, { status: 500 });
  }
}
