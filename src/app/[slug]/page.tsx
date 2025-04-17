'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { DateTime } from 'luxon'

interface Event {
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

interface User {
  id: string
  name: string
  timezone: string
  event_id: string
  availability: string[]
}

interface EventData {
  event: Event
  participants: User[]
}

export default function EventPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'availability' | 'results'>('availability')

  // User input state
  const [userName, setUserName] = useState('')
  const [userTimezone, setUserTimezone] = useState(
    DateTime.now().zoneName || 'America/New_York'
  )
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState<DateTime | null>(
    null
  )
  const [isDragging, setIsDragging] = useState(false)
  const [isSelecting, setIsSelecting] = useState(true)

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const response = await fetch(`/api/events/${slug}`)
        if (!response.ok) {
          throw new Error('Event not found')
        }
        const data = await response.json()
        setEventData(data)

        // Set initial week start to event start date
        setCurrentWeekStart(DateTime.fromISO(data.event.start_date))

        // If there are participants, show results view by default
        if (data.participants && data.participants.length > 0) {
          setView('results')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchEventData()
    }
  }, [slug])

  // Generate timezone options
  const generateTimezoneOptions = () => {
    // Common time zones
    const commonTimezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Pacific/Auckland',
    ]

    return commonTimezones.map((tz) => {
      const now = DateTime.now().setZone(tz)
      const offset = now.toFormat('ZZ')
      const name = tz.replace(/_/g, ' ').replace(/\//g, ' / ')
      const display = `${name} (${offset})`

      return (
        <option key={tz} value={tz}>
          {display}
        </option>
      )
    })
  }

  // State to track if we're editing an existing user's availability
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  // Handle saving availability
  const saveAvailability = async () => {
    if (!eventData || !userName) return

    try {
      setLoading(true)

      if (editingUserId) {
        // Updating existing user's availability
        console.log(`Updating availability for user ${editingUserId}`)
        const response = await fetch(`/api/availability/${editingUserId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: eventData.event.id,
            availability: selectedTimeSlots,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update availability')
        }
      } else {
        // Creating new user
        const response = await fetch('/api/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: userName,
            timezone: userTimezone,
            eventId: eventData.event.id,
            availability: selectedTimeSlots,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save availability')
        }
      }

      // Reset editing state
      setEditingUserId(null)

      // Refresh event data
      const updatedResponse = await fetch(`/api/events/${slug}`)
      const updatedData = await updatedResponse.json()
      setEventData(updatedData)

      // Switch to results view
      setView('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Render availability grid
  const renderAvailabilityGrid = () => {
    if (!eventData || !currentWeekStart) return null

    const { event } = eventData

    // Parse event dates and times
    const startDate = DateTime.fromISO(event.start_date)
    const endDate = DateTime.fromISO(event.end_date)
    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)

    // Calculate number of days in the range
    const totalDayDiff = endDate.diff(startDate, 'days').days + 1

    // Use current week start or default to event start date
    const weekStart = currentWeekStart
    const weekEnd = DateTime.min(weekStart.plus({ days: 6 }), endDate)

    const days: DateTime[] = []

    // Generate array of dates for the current week view
    let currentDay = weekStart
    while (currentDay <= weekEnd) {
      days.push(currentDay)
      currentDay = currentDay.plus({ days: 1 })
    }

    // Create time slots in 15-minute increments
    const timeSlots: string[] = []
    let currentTime = DateTime.fromObject(
      {
        year: startDate.year,
        month: startDate.month,
        day: startDate.day,
        hour: startHour,
        minute: startMinute,
      },
      { zone: event.timezone }
    )

    const endTimeOfDay = DateTime.fromObject(
      {
        year: startDate.year,
        month: startDate.month,
        day: startDate.day,
        hour: endHour,
        minute: endMinute,
      },
      { zone: event.timezone }
    )

    // Generate time slots for a single day
    while (currentTime <= endTimeOfDay) {
      timeSlots.push(currentTime.toFormat('HH:mm'))
      currentTime = currentTime.plus({ minutes: 15 })
    }

    // Create week navigation controls if needed
    const showWeekNavigation = totalDayDiff > 7
    const isPrevWeekDisabled = weekStart <= startDate
    const isNextWeekDisabled = weekStart.plus({ days: 7 }) > endDate

    const handlePrevWeek = () => {
      if (!isPrevWeekDisabled) {
        setCurrentWeekStart(weekStart.minus({ days: 7 }))
      }
    }

    const handleNextWeek = () => {
      if (!isNextWeekDisabled) {
        setCurrentWeekStart(weekStart.plus({ days: 7 }))
      }
    }

    // Handle cell click/drag
    const handleCellMouseDown = (timeSlot: string) => {
      setIsDragging(true)

      // Determine if we're selecting or deselecting
      const isSelected = selectedTimeSlots.includes(timeSlot)
      setIsSelecting(!isSelected)

      // Toggle this cell
      toggleCellSelection(timeSlot)
    }

    const handleCellMouseEnter = (timeSlot: string) => {
      if (isDragging) {
        toggleCellSelection(timeSlot)
      }
    }

    const toggleCellSelection = (timeSlot: string) => {
      if (isSelecting) {
        if (!selectedTimeSlots.includes(timeSlot)) {
          setSelectedTimeSlots([...selectedTimeSlots, timeSlot])
        }
      } else {
        setSelectedTimeSlots(selectedTimeSlots.filter((ts) => ts !== timeSlot))
      }
    }

    return (
      <div className="grid-container">
        {showWeekNavigation && (
          <>
            <div className="week-indicator-container">
              <div className="week-indicator">
                Week{' '}
                {Math.floor(weekStart.diff(startDate, 'days').days / 7) + 1} of{' '}
                {Math.ceil(totalDayDiff / 7)}
              </div>
            </div>
            <div
              className={`prev-week-button ${
                isPrevWeekDisabled ? 'disabled' : ''
              }`}
            >
              <button
                onClick={handlePrevWeek}
                disabled={isPrevWeekDisabled}
              ></button>
            </div>
            <div
              className={`next-week-button ${
                isNextWeekDisabled ? 'disabled' : ''
              }`}
            >
              <button
                onClick={handleNextWeek}
                disabled={isNextWeekDisabled}
              ></button>
            </div>
          </>
        )}

        <table className="availability-table">
          <thead>
            <tr>
              <th className="corner-cell"></th>
              {days.map((day) => (
                <th key={day.toISO()}>
                  {day.setZone(userTimezone).toFormat('ccc M/d')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot) => {
              const [hour, minute] = timeSlot.split(':').map(Number)
              const baseTime = DateTime.fromObject(
                { hour, minute },
                { zone: userTimezone }
              )

              return (
                <tr key={timeSlot}>
                  <td className="time-label">{baseTime.toFormat('h:mm a')}</td>
                  {days.map((day) => {
                    // Create time in event's timezone
                    const time = DateTime.fromObject(
                      {
                        year: day.year,
                        month: day.month,
                        day: day.day,
                        hour,
                        minute,
                      },
                      { zone: event.timezone }
                    )

                    const timeIso = time.toISO()
                    const isSelected = timeIso
                      ? selectedTimeSlots.includes(timeIso)
                      : false

                    return (
                      <td
                        key={`${day.toISO()}-${timeSlot}`}
                        className={`grid-cell ${isSelected ? 'available' : ''}`}
                        onMouseDown={() =>
                          timeIso && handleCellMouseDown(timeIso)
                        }
                        onMouseEnter={() =>
                          timeIso && handleCellMouseEnter(timeIso)
                        }
                      ></td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Render results grid
  const renderResultsGrid = () => {
    if (!eventData || !currentWeekStart) return null

    const { event, participants } = eventData

    // Parse event dates and times
    const startDate = DateTime.fromISO(event.start_date)
    const endDate = DateTime.fromISO(event.end_date)
    const [startHour, startMinute] = event.start_time.split(':').map(Number)
    const [endHour, endMinute] = event.end_time.split(':').map(Number)

    // Calculate number of days in the range
    const totalDayDiff = endDate.diff(startDate, 'days').days + 1

    // Use current week start or default to event start date
    const weekStart = currentWeekStart
    const weekEnd = DateTime.min(weekStart.plus({ days: 6 }), endDate)

    const days: DateTime[] = []

    // Generate array of dates for the current week view
    let currentDay = weekStart
    while (currentDay <= weekEnd) {
      days.push(currentDay)
      currentDay = currentDay.plus({ days: 1 })
    }

    // Create time slots in 15-minute increments
    const timeSlots: string[] = []
    let currentTime = DateTime.fromObject(
      {
        year: startDate.year,
        month: startDate.month,
        day: startDate.day,
        hour: startHour,
        minute: startMinute,
      },
      { zone: event.timezone }
    )

    const endTimeOfDay = DateTime.fromObject(
      {
        year: startDate.year,
        month: startDate.month,
        day: startDate.day,
        hour: endHour,
        minute: endMinute,
      },
      { zone: event.timezone }
    )

    // Generate time slots for a single day
    while (currentTime <= endTimeOfDay) {
      timeSlots.push(currentTime.toFormat('HH:mm'))
      currentTime = currentTime.plus({ minutes: 15 })
    }

    // Create week navigation controls if needed
    const showWeekNavigation = totalDayDiff > 7
    const isPrevWeekDisabled = weekStart <= startDate
    const isNextWeekDisabled = weekStart.plus({ days: 7 }) > endDate

    const handlePrevWeek = () => {
      if (!isPrevWeekDisabled) {
        setCurrentWeekStart(weekStart.minus({ days: 7 }))
      }
    }

    const handleNextWeek = () => {
      if (!isNextWeekDisabled) {
        setCurrentWeekStart(weekStart.plus({ days: 7 }))
      }
    }

    return (
      <div className="grid-container">
        {showWeekNavigation && (
          <>
            <div className="week-indicator-container">
              <div className="week-indicator">
                Week{' '}
                {Math.floor(weekStart.diff(startDate, 'days').days / 7) + 1} of{' '}
                {Math.ceil(totalDayDiff / 7)}
              </div>
            </div>
            <div
              className={`prev-week-button ${
                isPrevWeekDisabled ? 'disabled' : ''
              }`}
            >
              <button
                onClick={handlePrevWeek}
                disabled={isPrevWeekDisabled}
              ></button>
            </div>
            <div
              className={`next-week-button ${
                isNextWeekDisabled ? 'disabled' : ''
              }`}
            >
              <button
                onClick={handleNextWeek}
                disabled={isNextWeekDisabled}
              ></button>
            </div>
          </>
        )}

        <table className="availability-table">
          <thead>
            <tr>
              <th className="corner-cell"></th>
              {days.map((day) => (
                <th key={day.toISO()}>
                  {day.setZone(userTimezone).toFormat('ccc M/d')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot) => {
              const [hour, minute] = timeSlot.split(':').map(Number)
              const baseTime = DateTime.fromObject(
                { hour, minute },
                { zone: userTimezone }
              )

              return (
                <tr key={timeSlot}>
                  <td className="time-label">{baseTime.toFormat('h:mm a')}</td>
                  {days.map((day) => {
                    // Create time in event's timezone
                    const time = DateTime.fromObject(
                      {
                        year: day.year,
                        month: day.month,
                        day: day.day,
                        hour,
                        minute,
                      },
                      { zone: event.timezone }
                    )

                    const timeIso = time.toISO()

                    // Count how many participants are available at this time
                    const availableCount = timeIso
                      ? participants.filter((p) =>
                          p.availability.includes(timeIso)
                        ).length
                      : 0

                    // Set color based on availability
                    let backgroundColor = 'var(--color-unavailable)'
                    let title = 'No one available'

                    if (availableCount > 0) {
                      const availabilityRatio =
                        availableCount / participants.length

                      if (availabilityRatio >= 0.8) {
                        backgroundColor = 'var(--color-high)'
                      } else if (availabilityRatio >= 0.5) {
                        backgroundColor = 'var(--color-medium)'
                      } else {
                        backgroundColor = 'var(--color-low)'
                      }

                      title = `${availableCount} of ${participants.length} available`
                    }

                    return (
                      <td
                        key={`${day.toISO()}-${timeSlot}`}
                        className="grid-cell"
                        style={{ backgroundColor }}
                        title={title}
                      ></td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Handle mouse up to stop dragging
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  if (loading) {
    return <div className="section">Loading...</div>
  }

  if (error) {
    return <div className="section">Error: {error}</div>
  }

  if (!eventData) {
    return <div className="section">Event not found</div>
  }

  const { event, participants } = eventData

  // Format dates for display with robust error handling
  let formattedStartDate = 'Invalid date'
  let formattedEndDate = 'Invalid date'
  let formattedStartTime = 'Invalid time'
  let formattedEndTime = 'Invalid time'

  try {
    const startDate = DateTime.fromISO(event.start_date)
    if (startDate.isValid) {
      formattedStartDate = startDate.toFormat('MMM d, yyyy')
    }
  } catch (e) {
    console.error('Error formatting start date:', e)
  }

  try {
    const endDate = DateTime.fromISO(event.end_date)
    if (endDate.isValid) {
      formattedEndDate = endDate.toFormat('MMM d, yyyy')
    }
  } catch (e) {
    console.error('Error formatting end date:', e)
  }

  try {
    const startTime = DateTime.fromFormat(event.start_time, 'HH:mm')
    if (startTime.isValid) {
      formattedStartTime = startTime.toFormat('h:mm a')
    }
  } catch (e) {
    console.error('Error formatting start time:', e)
  }

  try {
    const endTime = DateTime.fromFormat(event.end_time, 'HH:mm')
    if (endTime.isValid) {
      formattedEndTime = endTime.toFormat('h:mm a')
    }
  } catch (e) {
    console.error('Error formatting end time:', e)
  }

  return (
    <div className="app-container">
      <div className="section">
        <h2 className="section-title">{event.name}</h2>
        <p>
          {formattedStartDate} to {formattedEndDate}, {formattedStartTime} to{' '}
          {formattedEndTime}
        </p>

        <div className="section-header">
          <div>
            <button
              className={`pixel-button small ${
                view === 'availability' ? 'active' : ''
              }`}
              onClick={() => setView('availability')}
            >
              Add Availability
            </button>
            <button
              className={`pixel-button small ${
                view === 'results' ? 'active' : ''
              }`}
              onClick={() => {
                console.log('View Results clicked - refreshing data')
                // Refresh event data when switching to results view
                const refreshEventData = async () => {
                  try {
                    const response = await fetch(`/api/events/${slug}`)
                    if (!response.ok) {
                      throw new Error('Failed to refresh event data')
                    }
                    const data = await response.json()
                    setEventData(data)
                    console.log('Refreshed event data:', data)
                  } catch (err) {
                    console.error('Error refreshing event data:', err)
                  }
                }
                refreshEventData()
                setView('results')
              }}
            >
              View Results
            </button>
          </div>

          <div className="timezone-selector">
            <label htmlFor="user-timezone">View in:</label>
            <select
              id="user-timezone"
              value={userTimezone}
              onChange={(e) => setUserTimezone(e.target.value)}
            >
              {generateTimezoneOptions()}
            </select>
          </div>
        </div>

        {view === 'availability' ? (
          <>
            {renderAvailabilityGrid()}

            <div className="user-controls">
              <div className="form-group">
                <label htmlFor="user-name">Your Name:</label>
                <input
                  type="text"
                  id="user-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>
              <button
                className="pixel-button"
                onClick={saveAvailability}
                disabled={
                  !userName || selectedTimeSlots.length === 0 || loading
                }
              >
                {loading ? 'Saving...' : 'Save My Availability'}
              </button>
            </div>
          </>
        ) : (
          <>
            {renderResultsGrid()}

            <div className="legend">
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: 'var(--color-unavailable)' }}
                ></div>
                <span>Unavailable</span>
              </div>
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: 'var(--color-low)' }}
                ></div>
                <span>Few Available</span>
              </div>
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: 'var(--color-medium)' }}
                ></div>
                <span>Some Available</span>
              </div>
              <div className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: 'var(--color-high)' }}
                ></div>
                <span>Most Available</span>
              </div>
            </div>

            <div className="participants">
              <h3>Participants ({participants.length})</h3>
              <ul id="participant-list">
                {participants.map((participant) => (
                  <li key={participant.id}>
                    <button
                      className="participant-name"
                      onClick={() => {
                        // Load this participant's availability for editing
                        setUserName(participant.name)
                        setUserTimezone(participant.timezone)
                        setSelectedTimeSlots(participant.availability || [])
                        setEditingUserId(participant.id)
                        setView('availability')
                      }}
                    >
                      {participant.name} ({participant.timezone})
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="share-section">
              <h3>Share This Event</h3>
              <div className="share-link">
                <input
                  type="text"
                  id="share-url"
                  value={
                    typeof window !== 'undefined' ? window.location.href : ''
                  }
                  readOnly
                />
                <button
                  className="pixel-button small"
                  onClick={() => {
                    if (typeof navigator !== 'undefined') {
                      navigator.clipboard.writeText(window.location.href)
                      alert('Link copied to clipboard!')
                    }
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
