// Global state
const state = {
  event: null,
  participants: [],
  currentUser: {
    name: "",
    timezone: "",
    availability: [],
  },
  currentWeekStart: null,
  isDragging: false,
  isSelecting: true, // true = selecting, false = deselecting
};

// DOM Elements
const elements = {
  // Event Creation
  eventCreation: document.getElementById("event-creation"),
  createEventForm: document.getElementById("create-event-form"),
  eventName: document.getElementById("event-name"),
  startDate: document.getElementById("start-date"),
  endDate: document.getElementById("end-date"),
  startTime: document.getElementById("start-time"),
  endTime: document.getElementById("end-time"),
  timezone: document.getElementById("timezone"),

  // Availability Selection
  availabilitySelection: document.getElementById("availability-selection"),
  eventTitle: document.getElementById("event-title"),
  userTimezone: document.getElementById("user-timezone"),
  availabilityGrid: document.getElementById("availability-grid"),
  userName: document.getElementById("user-name"),
  saveAvailability: document.getElementById("save-availability"),

  // Results View
  resultsView: document.getElementById("results-view"),
  resultsTimezone: document.getElementById("results-timezone"),
  resultsGrid: document.getElementById("results-grid"),
  participantList: document.getElementById("participant-list"),
  shareUrl: document.getElementById("share-url"),
  copyLink: document.getElementById("copy-link"),
};

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  createLogo();
  initializeTimezones();
  initializeTimeOptions();
  setupEventListeners();

  // Check if there's an event ID in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("event");

  if (eventId) {
    loadEvent(eventId);
  }
});

// Create pixel art logo
function createLogo() {
  const logoImg = document.getElementById("logo-img");
  if (!logoImg) return;

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  // Transparent background
  ctx.clearRect(0, 0, 32, 32);

  // Draw "2BB" in pixel art
  ctx.fillStyle = "#ffcc00";

  // Draw "2"
  ctx.fillRect(4, 4, 8, 2);
  ctx.fillRect(10, 6, 2, 4);
  ctx.fillRect(4, 10, 8, 2);
  ctx.fillRect(4, 12, 2, 4);
  ctx.fillRect(4, 16, 8, 2);

  // Draw "B"
  ctx.fillRect(14, 4, 2, 14);
  ctx.fillRect(16, 4, 4, 2);
  ctx.fillRect(20, 6, 2, 2);
  ctx.fillRect(16, 10, 4, 2);
  ctx.fillRect(20, 12, 2, 2);
  ctx.fillRect(16, 16, 4, 2);

  // Draw "B"
  ctx.fillRect(24, 4, 2, 14);
  ctx.fillRect(26, 4, 4, 2);
  ctx.fillRect(30, 6, 2, 2);
  ctx.fillRect(26, 10, 4, 2);
  ctx.fillRect(30, 12, 2, 2);
  ctx.fillRect(26, 16, 4, 2);

  // Set the logo image source
  logoImg.src = canvas.toDataURL();
}

// Initialize time zone dropdowns
function initializeTimezones() {
  const timezones = luxon.DateTime.now().zoneName
    ? [luxon.DateTime.now().zoneName]
    : [];

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

  // Add common time zones if not already included
  commonTimezones.forEach((tz) => {
    if (!timezones.includes(tz)) {
      timezones.push(tz);
    }
  });

  // Sort alphabetically
  timezones.sort();

  // Populate dropdowns
  const dropdowns = [
    elements.timezone,
    elements.userTimezone,
    elements.resultsTimezone,
  ];

  dropdowns.forEach((dropdown) => {
    if (!dropdown) return;

    timezones.forEach((tz) => {
      const option = document.createElement("option");
      option.value = tz;
      option.textContent = formatTimezone(tz);
      dropdown.appendChild(option);
    });
  });
}

// Format time zone for display
function formatTimezone(tz) {
  try {
    const now = luxon.DateTime.now().setZone(tz);
    const offset = now.toFormat("ZZ");
    const name = tz.replace(/_/g, " ").replace(/\//g, " / ");
    return `${name} (${offset})`;
  } catch (e) {
    return tz;
  }
}

// Initialize time selection dropdowns
function initializeTimeOptions() {
  // Generate time options in 15-minute increments
  for (let hour = 0; hour < 24; hour++) {
    for (let minute of [0, 15, 30, 45]) {
      const time = luxon.DateTime.local(2023, 1, 1, hour, minute);
      const timeString = time.toFormat("HH:mm");
      const displayTime = time.toFormat("h:mm a");

      const startOption = document.createElement("option");
      startOption.value = timeString;
      startOption.textContent = displayTime;
      elements.startTime.appendChild(startOption);

      const endOption = document.createElement("option");
      endOption.value = timeString;
      endOption.textContent = displayTime;
      elements.endTime.appendChild(endOption);
    }
  }

  // Set default values (9 AM to 5 PM)
  elements.startTime.value = "09:00";
  elements.endTime.value = "17:00";
}

// Set up event listeners
function setupEventListeners() {
  // Create event form submission
  elements.createEventForm.addEventListener("submit", (e) => {
    e.preventDefault();
    createEvent();
  });

  // Save availability button
  if (elements.saveAvailability) {
    elements.saveAvailability.addEventListener("click", saveUserAvailability);
  }

  // Time zone change in availability view
  if (elements.userTimezone) {
    elements.userTimezone.addEventListener("change", () => {
      state.currentUser.timezone = elements.userTimezone.value;
      renderAvailabilityGrid();
    });
  }

  // Time zone change in results view
  if (elements.resultsTimezone) {
    elements.resultsTimezone.addEventListener("change", renderResultsGrid);
  }

  // Copy link button
  if (elements.copyLink) {
    elements.copyLink.addEventListener("click", () => {
      elements.shareUrl.select();
      document.execCommand("copy");
      elements.copyLink.textContent = "Copied!";
      setTimeout(() => {
        elements.copyLink.textContent = "Copy";
      }, 2000);
    });
  }
}

// Create a new event
function createEvent() {
  const eventName = elements.eventName.value;
  const startDate = elements.startDate.value;
  const endDate = elements.endDate.value;
  const startTime = elements.startTime.value;
  const endTime = elements.endTime.value;
  const timezone = elements.timezone.value;

  // Validate dates
  const start = luxon.DateTime.fromISO(startDate);
  const end = luxon.DateTime.fromISO(endDate);

  if (end < start) {
    alert("End date must be after start date");
    return;
  }

  // Generate a unique ID for the event
  const eventId = generateId();

  // Create event object
  state.event = {
    id: eventId,
    name: eventName,
    startDate,
    endDate,
    startTime,
    endTime,
    timezone,
  };

  // Set current user's time zone
  state.currentUser.timezone = timezone;

  // Save event to localStorage
  saveEvent();

  // Update URL with event ID
  window.history.pushState({}, "", `?event=${eventId}`);

  // Show availability selection view
  showAvailabilitySelection();
}

// Generate a random ID
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Save event to localStorage
function saveEvent() {
  localStorage.setItem(`event_${state.event.id}`, JSON.stringify(state.event));
  localStorage.setItem(
    `participants_${state.event.id}`,
    JSON.stringify(state.participants)
  );
}

// Load event from localStorage
function loadEvent(eventId) {
  const eventData = localStorage.getItem(`event_${eventId}`);
  const participantsData = localStorage.getItem(`participants_${eventId}`);

  if (eventData) {
    state.event = JSON.parse(eventData);

    if (participantsData) {
      state.participants = JSON.parse(participantsData);
    }

    // Set current user's time zone to browser's time zone
    state.currentUser.timezone = luxon.DateTime.now().zoneName;

    // Update time zone dropdowns
    if (elements.userTimezone) {
      elements.userTimezone.value = state.currentUser.timezone;
    }

    if (elements.resultsTimezone) {
      elements.resultsTimezone.value = state.currentUser.timezone;
    }

    // Show appropriate view
    if (state.participants.length > 0) {
      showResultsView();
    } else {
      showAvailabilitySelection();
    }
  }
}

// Show availability selection view
function showAvailabilitySelection() {
  elements.eventCreation.classList.add("hidden");
  elements.availabilitySelection.classList.remove("hidden");
  elements.resultsView.classList.add("hidden");

  // Update event title
  elements.eventTitle.textContent = state.event.name;

  // Set current week to the start date
  state.currentWeekStart = luxon.DateTime.fromISO(state.event.startDate);

  // Render availability grid
  renderAvailabilityGrid();

  // Set share URL
  elements.shareUrl.value = window.location.href;
}

// Show results view
function showResultsView() {
  elements.eventCreation.classList.add("hidden");
  elements.availabilitySelection.classList.add("hidden");
  elements.resultsView.classList.remove("hidden");

  // Render results grid
  renderResultsGrid();

  // Render participant list
  renderParticipantList();

  // Set share URL
  elements.shareUrl.value = window.location.href;
}

// Render availability grid
function renderAvailabilityGrid() {
  // Save current selections before clearing the grid
  const currentSelections = [];
  const selectedCells = elements.availabilityGrid.querySelectorAll(
    ".grid-cell.available"
  );
  selectedCells.forEach((cell) => {
    currentSelections.push(cell.dataset.time);
  });

  // Update user's availability with current selections
  if (currentSelections.length > 0) {
    state.currentUser.availability = [
      ...new Set([...state.currentUser.availability, ...currentSelections]),
    ];
  }

  // Clear existing grid
  elements.availabilityGrid.innerHTML = "";

  if (!state.event) return;

  // Parse event dates and times
  const startDate = state.event.startDate;
  const endDate = state.event.endDate;
  const [startHour, startMinute] = state.event.startTime.split(":").map(Number);
  const [endHour, endMinute] = state.event.endTime.split(":").map(Number);

  // Calculate number of days in the range
  const start = luxon.DateTime.fromISO(startDate);
  const end = luxon.DateTime.fromISO(endDate);
  const totalDayDiff = end.diff(start, "days").days + 1;

  // Create week navigation if needed
  if (totalDayDiff > 7) {
    createWeekNavigation(start, end);
  }

  // Use current week start or default to event start date
  const weekStart = state.currentWeekStart || start;
  const weekEnd = luxon.DateTime.min(weekStart.plus({ days: 6 }), end);

  const days = [];

  // Generate array of dates for the current week view
  let currentDay = weekStart;
  while (currentDay <= weekEnd) {
    days.push(currentDay);
    currentDay = currentDay.plus({ days: 1 });
  }

  // Create time slots in 15-minute increments
  const timeSlots = [];
  let currentTime = luxon.DateTime.fromObject(
    {
      year: start.year,
      month: start.month,
      day: start.day,
      hour: startHour,
      minute: startMinute,
    },
    { zone: state.event.timezone }
  );

  const endTimeOfDay = luxon.DateTime.fromObject(
    {
      year: start.year,
      month: start.month,
      day: start.day,
      hour: endHour,
      minute: endMinute,
    },
    { zone: state.event.timezone }
  );

  // Generate time slots for a single day
  while (currentTime <= endTimeOfDay) {
    timeSlots.push(currentTime.toFormat("HH:mm"));
    currentTime = currentTime.plus({ minutes: 15 });
  }

  // Create a table for the grid
  const table = document.createElement("table");
  table.className = "availability-table";
  elements.availabilityGrid.appendChild(table);

  // Create header row with days
  const thead = document.createElement("thead");
  table.appendChild(thead);

  const headerRow = document.createElement("tr");
  thead.appendChild(headerRow);

  // Add empty cell for top-left corner
  const cornerCell = document.createElement("th");
  cornerCell.className = "corner-cell";
  headerRow.appendChild(cornerCell);

  // Add day headers
  days.forEach((day) => {
    const dayHeader = document.createElement("th");
    dayHeader.className = "day-header";
    dayHeader.textContent = day
      .setZone(state.currentUser.timezone)
      .toFormat("ccc M/d");
    headerRow.appendChild(dayHeader);
  });

  // Create table body
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // Create rows for each time slot
  timeSlots.forEach((timeSlot) => {
    const row = document.createElement("tr");
    tbody.appendChild(row);

    // Add time label
    const [hour, minute] = timeSlot.split(":").map(Number);
    const baseTime = luxon.DateTime.fromObject(
      { hour, minute },
      { zone: state.currentUser.timezone }
    );

    const timeLabel = document.createElement("td");
    timeLabel.className = "time-label";
    timeLabel.textContent = baseTime.toFormat("h:mm a");
    row.appendChild(timeLabel);

    // Add cells for each day
    days.forEach((day) => {
      // Create time in event's timezone
      const time = luxon.DateTime.fromObject(
        {
          year: day.year,
          month: day.month,
          day: day.day,
          hour,
          minute,
        },
        { zone: state.event.timezone }
      );

      // Create grid cell
      const cell = document.createElement("td");
      cell.className = "grid-cell";
      cell.dataset.time = time.toISO();

      // Check if this time is in the user's availability
      if (state.currentUser.availability.includes(time.toISO())) {
        cell.classList.add("available");
      }

      // Add mouse events for drag selection
      cell.addEventListener("mousedown", (e) => {
        // Prevent text selection during drag
        e.preventDefault();

        // Start dragging
        state.isDragging = true;

        // Determine if we're selecting or deselecting
        state.isSelecting = !cell.classList.contains("available");

        // Toggle this cell
        toggleCellAvailability(cell);
      });

      cell.addEventListener("mouseenter", () => {
        if (state.isDragging) {
          toggleCellAvailability(cell);
        }
      });

      row.appendChild(cell);
    });
  });

  // Add mouseup event to stop dragging
  document.addEventListener("mouseup", () => {
    state.isDragging = false;
  });

  // Add mouseleave event to stop dragging if mouse leaves the grid
  table.addEventListener("mouseleave", () => {
    state.isDragging = false;
  });
}

// Toggle cell availability based on current selection mode
function toggleCellAvailability(cell) {
  if (state.isSelecting) {
    cell.classList.add("available");
  } else {
    cell.classList.remove("available");
  }
}

// Create week navigation controls
function createWeekNavigation(startDate, endDate) {
  // Remove any existing navigation
  const existingPrevButton = document.querySelector(".prev-week-button");
  const existingNextButton = document.querySelector(".next-week-button");
  const existingIndicator = document.querySelector(".week-indicator-container");

  if (existingPrevButton) existingPrevButton.remove();
  if (existingNextButton) existingNextButton.remove();
  if (existingIndicator) existingIndicator.remove();

  // Create week indicator at the top
  const indicatorContainer = document.createElement("div");
  indicatorContainer.className = "week-indicator-container";

  const weekIndicator = document.createElement("div");
  weekIndicator.className = "week-indicator";
  updateWeekIndicator(weekIndicator, startDate, endDate);

  indicatorContainer.appendChild(weekIndicator);
  elements.availabilityGrid.parentNode.insertBefore(
    indicatorContainer,
    elements.availabilityGrid
  );

  // Create previous week button on the left
  const prevButtonContainer = document.createElement("div");
  prevButtonContainer.className = "prev-week-button";

  // Check if we're at the first week
  if (state.currentWeekStart <= startDate) {
    prevButtonContainer.classList.add("disabled");
  }

  const prevButton = document.createElement("button");
  prevButton.addEventListener("click", () => {
    if (state.currentWeekStart > startDate) {
      state.currentWeekStart = state.currentWeekStart.minus({ days: 7 });
      renderAvailabilityGrid();
    }
  });

  prevButtonContainer.appendChild(prevButton);
  elements.availabilityGrid.parentNode.appendChild(prevButtonContainer);

  // Create next week button on the right
  const nextButtonContainer = document.createElement("div");
  nextButtonContainer.className = "next-week-button";

  // Check if we're at the last week
  const nextWeekStart = state.currentWeekStart.plus({ days: 7 });
  if (nextWeekStart > endDate) {
    nextButtonContainer.classList.add("disabled");
  }

  const nextButton = document.createElement("button");
  nextButton.addEventListener("click", () => {
    const nextWeekStart = state.currentWeekStart.plus({ days: 7 });
    if (nextWeekStart <= endDate) {
      state.currentWeekStart = nextWeekStart;
      renderAvailabilityGrid();
    }
  });

  nextButtonContainer.appendChild(nextButton);
  elements.availabilityGrid.parentNode.appendChild(nextButtonContainer);
}

// Update week indicator text
function updateWeekIndicator(element, startDate, endDate) {
  const currentStart = state.currentWeekStart;
  const currentEnd = luxon.DateTime.min(
    currentStart.plus({ days: 6 }),
    endDate
  );

  const totalWeeks = Math.ceil(endDate.diff(startDate, "days").days / 7);
  const currentWeek =
    Math.floor(currentStart.diff(startDate, "days").days / 7) + 1;

  element.textContent = `Week ${currentWeek} of ${totalWeeks}`;
}

// Save user availability
function saveUserAvailability() {
  const userName = elements.userName.value;

  if (!userName) {
    alert("Please enter your name");
    return;
  }

  // Get selected time slots
  const selectedCells = elements.availabilityGrid.querySelectorAll(
    ".grid-cell.available"
  );
  const availability = Array.from(selectedCells).map(
    (cell) => cell.dataset.time
  );

  // Update current user
  state.currentUser.name = userName;
  state.currentUser.availability = availability;

  // Add to participants
  state.participants.push({
    name: userName,
    timezone: state.currentUser.timezone,
    availability,
  });

  // Save to localStorage
  saveEvent();

  // Show results view
  showResultsView();
}

// Render results grid
function renderResultsGrid() {
  // Clear existing grid
  elements.resultsGrid.innerHTML = "";

  if (!state.event || state.participants.length === 0) return;

  // Parse event dates and times
  const startDate = state.event.startDate;
  const endDate = state.event.endDate;
  const [startHour, startMinute] = state.event.startTime.split(":").map(Number);
  const [endHour, endMinute] = state.event.endTime.split(":").map(Number);

  // Calculate number of days in the range
  const start = luxon.DateTime.fromISO(startDate);
  const end = luxon.DateTime.fromISO(endDate);
  const totalDayDiff = end.diff(start, "days").days + 1;

  // Create week navigation if needed
  if (totalDayDiff > 7) {
    createResultsWeekNavigation(start, end);
  }

  // Use current week start or default to event start date
  const weekStart = state.currentWeekStart || start;
  const weekEnd = luxon.DateTime.min(weekStart.plus({ days: 6 }), end);

  const days = [];

  // Generate array of dates for the current week view
  let currentDay = weekStart;
  while (currentDay <= weekEnd) {
    days.push(currentDay);
    currentDay = currentDay.plus({ days: 1 });
  }

  // Create time slots in 15-minute increments
  const timeSlots = [];
  let currentTime = luxon.DateTime.fromObject(
    {
      year: start.year,
      month: start.month,
      day: start.day,
      hour: startHour,
      minute: startMinute,
    },
    { zone: state.event.timezone }
  );

  const endTimeOfDay = luxon.DateTime.fromObject(
    {
      year: start.year,
      month: start.month,
      day: start.day,
      hour: endHour,
      minute: endMinute,
    },
    { zone: state.event.timezone }
  );

  // Generate time slots for a single day
  while (currentTime <= endTimeOfDay) {
    timeSlots.push(currentTime.toFormat("HH:mm"));
    currentTime = currentTime.plus({ minutes: 15 });
  }

  // Get selected time zone for results view
  const resultsTimezone = elements.resultsTimezone.value;

  // Create a table for the grid
  const table = document.createElement("table");
  table.className = "availability-table";
  elements.resultsGrid.appendChild(table);

  // Create header row with days
  const thead = document.createElement("thead");
  table.appendChild(thead);

  const headerRow = document.createElement("tr");
  thead.appendChild(headerRow);

  // Add empty cell for top-left corner
  const cornerCell = document.createElement("th");
  cornerCell.className = "corner-cell";
  headerRow.appendChild(cornerCell);

  // Add day headers
  days.forEach((day) => {
    const dayHeader = document.createElement("th");
    dayHeader.className = "day-header";
    dayHeader.textContent = day.setZone(resultsTimezone).toFormat("ccc M/d");
    headerRow.appendChild(dayHeader);
  });

  // Create table body
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // Create rows for each time slot
  timeSlots.forEach((timeSlot) => {
    const row = document.createElement("tr");
    tbody.appendChild(row);

    // Add time label
    const [hour, minute] = timeSlot.split(":").map(Number);
    const baseTime = luxon.DateTime.fromObject(
      { hour, minute },
      { zone: resultsTimezone }
    );

    const timeLabel = document.createElement("td");
    timeLabel.className = "time-label";
    timeLabel.textContent = baseTime.toFormat("h:mm a");
    row.appendChild(timeLabel);

    // Add cells for each day
    days.forEach((day) => {
      // Create time in event's timezone
      const time = luxon.DateTime.fromObject(
        {
          year: day.year,
          month: day.month,
          day: day.day,
          hour,
          minute,
        },
        { zone: state.event.timezone }
      );

      // Create grid cell
      const cell = document.createElement("td");
      cell.className = "grid-cell";

      // Count how many participants are available at this time
      const availableCount = state.participants.filter((participant) =>
        participant.availability.includes(time.toISO())
      ).length;

      // Set color based on availability
      if (availableCount > 0) {
        const availabilityRatio = availableCount / state.participants.length;

        if (availabilityRatio >= 0.8) {
          cell.style.backgroundColor = "var(--color-high)";
        } else if (availabilityRatio >= 0.5) {
          cell.style.backgroundColor = "var(--color-medium)";
        } else {
          cell.style.backgroundColor = "var(--color-low)";
        }

        // Add tooltip with count
        cell.title = `${availableCount} of ${state.participants.length} available`;
      }

      row.appendChild(cell);
    });
  });
}

// Create week navigation controls for results view
function createResultsWeekNavigation(startDate, endDate) {
  // Remove any existing navigation
  const existingPrevButton = document.querySelector(".prev-week-button");
  const existingNextButton = document.querySelector(".next-week-button");
  const existingIndicator = document.querySelector(".week-indicator-container");

  if (existingPrevButton) existingPrevButton.remove();
  if (existingNextButton) existingNextButton.remove();
  if (existingIndicator) existingIndicator.remove();

  // Create week indicator at the top
  const indicatorContainer = document.createElement("div");
  indicatorContainer.className = "week-indicator-container";

  const weekIndicator = document.createElement("div");
  weekIndicator.className = "week-indicator";
  updateWeekIndicator(weekIndicator, startDate, endDate);

  indicatorContainer.appendChild(weekIndicator);
  elements.resultsGrid.parentNode.insertBefore(
    indicatorContainer,
    elements.resultsGrid
  );

  // Create previous week button on the left
  const prevButtonContainer = document.createElement("div");
  prevButtonContainer.className = "prev-week-button";

  // Check if we're at the first week
  if (state.currentWeekStart <= startDate) {
    prevButtonContainer.classList.add("disabled");
  }

  const prevButton = document.createElement("button");
  prevButton.addEventListener("click", () => {
    if (state.currentWeekStart > startDate) {
      state.currentWeekStart = state.currentWeekStart.minus({ days: 7 });
      renderResultsGrid();
    }
  });

  prevButtonContainer.appendChild(prevButton);
  elements.resultsGrid.parentNode.appendChild(prevButtonContainer);

  // Create next week button on the right
  const nextButtonContainer = document.createElement("div");
  nextButtonContainer.className = "next-week-button";

  // Check if we're at the last week
  const nextWeekStart = state.currentWeekStart.plus({ days: 7 });
  if (nextWeekStart > endDate) {
    nextButtonContainer.classList.add("disabled");
  }

  const nextButton = document.createElement("button");
  nextButton.addEventListener("click", () => {
    const nextWeekStart = state.currentWeekStart.plus({ days: 7 });
    if (nextWeekStart <= endDate) {
      state.currentWeekStart = nextWeekStart;
      renderResultsGrid();
    }
  });

  nextButtonContainer.appendChild(nextButton);
  elements.resultsGrid.parentNode.appendChild(nextButtonContainer);
}

// Render participant list
function renderParticipantList() {
  elements.participantList.innerHTML = "";

  state.participants.forEach((participant) => {
    const listItem = document.createElement("li");
    listItem.textContent = `${participant.name} (${formatTimezone(
      participant.timezone
    )})`;
    elements.participantList.appendChild(listItem);
  });
}
