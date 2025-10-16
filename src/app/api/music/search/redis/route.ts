import { NextRequest, NextResponse } from "next/server";
import { MusicStorage, Album, SearchResult, Artist } from "@/app/lib/music-storage";

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

    // Perform Redisearch on albums
    console.log(`[REDIS SEARCH] Performing Redisearch on albums`);
    const albums = await MusicStorage.searchAlbums(query, limit);
    
    // For now, we're only searching albums, not artists
    const artists: Artist[] = [];
    
    // Create search result
    const searchResult: SearchResult = {
      albums,
      artists,
      total: albums.length + artists.length
    };
    
    // Cache the results
    await MusicStorage.cacheSearchResults(query, searchResult);
    
    console.log(`[REDIS SEARCH] Found ${albums.length} albums, ${artists.length} artists`);
    
    return NextResponse.json({
      success: true,
      results: searchResult,
      cached: false,
    });
  } catch (error) {
    console.error("[REDIS SEARCH] Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}