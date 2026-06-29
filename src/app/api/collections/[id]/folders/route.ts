import { getCollectionAccess } from "@/lib/api/collections";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const access = await getCollectionAccess(id);
    if (access.response) {
      return access.response;
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const parentId = searchParams.get("parentId");
    const canViewPrivate = !!access.session;

    const folders = await prisma.folder.findMany({
      where: {
        collectionId: id,
        ...(all ? {} : { parentId: parentId || null }),
        ...(canViewPrivate ? {} : { isPublic: true }),
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error("Failed to get folders:", error);
    return NextResponse.json(
      { error: "Failed to get folders" },
      { status: 500 }
    );
  }
}
