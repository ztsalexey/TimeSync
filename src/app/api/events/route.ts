import { NextRequest, NextResponse } from "next/server";
import { createEvent, getEventBySlug } from "@/lib/db";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, startDate, endDate, startTime, endTime, timezone } = body;

    // Validate required fields
    if (
      !name ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !timezone
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate a slug from the event name
    let baseSlug = generateSlug(name);

    // Check if slug already exists and make it unique if needed
    const existingEvent = await getEventBySlug(baseSlug);
    let slug = baseSlug;

    if (existingEvent) {
      // Get all events with similar slugs to ensure uniqueness
      const existingSlugs: string[] = [baseSlug];
      slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    // Create the event
    const event = await createEvent(
      name,
      slug,
      startDate,
      endDate,
      startTime,
      endTime,
      timezone
    );

    if (!event) {
      return NextResponse.json(
        { message: "Failed to create event" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Event created successfully", event },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
