"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import type { CalendarEvent } from "@/lib/google-calendar";

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function computeTimeLeft(targetIso: string): TimeLeft {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };

  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CountdownDashboard() {
  const [current, setCurrent] = useState<CalendarEvent | null>(null);
  const [next, setNext] = useState<CalendarEvent | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/next-event");
      if (res.status === 401) {
        signOut({ callbackUrl: "/" });
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCurrent(data.current);
      setNext(data.next);
      setError(null);
    } catch {
      setError("Could not load calendar data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Determine the countdown target: next upcoming event, or end of current event
  const countdownTarget = next ?? current;
  const countdownIso = next ? next.start : current ? current.end : null;

  // Tick the countdown every second
  useEffect(() => {
    if (!countdownIso) return;

    const tick = () => {
      const tl = computeTimeLeft(countdownIso);
      setTimeLeft(tl);
      if (tl.total <= 0) {
        fetchEvents();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [countdownIso, fetchEvents]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={fetchEvents}
            className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition"
          >
            Retry
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-md bg-white/10 px-4 py-2 text-sm text-gray-400 hover:bg-white/20 hover:text-white transition"
          >
            Sign out &amp; re-login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4">
      {/* Sign out button */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="absolute top-6 right-6 rounded-md bg-white/10 px-4 py-2 text-sm text-gray-400 hover:bg-white/20 hover:text-white transition"
      >
        Sign out
      </button>

      {!current && !next ? (
        /* No meetings */
        <div className="text-center">
          <div className="text-6xl sm:text-8xl mb-6">🎉</div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white">
            No upcoming meetings
          </h1>
          <p className="mt-4 text-xl text-gray-400">Enjoy your day!</p>
        </div>
      ) : (
        <div className="text-center">
          {/* Current meeting in progress */}
          {current && (
            <div className="mb-10">
              <div className="mb-3 inline-block rounded-full bg-green-500/20 px-4 py-1.5 text-sm font-semibold text-green-400 uppercase tracking-wider">
                ● In Progress
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {current.summary}
              </h2>
              <EventDetails event={current} />
            </div>
          )}

          {/* Countdown to next event */}
          {next ? (
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gray-500">
                Next meeting in
              </p>
              <div className="font-mono text-7xl sm:text-9xl font-bold tabular-nums text-white leading-none">
                {timeLeft
                  ? `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
                  : "--:--:--"}
              </div>
              <div className="mt-8">
                <h2 className="text-2xl sm:text-4xl font-bold text-white">
                  {next.summary}
                </h2>
                <EventDetails event={next} />
              </div>
            </div>
          ) : current ? (
            /* Only current event, no next — show time remaining */
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gray-500">
                Current meeting ends in
              </p>
              <div className="font-mono text-7xl sm:text-9xl font-bold tabular-nums text-white leading-none">
                {timeLeft
                  ? `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
                  : "--:--:--"}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function EventDetails({ event }: { event: CalendarEvent }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 text-gray-400">
      <p className="text-lg">
        {formatTime(event.start)} — {formatTime(event.end)}
      </p>

      {event.location && (
        <p className="text-base flex items-center gap-1.5">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {event.location}
        </p>
      )}

      {event.description && (
        <p className="mt-2 max-w-md text-sm text-gray-500 line-clamp-3">
          {event.description}
        </p>
      )}

      {event.hangoutLink && (
        <a
          href={event.hangoutLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 12l4.5 3V9L14 12zm-2 4H4V8h8v8zM2 6v12h12v-4l6 4V6l-6 4V6H2z" />
          </svg>
          Join Google Meet
        </a>
      )}
    </div>
  );
}
