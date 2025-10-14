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

    // Get user statistics
    const stats = await UserAlbums.getUserStats(auth.user!.id);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("User stats GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}