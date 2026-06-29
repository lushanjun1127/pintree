import { requireApiSession } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) {
    return auth.response;
  }

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (auth.response) {
    return auth.response;
  }

  const { name } = await request.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  });

  return NextResponse.json(tag);
}
