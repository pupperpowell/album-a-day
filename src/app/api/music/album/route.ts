import { NextRequest, NextResponse } from "next/server";
import { MusicBrainzClient } from "@/app/lib/musicbrainz-client";
import { MusicStorage, Album } from "@/app/lib/music-storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const mbid = searchParams.get("mbid");

    // Validate parameters
    if (!id && !mbid) {
      return NextResponse.json(
        { error: "Either 'id' or 'mbid' parameter is required" },
        { status: 400 }
      );
    }

    let album = null;
    let cached = false;

    // Try to get from cache first
    if (id) {
      album = await MusicStorage.getCachedAlbum(id);
      if (album) {
        cached = true;
      }
    } else if (mbid) {
      album = await MusicStorage.getCachedAlbumByMBID(mbid);
      if (album) {
        cached = true;
      }
    }

    // If not in cache, fetch from MusicBrainz
    if (!album && mbid) {
      album = await MusicBrainzClient.getRelease(mbid);
      if (album) {
        // Cache the album
        await MusicStorage.cacheAlbum(album);
        await MusicStorage.cacheAlbumByMBID(mbid, album);
        
        // If the album has a release group, cache the relationship
        if (album.releaseGroupId) {
          await MusicStorage.cacheReleaseGroupReleases(album.releaseGroupId, [album]);
        }
      }
    }

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      album,
      cached,
    });
  } catch (error) {
    console.error("Get album error:", error);
    
    // Check if it's a MusicBrainz API error
    if (error instanceof Error && error.message.includes("MusicBrainz API error")) {
      return NextResponse.json(
        { error: "Failed to fetch data from MusicBrainz. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}