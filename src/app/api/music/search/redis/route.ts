import { NextRequest, NextResponse } from "next/server";
import { MusicStorage, Album, SearchResult } from "@/app/lib/music-storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limitParam = searchParams.get("limit");
    
    console.log(`[REDIS SEARCH] Search request received - query: "${query}", limit: ${limitParam}`);
    
    // Validate query parameter
    if (!query || query.trim() === "") {
      console.log(`[REDIS SEARCH] Empty query received`);
      return NextResponse.json(
        { error: "Query parameter 'q' is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Parse and validate limit parameter
    let limit = 10; // Default limit
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

    // Check cache first for exact match
    console.log(`[REDIS SEARCH] Checking cache for exact search match`);
    const cachedResults = await MusicStorage.getCachedSearchResults(query);
    if (cachedResults && (cachedResults.albums.length > 0 || cachedResults.artists.length > 0)) {
      console.log(`[REDIS SEARCH] Cache hit - found ${cachedResults.albums.length} albums, ${cachedResults.artists.length} artists`);
      // Limit results as requested
      const limitedAlbums = cachedResults.albums.slice(0, limit);
      const limitedArtists = cachedResults.artists.slice(0, limit);
      
      return NextResponse.json({
        success: true,
        results: {
          albums: limitedAlbums,
          artists: limitedArtists,
          total: cachedResults.total,
        },
        cached: true,
      });
    } else if (cachedResults) {
      console.log(`[REDIS SEARCH] Cache hit but no results`);
    }
    console.log(`[REDIS SEARCH] Cache miss for exact match`);

    // No results found in Redis
    console.log(`[REDIS SEARCH] No results found in Redis cache`);
    return NextResponse.json({
      success: true,
      results: {
        albums: [],
        artists: [],
        total: 0,
      },
      cached: true,
    });
  } catch (error) {
    console.error("[REDIS SEARCH] Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}