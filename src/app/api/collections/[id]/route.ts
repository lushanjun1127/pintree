import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { normalizeHttpUrl } from "@/lib/api/url";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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
    const nextName = typeof data.name === "string" ? data.name.trim() : undefined;
    const slug = nextName ? toSlug(nextName) || randomUUID() : undefined;

    if (nextName) {
      const existingCollection = await prisma.collection.findFirst({
        where: {
          OR: [
            {
              name: {
                mode: "insensitive",
                equals: nextName,
              },
            },
            {
              slug: {
                mode: "insensitive",
                equals: slug,
              },
            },
          ],
          NOT: {
            id,
          },
        },
      });

      if (existingCollection) {
        return NextResponse.json(
          { error: "The name or slug is already in use" },
          { status: 400 }
        );
      }
    }

    const updateData: Prisma.CollectionUpdateInput = {};

    if (nextName) {
      updateData.name = nextName;
      updateData.slug = slug;
    }
    if (typeof data.description === "string") {
      updateData.description = data.description;
    }
    if (typeof data.icon === "string") {
      updateData.icon = normalizeHttpUrl(data.icon) || data.icon;
    }
    if (typeof data.isPublic === "boolean") {
      updateData.isPublic = data.isPublic;
    }
    if (typeof data.viewStyle === "string") {
      updateData.viewStyle = data.viewStyle;
    }
    if (typeof data.sortStyle === "string") {
      updateData.sortStyle = data.sortStyle;
    }
    if (Number.isFinite(data.sortOrder)) {
      updateData.sortOrder = data.sortOrder;
    }

    const collection = await prisma.collection.update({
      where: {
        id,
      },
      data: updateData,
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Update collection error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "The name or slug is already in use" },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

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

    await prisma.collection.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Delete successful" });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
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
