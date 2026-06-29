import { getCollectionAccess } from "@/lib/api/collections";
import { parsePositiveInt, parseSortField, parseSortOrder } from "@/lib/api/params";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const PUBLIC_SORT_FIELDS = ["sortOrder", "createdAt", "updatedAt"] as const;

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

    const canViewPrivate = !!access.session;
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const sortField = parseSortField(searchParams.get("sortField"), PUBLIC_SORT_FIELDS, "sortOrder");
    const sortOrder = parseSortOrder(searchParams.get("sortOrder"));
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 100, 100);

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          collectionId: id,
          ...(canViewPrivate ? {} : { isPublic: true }),
        },
        select: { id: true },
      });

      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    const bookmarkVisibilityFilter = canViewPrivate
      ? {}
      : {
          OR: [
            { folderId: null },
            { folder: { isPublic: true } },
          ],
        };

    const [totalBookmarks, currentBookmarks] = await Promise.all([
      prisma.bookmark.count({
        where: {
          collectionId: id,
          ...bookmarkVisibilityFilter,
        },
      }),
      prisma.bookmark.findMany({
        where: {
          collectionId: id,
          ...(folderId ? { folderId } : { folderId: null }),
          ...bookmarkVisibilityFilter,
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
      }),
    ]);

    const subfolders = await Promise.all(
      (
        await prisma.folder.findMany({
          where: {
            collectionId: id,
            parentId: folderId || null,
            ...(canViewPrivate ? {} : { isPublic: true }),
          },
          orderBy: {
            [sortField]: sortOrder,
          },
        })
      ).map(async (folder) => {
        const [bookmarks, childFolders, bookmarkCount] = await Promise.all([
          prisma.bookmark.findMany({
            where: {
              folderId: folder.id,
            },
            take: pageSize,
            orderBy: {
              [sortField]: sortOrder,
            },
          }),
          prisma.folder.findMany({
            where: {
              parentId: folder.id,
              ...(canViewPrivate ? {} : { isPublic: true }),
            },
            orderBy: {
              [sortField]: sortOrder,
            },
          }),
          prisma.bookmark.count({
            where: {
              folderId: folder.id,
            },
          }),
        ]);

        return {
          ...folder,
          items: [
            ...childFolders.map((childFolder) => ({ ...childFolder, type: "folder" as const })),
            ...bookmarks.map((bookmark) => ({ ...bookmark, type: "bookmark" as const })),
          ],
          bookmarkCount,
        };
      })
    );

    return NextResponse.json({
      currentBookmarks,
      subfolders,
      total: totalBookmarks,
    });
  } catch (error) {
    console.error("Failed to get content:", error);
    return NextResponse.json({ error: "Failed to get content" }, { status: 500 });
  }
}
