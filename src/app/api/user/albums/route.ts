import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/app/lib/auth-middleware";
import { UserAlbums } from "@/app/lib/user-albums";
import { MusicStorage } from "@/app/lib/music-storage";

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
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (date) {
      // Get specific date
      const userAlbum = await UserAlbums.getUserAlbum(auth.user!.id, date);
      
      if (!userAlbum) {
        return NextResponse.json({
          success: true,
          album: null,
        });
      }

      // Get album details
      const album = await MusicStorage.getCachedAlbum(userAlbum.albumId);
      
      return NextResponse.json({
        success: true,
        album: {
          ...userAlbum,
          albumDetails: album,
        },
      });
    } else if (startDate && endDate) {
      // Get date range
      const calendarEntries = await UserAlbums.getUserCalendar(
        auth.user!.id,
        startDate,
        endDate
      );

      // Get album details for each entry
      const entriesWithAlbums = await Promise.all(
        calendarEntries.map(async (entry) => {
          if (entry.album) {
            const albumDetails = await MusicStorage.getCachedAlbum(entry.album.id);
            return {
              ...entry,
              album: albumDetails || entry.album,
            };
          }
          return entry;
        })
      );

      return NextResponse.json({
        success: true,
        calendar: entriesWithAlbums,
      });
    } else {
      // Get all user albums
      const userAlbums = await UserAlbums.getAllUserAlbums(auth.user!.id);
      
      // Get album details for each entry
      const albums = await Promise.all(
        userAlbums.map(async (userAlbum) => {
          const albumDetails = await MusicStorage.getCachedAlbum(userAlbum.albumId);
          return {
            ...userAlbum,
            albumDetails,
          };
        })
      );

      return NextResponse.json({
        success: true,
        albums,
      });
    }
  } catch (error) {
    console.error("User albums GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const { albumId, date, rating, notes } = await request.json();

    // Validate input
    if (!albumId || !date) {
      return NextResponse.json(
        { error: "Album ID and date are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if album exists in cache
    const album = await MusicStorage.getCachedAlbum(albumId);
    if (!album) {
      return NextResponse.json(
        { error: "Album not found. Please search for the album first." },
        { status: 404 }
      );
    }

    // Add user album
    const userAlbum = await UserAlbums.addUserAlbum(
      auth.user!.id,
      albumId,
      date,
      rating,
      notes
    );

    return NextResponse.json({
      success: true,
      userAlbum: {
        ...userAlbum,
        albumDetails: album,
      },
    });
  } catch (error) {
    console.error("User albums POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.statusCode }
      );
    }

    const { date, rating, notes } = await request.json();

    // Validate input
    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Update user album
    const updatedAlbum = await UserAlbums.updateUserAlbum(auth.user!.id, date, {
      rating,
      notes,
    });

    if (!updatedAlbum) {
      return NextResponse.json(
        { error: "No album found for the specified date" },
        { status: 404 }
      );
    }

    // Get album details
    const album = await MusicStorage.getCachedAlbum(updatedAlbum.albumId);

    return NextResponse.json({
      success: true,
      userAlbum: {
        ...updatedAlbum,
        albumDetails: album,
      },
    });
  } catch (error) {
    console.error("User albums PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const date = searchParams.get("date");

    // Validate input
    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Delete user album
    const deleted = await UserAlbums.deleteUserAlbum(auth.user!.id, date);

    if (!deleted) {
      return NextResponse.json(
        { error: "No album found for the specified date" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Album deleted successfully",
    });
  } catch (error) {
    console.error("User albums DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}