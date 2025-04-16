import { NextResponse } from "next/server";
import { deleteExpiredEvents } from "@/lib/db";

export async function GET() {
  try {
    const deletedCount = await deleteExpiredEvents();

    return NextResponse.json(
      { message: `Deleted ${deletedCount} expired events` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cleaning up expired events:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
