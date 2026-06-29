import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import pLimit from "p-limit";
import { ExportedFolder } from "../../[id]/export/route";
import { requireApiSession } from "@/lib/api/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  request: Request
) {
  try {
    const auth = await requireApiSession();
    if (auth.response) {
      return auth.response;
    }

    const { name, description, folders, collectionId, folderMap } =
      await request.json();

    if (!Array.isArray(folders)) {
      return NextResponse.json({ error: "Invalid folders payload" }, { status: 400 });
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
    let insideFolderMap: { tempId: string; id: string }[] = Array.isArray(folderMap) ? folderMap : [];

    // Handle collection (create new or use existing)
    if (collectionId) {
      targetCollection = await prisma.collection.findUnique({
        where: { id: collectionId },
      });

      if (!targetCollection) {
        throw new Error("Collection not found");
      }
    } else {
      // Check if collection with the same name already exists
      const existingCollection = await prisma.collection.findFirst({
        where: { name: name.trim() },
      });

      if (existingCollection) {
        throw new Error("Collection name already exists");
      }

      // Create new collection
      targetCollection = await prisma.collection.create({
        data: {
          name: name.trim(),
          description: typeof description === "string" ? description : "",
        },
      });

      // Update database with collectionId as slug
      await prisma.collection.update({
        where: { id: targetCollection.id },
        data: {
          slug: targetCollection.id,
        },
      });
    }

    // Use p-limit to control concurrency, set to 10 concurrent operations
    const limit = pLimit(10);

    // Parallel import of folders, immediately update insideFolderMap
    const folderPromises = folders.map((folder: ExportedFolder) => 
      limit(async () => {
        // Find parent folder ID
        const parentId = folder.parentTempId
          ? insideFolderMap.find(item => item.tempId === folder.parentTempId)?.id
          : undefined;

        // Create folder
        const createdFolder = await prisma.folder.create({
          data: {
            name: folder.name || "Untitled folder",
            icon: folder.icon,
            sortOrder: Number.isFinite(folder.sortOrder) ? folder.sortOrder : 0,
            parentId: parentId,
            collectionId: targetCollection.id,
            isPublic: true,
          },
        });

        // Immediately update insideFolderMap
        const newFolderMap = { tempId: folder.tempId, id: createdFolder.id };
        insideFolderMap.push(newFolderMap);

        return createdFolder;
      })
    );

    // Wait for all folders to be created
    await Promise.all(folderPromises);

    return NextResponse.json({
      message: "Folders import successful",
      collectionId: targetCollection.id,
      insideFolderMap: insideFolderMap,
      itemsImported: folders.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import folders" },
      { status: 500 }
    );
  }
}
