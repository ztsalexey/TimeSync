import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TimeSync - Cross-Timezone Availability Scheduler",
  description: "Schedule meetings across different time zones with ease",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="container">
          <header>
            <div className="logo">
              <h1 className="regular-title">TimeSync</h1>
            </div>
            <p className="subtitle">We be schedulin&apos;</p>
          </header>
          <main>{children}</main>
          <footer>
            <p>
              Made with ❤️ by <span className="yellow-text">2bb</span>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
