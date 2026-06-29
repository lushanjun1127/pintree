import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma";



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await prisma.image.findFirst({
      where: { id, isPublic: true }
    })

    if (!image) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(image.data, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': image.size.toString()
      }
    })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}
