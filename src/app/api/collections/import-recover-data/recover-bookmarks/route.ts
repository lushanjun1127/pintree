import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExportedBookmark } from "../../[id]/export/route";
import pLimit from "p-limit";
import { requireApiSession } from "@/lib/api/auth";
import { normalizeHttpUrl } from "@/lib/api/url";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
) {
  try {
    const auth = await requireApiSession();
    if (auth.response) {
      return auth.response;
    }

    // Parse imported data
    const { bookmarks, collectionId, folderMap } = await request.json();

    if (!Array.isArray(bookmarks) || typeof collectionId !== "string" || !collectionId) {
      return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });
    }

    const targetCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { id: true },
    });

    if (!targetCollection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    
    // Prevent import if any other collection already exists
    const existingCollectionsCount = await prisma.collection.count();

    if (existingCollectionsCount > 0 && !collectionId) {
      throw new Error("Cannot create new collection: collections already exist");
    }
    

    // Set concurrency limit, for example, process 5 bookmarks simultaneously
    const limit = pLimit(10);

    // Use p-limit to concurrently import bookmarks
    const importedBookmarks = await Promise.all(
      bookmarks.map((bookmark: ExportedBookmark) => 
        limit(async () => {
          const normalizedUrl = normalizeHttpUrl(bookmark.url);
          if (!normalizedUrl) {
            return null;
          }

          const folderId = bookmark.folderTempId
            ? (Array.isArray(folderMap) ? folderMap : []).find((item: { tempId: string; id: string }) => item.tempId === bookmark.folderTempId)?.id
            : undefined;

          return prisma.bookmark.create({
            data: {
              title: bookmark.title || normalizedUrl,
              url: normalizedUrl,
              description: bookmark.description,
              icon: bookmark.icon,
              isFeatured: bookmark.isFeatured,
              sortOrder: Number.isFinite(bookmark.sortOrder) ? bookmark.sortOrder : 0,
              collectionId: collectionId,
              folderId: folderId,
              tags: {
                connectOrCreate: (Array.isArray(bookmark.tags) ? bookmark.tags : []).map((tagName) => ({
                  where: {
                    name: tagName,
                  },
                  create: {
                    name: tagName,
                  },
                })),
              },
            },
          });
        })
      )
    );

    return NextResponse.json({
      message: "Bookmarks import successful",
      importedBookmarkCount: importedBookmarks.filter(Boolean).length,
    });
  } catch (error) {
    console.error("Import bookmarks error:", error);
    return NextResponse.json(
      { error: "Failed to import bookmarks" },
      { status: 500 }
    );
  }
}
