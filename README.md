# Lift Log

A personal workout tracker built with Next.js, TypeScript, Tailwind CSS, Zustand, Recharts, and a local SQLite database powered by Node's built-in `node:sqlite` module.

## Features

- Email/password signup and login with HTTP-only cookie sessions
- Local SQLite storage for users, sessions, workouts, sets, templates, favorites, and bodyweight entries
- Mobile-first dark UI with large gym-friendly controls
- Workout logging with exercise notes, set types, assisted reps, negatives, and partial reps
- Previous-workout duplication and reusable workout templates
- Progressive overload comparison against prior sessions
- Dashboard cards, PR tracking, strength trends, weekly volume, consistency, and bodyweight charts
- Bodyweight exercise progression for push-ups, pull-ups, planks, and dips
- Estimated 1RM calculator, streak tracking, muscle group frequency, and CSV export
- PWA manifest and service worker for Android install, home-screen launch, and local offline logging

## Requirements

- Node.js `22.13.0` or newer
- npm

This app uses `node:sqlite`, so older Node versions will not run the API routes.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created automatically at `data/workout.sqlite`. To store it elsewhere:

```bash
WORKOUT_DB_PATH=/absolute/path/workout.sqlite npm run dev
```

PowerShell:

```powershell
$env:WORKOUT_DB_PATH = "C:\absolute\path\workout.sqlite"
npm run dev
```

## Scripts

```bash
npm run dev        # start the development server
npm run build      # create a production build
npm run start      # run the production build
npm run typecheck  # run TypeScript checks
```

## Architecture

- `src/app/api/*` contains the server API for authentication, exercises, workouts, templates, bodyweight, and CSV export.
- `src/lib/db.ts` owns SQLite schema creation, seed exercises, starter templates, and data persistence.
- `src/lib/auth.ts` owns password hashing, session issuing, and cookie handling.
- `src/lib/local-db.ts` keeps the offline-first browser copy of exercises, workouts, templates, bodyweight entries, and backups in IndexedDB.
- `src/store/workout-store.ts` keeps only the active gym-session draft in browser storage.
- `src/components/*` contains reusable UI, charts, dashboard, workout logger, analytics, and exercise library views.

## Seed Exercises

The database preloads Bench Press, Incline Press, Lat Pulldown, Pull-up, Leg Press, Romanian Deadlift, Overhead Press, Rows, Push-ups, Squats, Planks, Dips, and Treadmill Run.
