import { google } from "googleapis";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO date string
  end: string;
  hangoutLink?: string;
  htmlLink?: string;
  status: "upcoming" | "in-progress" | "none";
}

export interface CalendarInfo {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
}

export interface CalendarEvents {
  current: CalendarEvent | null;
  next: CalendarEvent | null;
}

export async function listCalendars(
  accessToken: string
): Promise<CalendarInfo[]> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const response = await calendar.calendarList.list({ minAccessRole: "reader" });

  const items = response.data.items;
  if (!items) return [];

  return items
    .filter((c) => !c.deleted && !c.hidden)
    .map((c) => ({
      id: c.id || "",
      summary: c.summary || "Untitled",
      backgroundColor: c.backgroundColor || undefined,
      primary: c.primary || false,
    }));
}

export async function getNextEvents(
  accessToken: string,
  calendarIds: string[] = ["primary"]
): Promise<CalendarEvents> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();

  // Fetch events from all selected calendars in parallel
  const responses = await Promise.all(
    calendarIds.map((calendarId) =>
      calendar.events
        .list({
          calendarId,
          timeMin: now.toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: "startTime",
        })
        .then((res) => res.data.items || [])
        .catch(() => [])
    )
  );

  // Merge and sort all events by start time
  const allEvents = responses
    .flat()
    .filter((e) => e.start?.dateTime) // skip all-day events
    .sort((a, b) => {
      const aStart = new Date(a.start!.dateTime!).getTime();
      const bStart = new Date(b.start!.dateTime!).getTime();
      return aStart - bStart;
    });

  const events = allEvents;

  if (events.length === 0) {
    return { current: null, next: null };
  }

  let current: CalendarEvent | null = null;
  let next: CalendarEvent | null = null;

  for (const event of events) {
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;

    if (!start || !end) continue;

    const startTime = new Date(start);
    const endTime = new Date(end);

    // Skip all-day events (they have date but not dateTime)
    if (!event.start?.dateTime) continue;

    const parsed: CalendarEvent = {
      id: event.id || "",
      summary: event.summary || "Untitled Event",
      description: event.description || undefined,
      location: event.location || undefined,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      hangoutLink: event.hangoutLink || undefined,
      htmlLink: event.htmlLink || undefined,
      status: now >= startTime && now < endTime ? "in-progress" : "upcoming",
    };

    if (parsed.status === "in-progress" && !current) {
      current = parsed;
    } else if (parsed.status === "upcoming" && !next) {
      next = parsed;
    }

    if (current && next) break;
  }

  return { current, next };
}
