import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/app/lib/auth-middleware";
import { UserAlbums } from "@/app/lib/user-albums";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    let start = startDate;
    let end = endDate;

    // Handle year/month parameters
    if (year && month) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json(
          { error: "Invalid year or month parameters" },
          { status: 400 }
        );
      }

      const firstDay = new Date(yearNum, monthNum - 1, 1);
      const lastDay = new Date(yearNum, monthNum, 0); // Last day of the month
      
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    } else if (year) {
      const yearNum = parseInt(year);
      
      if (isNaN(yearNum)) {
        return NextResponse.json(
          { error: "Invalid year parameter" },
          { status: 400 }
        );
      }

      start = `${yearNum}-01-01`;
      end = `${yearNum}-12-31`;
    }

    // Validate date range
    if (!start || !end) {
      return NextResponse.json(
        { error: "Either startDate/endDate or year/month parameters are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: "Dates must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Get calendar entries
    const calendarEntries = await UserAlbums.getUserCalendar(
      auth.user!.id,
      start,
      end
    );

    return NextResponse.json({
      success: true,
      calendar: calendarEntries,
      startDate: start,
      endDate: end,
    });
  } catch (error) {
    console.error("Calendar GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}