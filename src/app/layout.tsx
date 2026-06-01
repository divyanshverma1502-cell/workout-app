import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lift Log | Personal Workout Tracker",
  description: "Track workouts, bodyweight progressions, progressive overload, and long-term strength trends.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#080b0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
