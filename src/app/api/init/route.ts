import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    const result = await initializeDatabase();

    if (result.success) {
      return NextResponse.json(
        { message: "Database initialized successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Failed to initialize database", error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
