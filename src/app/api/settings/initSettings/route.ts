import { requireApiSession } from "@/lib/api/auth";
import { updateSettingsWithDefaults } from "@/actions/init-settings";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST() {
  try {
    const auth = await requireApiSession();
    if (auth.response) {
      return auth.response;
    }

    await updateSettingsWithDefaults();

    return NextResponse.json(
      {
        message: "Settings initialized successfully",
        status: "success",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings initialization failed:", error);

    return NextResponse.json(
      {
        message: "Settings initialization failed",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
