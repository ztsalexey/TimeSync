# TimeSync - Cross-Timezone Availability Scheduler

TimeSync is a web application that helps teams schedule meetings across different time zones. It allows users to create events, share them with others, and find the best time for everyone to meet.

## Features

- Create events with custom names and date/time ranges
- Share events with a custom URL (e.g., yourdomain.com/event-name)
- Select availability by clicking and dragging on a time grid
- View availability across different time zones
- See aggregated results showing when most people are available
- Automatic cleanup of expired events
- Retro pixel art design

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Vercel Postgres
- **Styling**: Custom CSS with retro pixel art design
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Vercel account (for Postgres database)

### Setup

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/timesync.git
   cd timesync
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env.local` file with your Vercel Postgres credentials:

   ```
   POSTGRES_URL="postgres://..."
   POSTGRES_PRISMA_URL="postgres://..."
   POSTGRES_URL_NON_POOLING="postgres://..."
   POSTGRES_USER="default"
   POSTGRES_HOST="..."
   POSTGRES_PASSWORD="..."
   POSTGRES_DATABASE="verceldb"
   ```

4. Start the development server:

   ```
   npm run dev
   ```

5. Initialize the database:

   ```
   curl http://localhost:3000/api/init
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

1. Push your code to a GitHub repository.

2. Connect your repository to Vercel.

3. Add the Postgres database integration in the Vercel dashboard.

4. Deploy the application.

5. After deployment, initialize the database by visiting:
   ```
   https://your-domain.com/api/init
   ```

### Environment Variables

Make sure to set the following environment variables in your Vercel project:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Usage

1. **Create an Event**:

   - Go to the home page
   - Enter event details (name, date range, time range)
   - Select your time zone
   - Click "Create Event"

2. **Share the Event**:

   - Copy the URL from the share section
   - Send it to participants

3. **Add Availability**:

   - Click and drag on the time grid to select available times
   - Enter your name
   - Click "Save My Availability"

4. **View Results**:
   - Click "View Results" to see when everyone is available
   - Use the time zone dropdown to view in different time zones

## Features

### Automatic Event Cleanup

Events are automatically deleted after their end date has passed, keeping the database clean.

### Cross-Timezone Support

The application handles different time zones, allowing participants from around the world to coordinate effectively.

### Responsive Design

The interface adapts to different screen sizes, making it usable on both desktop and mobile devices.

## License

MIT
