import { NextRequest, NextResponse } from "next/server";
import {
  getEventBySlug,
  getUsersByEventId,
  getAvailabilityByEventId,
} from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { message: "Event slug is required" },
        { status: 400 }
      );
    }

    // Get event data
    const event = await getEventBySlug(slug);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Get users for this event
    const users = await getUsersByEventId(event.id);

    // Get availability data for this event
    const availability = await getAvailabilityByEventId(event.id);

    // Group availability by user
    const availabilityByUser = users.map((user) => {
      const userAvailability = availability.filter(
        (a) => a.user_id === user.id
      );
      return {
        ...user,
        availability: userAvailability.map((a) => a.time_slot),
      };
    });

    return NextResponse.json(
      {
        event,
        participants: availabilityByUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting event:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
