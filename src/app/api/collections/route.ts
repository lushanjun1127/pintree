import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { normalizeHttpUrl } from "@/lib/api/url";
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get("publicOnly") === "true" || !session;

    const collections = await prisma.collection.findMany({
      where: publicOnly ? { isPublic: true } : undefined,
      orderBy: {
        sortOrder: "asc",
      },
    });

    const collectionsWithBookmarkCount = await Promise.all(
      collections.map(async (collection) => {
        const totalBookmarks = await prisma.bookmark.count({
          where: {
            collectionId: collection.id,
            ...(publicOnly
              ? {
                  OR: [
                    { folderId: null },
                    { folder: { isPublic: true } },
                  ],
                }
              : {}),
          },
        });

        return {
          ...collection,
          totalBookmarks,
        };
      })
    );

    return NextResponse.json(collectionsWithBookmarkCount);
  } catch (error) {
    console.error("Failed to get bookmark collections:", error);
    return NextResponse.json({ error: "Failed to get bookmark collections" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const existingCollections = await prisma.collection.findMany({
      take: 1,
    });

    if (existingCollections.length > 0) {
      return NextResponse.json(
        {
          error: "A collection already exists. Cannot create another collection.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, icon, isPublic, viewStyle, sortStyle, sortOrder } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    const slug = toSlug(name) || randomUUID();
    const normalizedIcon = icon ? normalizeHttpUrl(icon) || icon : "";

    const existingCollection = await prisma.collection.findFirst({
      where: {
        OR: [
          { name },
          { slug },
        ],
      },
    });

    if (existingCollection) {
      return NextResponse.json(
        { error: "The name or slug is already in use" },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" ? description : "",
        icon: normalizedIcon,
        isPublic: isPublic ?? true,
        viewStyle: viewStyle || "list",
        sortStyle: sortStyle || "alpha",
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        slug,
      },
    });

    return NextResponse.json(collection);
  } catch (error: unknown) {
    console.error("Detailed error creating collection:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Name or slug already in use" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}

function toSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
