import { NextRequest } from "next/server";
import { AuthUtils } from "./auth-utils";

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    username: string;
    createdAt: string;
  };
  session: {
    sessionId: string;
    expiresAt: string;
  };
}

export async function authenticateRequest(request: NextRequest): Promise<{
  user?: {
    id: string;
    username: string;
    createdAt: string;
  };
  session?: {
    sessionId: string;
    expiresAt: string;
  };
  error?: string;
  statusCode?: number;
}> {
  try {
    const sessionId = request.cookies.get("session_id")?.value;

    if (!sessionId) {
      return {
        error: "No session found",
        statusCode: 401,
      };
    }

    // Validate session
    const session = await AuthUtils.getSession(sessionId);
    if (!session) {
      return {
        error: "Invalid or expired session",
        statusCode: 401,
      };
    }

    // Get user details
    const user = await AuthUtils.getUserById(session.userId);
    if (!user) {
      return {
        error: "User not found",
        statusCode: 401,
      };
    }

    // Refresh session
    await AuthUtils.refreshSession(sessionId);

    return {
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
      session: {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
      },
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      error: "Internal server error",
      statusCode: 500,
    };
  }
}

export function createAuthResponse(
  data: any,
  status: number = 200,
  sessionId?: string
) {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (sessionId) {
    response.headers.append(
      "Set-Cookie",
      `session_id=${sessionId}; HttpOnly; Secure=${
        process.env.NODE_ENV === "production"
      }; SameSite=lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`
    );
  }

  return response;
}

export function createErrorResponse(message: string, status: number = 500) {
  return new Response(
    JSON.stringify({
      error: message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}