"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState(
    DateTime.now().zoneName || "America/New_York"
  );

  // Generate time options for dropdowns
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 15, 30, 45]) {
        const time = DateTime.fromObject({ hour, minute });
        const timeString = time.toFormat("HH:mm");
        const displayTime = time.toFormat("h:mm a");
        options.push(
          <option key={timeString} value={timeString}>
            {displayTime}
          </option>
        );
      }
    }
    return options;
  };

  // Generate timezone options
  const generateTimezoneOptions = () => {
    // Common time zones
    const commonTimezones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Tokyo",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];

    return commonTimezones.map((tz) => {
      const now = DateTime.now().setZone(tz);
      const offset = now.toFormat("ZZ");
      const name = tz.replace(/_/g, " ").replace(/\//g, " / ");
      const display = `${name} (${offset})`;

      return (
        <option key={tz} value={tz}>
          {display}
        </option>
      );
    });
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate dates
      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);

      if (end < start) {
        throw new Error("End date must be after start date");
      }

      // Create event via API
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: eventName,
          startDate,
          endDate,
          startTime,
          endTime,
          timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create event");
      }

      // Redirect to the event page
      router.push(`/${data.event.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="section">
        <h2 className="section-title">Create New Event</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="event-name">Event Name:</label>
            <input
              type="text"
              id="event-name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </div>

          <div className="form-group date-range">
            <label>Date Range:</label>
            <div className="date-inputs">
              <div className="date-input">
                <label htmlFor="start-date">From:</label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="date-input">
                <label htmlFor="end-date">To:</label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group time-range">
            <label>Time Range:</label>
            <div className="time-inputs">
              <select
                id="start-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {generateTimeOptions()}
              </select>
              <span>to</span>
              <select
                id="end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {generateTimeOptions()}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Your Time Zone:</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            >
              {generateTimezoneOptions()}
            </select>
          </div>

          <button type="submit" className="pixel-button" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}
