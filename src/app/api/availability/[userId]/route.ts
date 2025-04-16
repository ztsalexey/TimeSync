import { NextRequest, NextResponse } from 'next/server'
import { saveAvailability, getAvailabilityByUserId } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log(
      `PUT /api/availability/[userId]: Processing request for userId: ${params.userId}`
    )
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))

    const { eventId, availability } = body
    const userId = params.userId

    // Enhanced validation
    if (!userId) {
      console.error('Missing userId in request')
      return NextResponse.json(
        { message: 'User ID is required' },
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

    console.log(
      `Updating availability for user ${userId}, ${availability.length} slots`
    )

    // Save availability
    const result = await saveAvailability(eventId, userId, availability)
    if (!result) {
      console.error('Failed to save availability')
      return NextResponse.json(
        { message: 'Failed to save availability' },
        { status: 500 }
      )
    }

    // Get updated availability
    const updatedAvailability = await getAvailabilityByUserId(userId)

    console.log('Availability updated successfully')
    return NextResponse.json(
      {
        message: 'Availability updated successfully',
        userId,
        availabilityCount: availability.length,
        availability: updatedAvailability,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in availability update endpoint:', error)

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
