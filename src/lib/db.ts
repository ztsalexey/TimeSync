import { sql } from "@vercel/postgres";
import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";

// Types
export interface Event {
  id: string;
  name: string;
  slug: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  timezone: string;
  event_id: string;
}

export interface Availability {
  id: string;
  event_id: string;
  user_id: string;
  time_slot: string;
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        timezone VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        timezone VARCHAR(100) NOT NULL,
        event_id UUID NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `;

    // Create availability table
    await sql`
      CREATE TABLE IF NOT EXISTS availability (
        id UUID PRIMARY KEY,
        event_id UUID NOT NULL,
        user_id UUID NOT NULL,
        time_slot TIMESTAMP WITH TIME ZONE NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    console.log("Database initialized successfully");
    return { success: true };
  } catch (error) {
    console.error("Error initializing database:", error);
    return { success: false, error };
  }
}

// Event functions
export async function createEvent(
  name: string,
  slug: string,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  timezone: string
): Promise<Event | null> {
  try {
    const id = uuidv4();
    const result = await sql`
      INSERT INTO events (id, name, slug, start_date, end_date, start_time, end_time, timezone)
      VALUES (${id}, ${name}, ${slug}, ${startDate}, ${endDate}, ${startTime}, ${endTime}, ${timezone})
      RETURNING *
    `;
    return result.rows[0] as Event;
  } catch (error) {
    console.error("Error creating event:", error);
    return null;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    const result = await sql`
      SELECT * FROM events WHERE slug = ${slug}
    `;
    return result.rows.length > 0 ? (result.rows[0] as Event) : null;
  } catch (error) {
    console.error("Error getting event by slug:", error);
    return null;
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  try {
    const result = await sql`
      SELECT * FROM events WHERE id = ${id}
    `;
    return result.rows.length > 0 ? (result.rows[0] as Event) : null;
  } catch (error) {
    console.error("Error getting event by ID:", error);
    return null;
  }
}

export async function deleteExpiredEvents(): Promise<number> {
  try {
    const today = DateTime.now().toISODate();
    const result = await sql`
      DELETE FROM events
      WHERE end_date < ${today}
      RETURNING id
    `;
    return result.rows.length;
  } catch (error) {
    console.error("Error deleting expired events:", error);
    return 0;
  }
}

// User functions
export async function createUser(
  name: string,
  timezone: string,
  eventId: string
): Promise<User | null> {
  try {
    const id = uuidv4();
    const result = await sql`
      INSERT INTO users (id, name, timezone, event_id)
      VALUES (${id}, ${name}, ${timezone}, ${eventId})
      RETURNING *
    `;
    return result.rows[0] as User;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function getUsersByEventId(eventId: string): Promise<User[]> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE event_id = ${eventId}
    `;
    return result.rows as User[];
  } catch (error) {
    console.error("Error getting users by event ID:", error);
    return [];
  }
}

// Availability functions
export async function saveAvailability(
  eventId: string,
  userId: string,
  timeSlots: string[]
): Promise<boolean> {
  try {
    // First, delete any existing availability for this user and event
    await sql`
      DELETE FROM availability
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `;

    // Then insert the new availability
    if (timeSlots.length > 0) {
      const values = timeSlots.map((timeSlot) => {
        return {
          id: uuidv4(),
          event_id: eventId,
          user_id: userId,
          time_slot: timeSlot,
        };
      });

      // Insert in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < values.length; i += batchSize) {
        const batch = values.slice(i, i + batchSize);

        // Insert each record individually using parametrized queries
        for (const value of batch) {
          await sql`
            INSERT INTO availability (id, event_id, user_id, time_slot)
            VALUES (${value.id}, ${value.event_id}, ${value.user_id}, ${value.time_slot})
          `;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error saving availability:", error);
    return false;
  }
}

export async function getAvailabilityByEventId(
  eventId: string
): Promise<Availability[]> {
  try {
    const result = await sql`
      SELECT * FROM availability WHERE event_id = ${eventId}
    `;
    return result.rows as Availability[];
  } catch (error) {
    console.error("Error getting availability by event ID:", error);
    return [];
  }
}

export async function getAvailabilityByUserId(
  userId: string
): Promise<Availability[]> {
  try {
    const result = await sql`
      SELECT * FROM availability WHERE user_id = ${userId}
    `;
    return result.rows as Availability[];
  } catch (error) {
    console.error("Error getting availability by user ID:", error);
    return [];
  }
}
