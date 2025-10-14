import { NextRequest, NextResponse } from "next/server";
import { MusicBrainzClient } from "@/app/lib/musicbrainz-client";
import { MusicStorage } from "@/app/lib/music-storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const mbid = searchParams.get("mbid");
    const includeAlbumsParam = searchParams.get("includeAlbums");

    // Validate parameters
    if (!id && !mbid) {
      return NextResponse.json(
        { error: "Either 'id' or 'mbid' parameter is required" },
        { status: 400 }
      );
    }

    const includeAlbums = includeAlbumsParam === "true";

    let artist = null;
    let cached = false;
    let albums = null;
    let albumsCached = false;

    // Try to get artist from cache first
    if (id) {
      artist = await MusicStorage.getCachedArtist(id);
      if (artist) {
        cached = true;
      }
    } else if (mbid) {
      artist = await MusicStorage.getCachedArtistByMBID(mbid);
      if (artist) {
        cached = true;
      }
    }

    // If not in cache, fetch from MusicBrainz
    if (!artist && mbid) {
      artist = await MusicBrainzClient.getArtist(mbid);
      if (artist) {
        // Cache the artist
        await MusicStorage.cacheArtist(artist);
        await MusicStorage.cacheArtistByMBID(mbid, artist);
      }
    }

    if (!artist) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 }
      );
    }

    // Get albums if requested
    if (includeAlbums && artist.musicBrainzId) {
      // Try to get cached albums first
      albums = await MusicStorage.getCachedArtistAlbums(artist.id);
      if (albums) {
        albumsCached = true;
      } else {
        // Fetch from MusicBrainz
        albums = await MusicBrainzClient.getArtistReleases(artist.musicBrainzId);
        if (albums && albums.length > 0) {
          // Cache the albums
          await MusicStorage.cacheArtistAlbums(artist.id, albums);
          
          // Also cache individual albums
          for (const album of albums) {
            await MusicStorage.cacheAlbum(album);
            if (album.musicBrainzId) {
              await MusicStorage.cacheAlbumByMBID(album.musicBrainzId, album);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      artist,
      albums,
      cached,
      albumsCached,
    });
  } catch (error) {
    console.error("Get artist error:", error);
    
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