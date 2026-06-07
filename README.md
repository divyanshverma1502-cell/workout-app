# Lift Log

A personal, local-first workout tracker built with Next.js, TypeScript, Tailwind CSS, Zustand, Recharts, and browser IndexedDB.

## Features

- No accounts, login, signup, cloud sync, or server-side workout storage
- IndexedDB storage for workouts, custom exercises, favorites, templates, and bodyweight entries
- Mobile-first dark UI with large gym-friendly controls
- Workout logging with exercise notes, set types, assisted reps, negatives, and partial reps
- Previous-workout duplication and reusable workout templates
- Standalone bodyweight weigh-ins plus workout-linked bodyweight logging
- Progressive overload comparison against prior sessions
- Dashboard cards, PR tracking, strength trends, weekly volume, consistency, and bodyweight charts
- Bodyweight exercise progression for push-ups, pull-ups, planks, and dips
- Estimated 1RM calculator, streak tracking, muscle group frequency, CSV export, and JSON backup/restore
- PWA manifest and service worker for Android install, home-screen launch, and offline local logging

## Requirements

- Node.js `22.13.0` or newer
- npm

No database server or environment variables are required.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev        # start the development server
npm run build      # create a production build
npm run start      # run the production build
npm run typecheck  # run TypeScript checks
```

## Architecture

- `src/lib/local-db.ts` is the primary persistence layer and stores gym data in IndexedDB.
- `src/store/workout-store.ts` keeps only the active gym-session draft in browser storage.
- `src/components/*` contains reusable UI, charts, dashboard, workout logger, analytics, and exercise library views.
- `public/manifest.json`, `public/manifest.webmanifest`, `public/sw.js`, and `public/icons/*` provide Android PWA installation and offline app-shell caching.

## Vercel Deployment

1. Push the repository to GitHub.
2. In Vercel, choose **Add New Project** and import the repository.
3. Keep the framework preset as **Next.js**.
4. Use the default install command, `npm install`.
5. Use the build command, `npm run build`.
6. Leave environment variables empty.
7. Deploy.

After deployment, open the HTTPS Vercel URL in Chrome on Android and choose **Install app** or **Add to Home screen**.

## Seed Exercises

The browser database preloads Bench Press, Incline Press, Lat Pulldown, Pull-up, Leg Press, Romanian Deadlift, Overhead Press, Rows, Push-ups, Squats, Planks, Dips, and Treadmill Run.
