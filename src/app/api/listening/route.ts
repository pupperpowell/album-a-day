import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/app/lib/auth-middleware";
import { ListeningEntries } from "@/app/lib/listening-entries";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.statusCode }
      );
    }

    const { date, album_mbid, rating, favorite_track, notes } = await request.json();

    // Validate required fields
    if (!date || !album_mbid) {
      return NextResponse.json(
        { error: "Date and album_mbid are required" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!ListeningEntries.validateDate(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Check if date is in the future
    if (ListeningEntries.isDateInFuture(date)) {
      return NextResponse.json(
        { error: "Cannot add listening entries for future dates" },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating !== undefined && !ListeningEntries.validateRating(rating)) {
      return NextResponse.json(
        { error: "Rating must be between 0 and 10" },
        { status: 400 }
      );
    }

    // Set default values for optional fields
    const finalRating = rating !== undefined ? rating : 0;
    const finalFavoriteTrack = favorite_track || "";
    const finalNotes = notes || "";

    // Add or update listening entry
    const entry = await ListeningEntries.addOrUpdateListeningEntry(
      auth.user!.username,
      date,
      album_mbid,
      finalRating,
      finalFavoriteTrack,
      finalNotes
    );

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error("Listening POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}