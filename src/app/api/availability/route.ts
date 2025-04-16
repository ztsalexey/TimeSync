import { NextRequest, NextResponse } from "next/server";
import { createUser, saveAvailability, getEventById } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, timezone, eventId, availability } = body;

    // Validate required fields
    if (!name || !timezone || !eventId || !availability) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Create user
    const user = await createUser(name, timezone, eventId);
    if (!user) {
      return NextResponse.json(
        { message: "Failed to create user" },
        { status: 500 }
      );
    }

    // Save availability
    const result = await saveAvailability(eventId, user.id, availability);
    if (!result) {
      return NextResponse.json(
        { message: "Failed to save availability" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Availability saved successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving availability:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
