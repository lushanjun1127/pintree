import { parsePositiveInt } from "@/lib/api/params";
import { normalizeHttpUrl } from "@/lib/api/url";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 10_000);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 100, 100);
    const skip = (page - 1) * pageSize;

    const [total, bookmarks] = await Promise.all([
      prisma.bookmark.count(),
      prisma.bookmark.findMany({
        select: {
          id: true,
          title: true,
          url: true,
          description: true,
          icon: true,
          isFeatured: true,
          createdAt: true,
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
        skip,
        take: pageSize,
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      bookmarks,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Failed to get bookmarks:", error);
    return NextResponse.json({ error: "Failed to get bookmarks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, url, description, icon, collectionId, folderId, isFeatured, sortOrder } =
      await request.json();
    const normalizedUrl = normalizeHttpUrl(url);

    if (!title || !normalizedUrl || !collectionId) {
      return NextResponse.json(
        { error: "A title, valid HTTP(S) URL and collection are required" },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { id: true },
    });

    if (!collection) {
      return NextResponse.json({ error: "Selected collection does not exist" }, { status: 400 });
    }

    const bookmarkData: {
      title: string;
      url: string;
      description?: string;
      icon?: string;
      collectionId: string;
      folderId?: string;
      isFeatured: boolean;
      sortOrder: number;
    } = {
      title,
      url: normalizedUrl,
      description,
      icon,
      collectionId,
      isFeatured: isFeatured ?? false,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    };

    if (folderId && folderId !== "none") {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          collectionId,
        },
        select: { id: true },
      });

      if (!folder) {
        return NextResponse.json(
          { error: "Selected folder does not exist or does not belong to this collection" },
          { status: 400 }
        );
      }

      bookmarkData.folderId = folderId;
    }

    const bookmark = await prisma.bookmark.create({
      data: bookmarkData,
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
        tags: true,
      },
    });

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("Failed to create bookmark:", error);
    return NextResponse.json(
      { error: "Failed to create bookmark, please check all fields are correct" },
      { status: 500 }
    );
  }
}
