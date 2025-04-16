import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db'

export async function GET() {
  try {
    console.log('Database initialization requested')

    // Try to initialize all database tables
    const result = await initializeDatabase()

    if (result.success) {
      console.log('Database initialized successfully via API')
      return NextResponse.json(
        {
          message: 'Database initialized successfully',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    } else {
      console.error('Database initialization failed:', result.error)
      return NextResponse.json(
        {
          message: 'Failed to initialize database',
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error initializing database via API:', error)

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
