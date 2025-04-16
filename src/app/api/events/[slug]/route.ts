import { NextRequest, NextResponse } from 'next/server'
import {
  getEventBySlug,
  getUsersByEventId,
  getAvailabilityByEventId,
} from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    console.log(
      `GET /api/events/[slug]: Processing request for slug: ${params.slug}`
    )

    const { slug } = params

    if (!slug) {
      console.error('Missing slug parameter')
      return NextResponse.json(
        { message: 'Event slug is required' },
        { status: 400 }
      )
    }

    // Get event data
    console.log(`Fetching event with slug: ${slug}`)
    const event = await getEventBySlug(slug)

    if (!event) {
      console.error(`Event with slug ${slug} not found`)
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    console.log(`Event found: ${event.name} (ID: ${event.id})`)

    // Get users for this event
    console.log(`Fetching users for event ID: ${event.id}`)
    const users = await getUsersByEventId(event.id)
    console.log(`Found ${users.length} users for this event`)

    // Get availability data for this event
    console.log(`Fetching availability for event ID: ${event.id}`)
    const availability = await getAvailabilityByEventId(event.id)
    console.log(`Found ${availability.length} availability entries`)

    // Group availability by user
    console.log('Processing availability data by user')
    const availabilityByUser = users.map((user) => {
      const userAvailability = availability.filter((a) => a.user_id === user.id)

      console.log(
        `User ${user.name} has ${userAvailability.length} availability slots`
      )

      return {
        ...user,
        availability: userAvailability.map((a) => a.time_slot),
      }
    })

    const response = {
      event,
      participants: availabilityByUser,
    }

    console.log(
      `Returning response with ${availabilityByUser.length} participants`
    )
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error in event slug endpoint:', error)

    // More detailed error response
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
