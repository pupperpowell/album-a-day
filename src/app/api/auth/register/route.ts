import { NextRequest, NextResponse } from "next/server";
import { AuthUtils } from "@/app/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const { username, password, name } = await request.json();

    // Validate input
    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "Username, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Create user
    const user = await AuthUtils.createUser(username, password, name);

    // Create session
    const session = await AuthUtils.createSession(user.id, user.username);

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
      },
    });

    response.cookies.set("session_id", session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof Error && error.message === "Username already exists") {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}