"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { BodyweightEntry, Workout } from "@/types/domain";
import { customStrengthTrend, exerciseHistory, muscleFrequency, strengthTrend, volumeByDay, volumeByMonth, volumeByWeek, weeklyWorkoutCounts } from "@/lib/metrics";

const grid = "rgba(255,255,255,0.08)";
const tick = "#92a2b8";
const tooltipStyle = {
  background: "#11161d",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "8px",
  color: "#f8fafc",
};

export function StrengthTrendChart({ workouts }: { workouts: Workout[] }) {
  const data = strengthTrend(workouts);

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="date" stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="benchPress" name="Bench" stroke="#38e1a2" strokeWidth={3} dot={false} connectNulls />
          <Line type="monotone" dataKey="squatLegPress" name="Squat/Leg Press" stroke="#f5b74f" strokeWidth={3} dot={false} connectNulls />
          <Line type="monotone" dataKey="pullUp" name="Pull-up" stroke="#7dd3fc" strokeWidth={3} dot={false} connectNulls />
          <Line type="monotone" dataKey="overheadPress" name="OHP" stroke="#f0abfc" strokeWidth={3} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomStrengthChart({ workouts, exerciseId, label }: { workouts: Workout[]; exerciseId: string; label: string }) {
  const data = customStrengthTrend(workouts, exerciseId);

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="date" stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="custom" name={label} stroke="#38e1a2" strokeWidth={3} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeChart({ workouts }: { workouts: Workout[] }) {
  const data = volumeByWeek(workouts);

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -20, right: 6, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38e1a2" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#38e1a2" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="week" stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="volume" stroke="#38e1a2" strokeWidth={3} fill="url(#volumeFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumePeriodChart({ workouts, period }: { workouts: Workout[]; period: "daily" | "weekly" | "monthly" }) {
  const data =
    period === "daily"
      ? volumeByDay(workouts)
      : period === "monthly"
        ? volumeByMonth(workouts)
        : volumeByWeek(workouts).map((item) => ({ period: item.week, volume: item.volume }));

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -20, right: 6, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id={`volumeFill-${period}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38e1a2" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#38e1a2" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="period" stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="volume" stroke="#38e1a2" strokeWidth={3} fill={`url(#volumeFill-${period})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FrequencyChart({ workouts }: { workouts: Workout[] }) {
  const data = weeklyWorkoutCounts(workouts);

  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -20, right: 6, top: 10, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="week" stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="workouts" name="Workouts" radius={[8, 8, 0, 0]} fill="#f5b74f" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MusclePieChart({ workouts }: { workouts: Workout[] }) {
  const data = muscleFrequency(workouts);
  const colors = ["#38e1a2", "#f5b74f", "#7dd3fc", "#f0abfc", "#fb7185", "#c4b5fd"];

  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="category" innerRadius={48} outerRadius={78} paddingAngle={3}>
            {data.map((item, index) => (
              <Cell key={item.category} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BodyweightChart({ entries }: { entries: BodyweightEntry[] }) {
  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer>
        <LineChart data={entries} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="loggedAt" tickFormatter={(value) => String(value).slice(5, 10)} stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis domain={["dataMin - 2", "dataMax + 2"]} stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => String(value).slice(0, 10)} />
          <Line type="monotone" dataKey="weightKg" name="Bodyweight" stroke="#7dd3fc" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExerciseHistoryChart({ workouts, exerciseId }: { workouts: Workout[]; exerciseId: string }) {
  const data = exerciseHistory(workouts, exerciseId);

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="date" stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis stroke={tick} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="weightKg" name="Weight" stroke="#38e1a2" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="reps" name="Reps" stroke="#f5b74f" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="volume" name="Volume" stroke="#7dd3fc" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
