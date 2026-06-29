import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, icon, isPublic, password, collectionId, parentId } = await request.json();

    if (!name || !collectionId) {
      return NextResponse.json(
        { error: "Name and collection are required" },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { id: true },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 400 });
    }

    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          collectionId,
        },
        select: { id: true },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder does not exist or does not belong to this collection" },
          { status: 400 }
        );
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        icon,
        isPublic: isPublic ?? true,
        password: isPublic ? null : password || null,
        collectionId,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Failed to create folder:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
