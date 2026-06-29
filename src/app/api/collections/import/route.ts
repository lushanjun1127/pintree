import { NextRequest, NextResponse } from "next/server";
import pLimit from "p-limit";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api/auth";
import { normalizeHttpUrl } from "@/lib/api/url";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface FlattenedBookmarkItem {
  id: string;
  type: "folder" | "link";
  title: string;
  parentId?: string;
  sortOrder: number;
  addDate?: number;
  url?: string;
  icon?: string;
  depth?: number;
}

type FolderMapItem = {
  dataBaseId: string;
  processId: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiSession();
    if (auth.response) {
      return auth.response;
    }

    const { name, description, bookmarks, collectionId, folderMap } =
      await request.json();

    if (!Array.isArray(bookmarks)) {
      return NextResponse.json({ error: "Invalid bookmarks payload" }, { status: 400 });
    }

    if (!collectionId && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    // Prevent import if any other collection already exists
    const existingCollectionsCount = await prisma.collection.count();

    if (existingCollectionsCount > 0 && !collectionId) {
      throw new Error("Cannot create new collection: collections already exist");
    }

    let targetCollection;
    let insideFolderMap: FolderMapItem[] = Array.isArray(folderMap) ? folderMap : [];

    // Handle collection (create new or use existing)
    if (collectionId) {
      targetCollection = await prisma.collection.findUnique({
        where: { id: collectionId },
      });

      if (!targetCollection) {
        throw new Error("Specified collection does not exist");
      }
    } else {
      // Create new collection
      targetCollection = await prisma.collection.create({
        data: {
          name: name.trim(),
          description: typeof description === "string" ? description : "",
        },
      });

      // Use collectionId as slug to update database
      await prisma.collection.update({
        where: { id: targetCollection.id },
        data: {
          slug: targetCollection.id,
        },
      });
    }

    // Create folders individually and ensure parent folders are created
    const folderItems = bookmarks.filter(
      (item: FlattenedBookmarkItem) => item.type === "folder"
    );
    const limit = pLimit(10); // Limit concurrency to 10
    // Group folders by depth
    const foldersByDepth = folderItems.reduce(
      (
        acc: Record<number, FlattenedBookmarkItem[]>,
        folder: FlattenedBookmarkItem
      ) => {
        const depth = folder.depth ?? 0;
        if (!acc[depth]) {
          acc[depth] = [];
        }
        acc[depth].push(folder);
        return acc;
      },
      {} as Record<number, FlattenedBookmarkItem[]>
    );

    // Process by depth order, create folders at the same depth concurrently
    const depths = Object.keys(foldersByDepth)
      .map(Number)
      .sort((a, b) => a - b);
    for (const depth of depths) {
      const foldersAtDepth = foldersByDepth[depth];
      const promises = foldersAtDepth.map((folder: FlattenedBookmarkItem) =>
        limit(async () => {
          const existingMapping = insideFolderMap.find(
            (item) => item.processId === folder.id
          );
          if (!existingMapping) {
            const parentId = folder.parentId
              ? insideFolderMap.find(
                  (item) => item.processId === folder.parentId
                )?.dataBaseId
              : undefined;

            const createdFolder = await prisma.folder.create({
              data: {
                name: folder.title,
                collectionId: targetCollection.id,
                parentId: parentId,
                sortOrder: Number.isFinite(folder.sortOrder) ? folder.sortOrder : 0,
              },
            });

            insideFolderMap.push({
              dataBaseId: createdFolder.id,
              processId: folder.id,
            });
          }
        })
      );

      await Promise.all(promises);
    }

    // Create bookmarks in parallel
    const bookmarkItems = bookmarks.filter(
      (item: FlattenedBookmarkItem) => item.type === "link"
    );
    const bookmarkPromises = bookmarkItems.map(
      (bookmark: FlattenedBookmarkItem) =>
        limit(async () => {
          const normalizedUrl = normalizeHttpUrl(bookmark.url);
          if (!normalizedUrl) {
            return;
          }

          const folderId = bookmark.parentId
            ? insideFolderMap.find(
                (item) => item.processId === bookmark.parentId
              )?.dataBaseId
            : undefined;

          await prisma.bookmark.create({
            data: {
              title: bookmark.title || normalizedUrl,
              url: normalizedUrl,
              icon: bookmark.icon,
              collectionId: targetCollection.id,
              folderId: folderId,
              sortOrder: Number.isFinite(bookmark.sortOrder) ? bookmark.sortOrder : 0,
            },
          });
        })
    );

    // Wait for all bookmarks to be created
    await Promise.all(bookmarkPromises);

    return NextResponse.json(
      {
        message: "Import successful",
        collectionId: targetCollection.id,
        insideFolderMap: insideFolderMap,
        itemsImported: bookmarks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error importing bookmarks:", error);
    return NextResponse.json(
      {
        message: "Import failed",
        error: "Unable to import bookmarks",
      },
      { status: 500 }
    );
  }
}
