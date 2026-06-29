import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function getCollectionAccess(collectionId: string) {
  const [session, collection] = await Promise.all([
    getServerSession(authOptions),
    prisma.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true,
        name: true,
        isPublic: true,
      },
    }),
  ]);

  if (!collection || (!session && !collection.isPublic)) {
    return {
      session,
      collection: null,
      response: NextResponse.json({ error: "Collection not found" }, { status: 404 }),
    };
  }

  return {
    session,
    collection,
    response: null,
  };
}
