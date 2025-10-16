import { NextRequest, NextResponse } from "next/server";
import { MusicBrainzClient } from "@/app/lib/musicbrainz-client";
import { MusicStorage } from "@/app/lib/music-storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limitParam = searchParams.get("limit");
    
    console.log(`[MUSICBRAINZ SEARCH] Search request received - query: "${query}", limit: ${limitParam}`);
    
    // Validate query parameter
    if (!query || query.trim() === "") {
      console.log(`[MUSICBRAINZ SEARCH] Empty query received`);
      return NextResponse.json(
        { error: "Query parameter 'q' is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Parse and validate limit parameter
    let limit = 50; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        return NextResponse.json(
          { error: "Limit parameter must be a number between 1 and 50" },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    // Perform full search with release groups
    console.log(`[MUSICBRAINZ SEARCH] Performing full MusicBrainz search`);
    const searchResults = await MusicBrainzClient.search(query, limit);
    console.log(`[MUSICBRAINZ SEARCH] MusicBrainz search returned ${searchResults.albums.length} albums, ${searchResults.artists.length} artists`);

    return NextResponse.json({
      success: true,
      results: searchResults,
      cached: false,
    });
  } catch (error) {
    console.error("[MUSICBRAINZ SEARCH] Search error:", error);
    
    // Check if it's a MusicBrainz API error
    if (error instanceof Error && error.message.includes("MusicBrainz API error")) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}