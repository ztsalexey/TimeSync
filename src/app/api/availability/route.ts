import { NextRequest, NextResponse } from 'next/server'
import { createUser, saveAvailability, getEventById } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/availability: Processing request')
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))

    const { name, timezone, eventId, availability } = body

    // Enhanced validation
    if (!name) {
      console.error('Missing name in request')
      return NextResponse.json({ message: 'Name is required' }, { status: 400 })
    }

    if (!timezone) {
      console.error('Missing timezone in request')
      return NextResponse.json(
        { message: 'Timezone is required' },
        { status: 400 }
      )
    }

    if (!eventId) {
      console.error('Missing eventId in request')
      return NextResponse.json(
        { message: 'Event ID is required' },
        { status: 400 }
      )
    }

    if (
      !availability ||
      !Array.isArray(availability) ||
      availability.length === 0
    ) {
      console.error('Invalid availability data:', availability)
      return NextResponse.json(
        { message: 'Valid availability selections are required' },
        { status: 400 }
      )
    }

    console.log(`Validating event ID: ${eventId}`)
    // Check if event exists
    const event = await getEventById(eventId)
    if (!event) {
      console.error(`Event with ID ${eventId} not found`)
      return NextResponse.json({ message: 'Event not found' }, { status: 404 })
    }

    console.log(`Creating user: ${name} with timezone: ${timezone}`)
    // Create user
    const user = await createUser(name, timezone, eventId)
    if (!user) {
      console.error('Failed to create user')
      return NextResponse.json(
        { message: 'Failed to create user' },
        { status: 500 }
      )
    }

    console.log(
      `Saving availability for user ${user.id}, ${availability.length} slots`
    )
    // Save availability
    const result = await saveAvailability(eventId, user.id, availability)
    if (!result) {
      console.error('Failed to save availability')
      return NextResponse.json(
        { message: 'Failed to save availability' },
        { status: 500 }
      )
    }

    console.log('Availability saved successfully')
    return NextResponse.json(
      {
        message: 'Availability saved successfully',
        userId: user.id,
        availabilityCount: availability.length,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in availability endpoint:', error)

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
