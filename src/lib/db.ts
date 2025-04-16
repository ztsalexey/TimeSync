import { sql } from '@vercel/postgres'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'

// Enhanced logging for debugging
function logError(message: string, error: any) {
  console.error(`${message}:`, error)
  console.error('Error details:', {
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    cause: error?.cause,
  })
}

// Types
export interface Event {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  timezone: string
  created_at: string
}

export interface User {
  id: string
  name: string
  timezone: string
  event_id: string
}

export interface Availability {
  id: string
  event_id: string
  user_id: string
  time_slot: string
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    console.log('Initializing database...')

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
    `
    console.log('Events table created or already exists')

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        timezone VARCHAR(100) NOT NULL,
        event_id UUID NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `
    console.log('Users table created or already exists')

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
    `
    console.log('Availability table created or already exists')

    console.log('Database initialized successfully')
    return { success: true }
  } catch (error) {
    logError('Error initializing database', error)
    return { success: false, error }
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
    console.log(
      `Creating event: ${name}, slug: ${slug}, dates: ${startDate} to ${endDate}`
    )
    const id = uuidv4()
    const result = await sql`
      INSERT INTO events (id, name, slug, start_date, end_date, start_time, end_time, timezone)
      VALUES (${id}, ${name}, ${slug}, ${startDate}, ${endDate}, ${startTime}, ${endTime}, ${timezone})
      RETURNING *
    `
    console.log('Event created:', result.rows[0])
    return result.rows[0] as Event
  } catch (error) {
    logError(`Error creating event: ${name}`, error)
    return null
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    console.log(`Getting event by slug: ${slug}`)
    const result = await sql`
      SELECT * FROM events WHERE slug = ${slug}
    `
    const found = result.rows.length > 0
    console.log(`Event found: ${found}`, found ? result.rows[0] : null)
    return found ? (result.rows[0] as Event) : null
  } catch (error) {
    logError(`Error getting event by slug: ${slug}`, error)
    return null
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  try {
    console.log(`Getting event by ID: ${id}`)
    const result = await sql`
      SELECT * FROM events WHERE id = ${id}
    `
    const found = result.rows.length > 0
    console.log(`Event found: ${found}`, found ? result.rows[0] : null)
    return found ? (result.rows[0] as Event) : null
  } catch (error) {
    logError(`Error getting event by ID: ${id}`, error)
    return null
  }
}

export async function deleteExpiredEvents(): Promise<number> {
  try {
    const today = DateTime.now().toISODate()
    console.log(`Deleting events expired before: ${today}`)
    const result = await sql`
      DELETE FROM events
      WHERE end_date < ${today}
      RETURNING id
    `
    console.log(`Deleted ${result.rows.length} expired events`)
    return result.rows.length
  } catch (error) {
    logError('Error deleting expired events', error)
    return 0
  }
}

// User functions
export async function createUser(
  name: string,
  timezone: string,
  eventId: string
): Promise<User | null> {
  try {
    console.log(
      `Creating user: ${name}, timezone: ${timezone}, eventId: ${eventId}`
    )
    const id = uuidv4()
    const result = await sql`
      INSERT INTO users (id, name, timezone, event_id)
      VALUES (${id}, ${name}, ${timezone}, ${eventId})
      RETURNING *
    `
    console.log('User created:', result.rows[0])
    return result.rows[0] as User
  } catch (error) {
    logError(`Error creating user: ${name} for event: ${eventId}`, error)
    return null
  }
}

export async function getUsersByEventId(eventId: string): Promise<User[]> {
  try {
    console.log(`Getting users for event ID: ${eventId}`)
    const result = await sql`
      SELECT * FROM users WHERE event_id = ${eventId}
    `
    console.log(`Found ${result.rows.length} users for event: ${eventId}`)
    return result.rows as User[]
  } catch (error) {
    logError(`Error getting users for event ID: ${eventId}`, error)
    return []
  }
}

// Availability functions
export async function saveAvailability(
  eventId: string,
  userId: string,
  timeSlots: string[]
): Promise<boolean> {
  try {
    console.log(
      `Saving availability for user ${userId}, event ${eventId}, ${timeSlots.length} time slots`
    )

    // First, delete any existing availability for this user and event
    await sql`
      DELETE FROM availability
      WHERE event_id = ${eventId} AND user_id = ${userId}
    `
    console.log(`Deleted existing availability for user ${userId}`)

    // Then insert the new availability
    if (timeSlots.length > 0) {
      let inserted = 0

      // Insert each time slot individually
      for (const timeSlot of timeSlots) {
        try {
          const id = uuidv4()
          await sql`
            INSERT INTO availability (id, event_id, user_id, time_slot)
            VALUES (${id}, ${eventId}, ${userId}, ${timeSlot})
          `
          inserted++
        } catch (insertError) {
          console.error(`Error inserting timeslot ${timeSlot}:`, insertError)
          // Continue with next timeslot even if this one failed
        }
      }

      console.log(
        `Successfully inserted ${inserted} of ${timeSlots.length} availability slots`
      )
    }

    return true
  } catch (error) {
    logError(
      `Error saving availability for user ${userId}, event ${eventId}`,
      error
    )
    return false
  }
}

export async function getAvailabilityByEventId(
  eventId: string
): Promise<Availability[]> {
  try {
    console.log(`Getting availability for event ID: ${eventId}`)
    const result = await sql`
      SELECT * FROM availability WHERE event_id = ${eventId}
    `
    console.log(
      `Found ${result.rows.length} availability entries for event: ${eventId}`
    )
    return result.rows as Availability[]
  } catch (error) {
    logError(`Error getting availability for event ID: ${eventId}`, error)
    return []
  }
}

export async function getAvailabilityByUserId(
  userId: string
): Promise<Availability[]> {
  try {
    console.log(`Getting availability for user ID: ${userId}`)
    const result = await sql`
      SELECT * FROM availability WHERE user_id = ${userId}
    `
    console.log(
      `Found ${result.rows.length} availability entries for user: ${userId}`
    )
    return result.rows as Availability[]
  } catch (error) {
    logError(`Error getting availability for user ID: ${userId}`, error)
    return []
  }
}
