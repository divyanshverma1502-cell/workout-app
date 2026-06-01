"use client";

import { Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GhostButton, IconButton } from "@/components/ui";

export function RestTimer() {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.navigator.vibrate?.(160);
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const label = useMemo(() => {
    const minutes = Math.floor(remaining / 60);
    const seconds = String(remaining % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remaining]);

  function chooseDuration(seconds: number) {
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
  }

  return (
    <div className="rounded-lg border border-line bg-coal/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-lift/10 text-lift">
            <TimerReset size={20} aria-hidden />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-steel">Rest timer</p>
            <p className="text-2xl font-semibold text-white">{label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton aria-label={running ? "Pause timer" : "Start timer"} onClick={() => setRunning(!running)}>
            {running ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
          </IconButton>
          <IconButton aria-label="Reset timer" onClick={() => setRemaining(duration)}>
            <RotateCcw size={18} aria-hidden />
          </IconButton>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[60, 90, 120].map((seconds) => (
          <GhostButton
            key={seconds}
            className={`min-h-10 text-xs ${duration === seconds ? "border-lift/50 text-lift" : ""}`}
            onClick={() => chooseDuration(seconds)}
          >
            {seconds}s
          </GhostButton>
        ))}
      </div>
    </div>
  );
}
