import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNextEvents } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Token expired. Please sign in again." },
      { status: 401 }
    );
  }

  const calendarIds =
    request.nextUrl.searchParams.getAll("calendarId");
  const ids = calendarIds.length > 0 ? calendarIds : ["primary"];

  try {
    const { current, next } = await getNextEvents(
      session.accessToken,
      ids
    );
    return NextResponse.json({ current, next });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
