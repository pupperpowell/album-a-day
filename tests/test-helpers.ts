import { NextRequest } from "next/server";
import { User, Session } from "../src/app/lib/auth-utils";

// Helper to create a mock NextRequest
export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  cookies?: Record<string, string>
): NextRequest {
  const requestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  } as any;

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  const request = new NextRequest(url, requestInit);

  // Set cookies if provided
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      request.cookies.set(name, value);
    }
  }

  return request;
}

// Helper to create a test user
export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id || crypto.randomUUID(),
    username: overrides.username || "testuser",
    passwordHash: overrides.passwordHash || "hashedpassword",
    createdAt: overrides.createdAt || new Date().toISOString(),
  };
}

// Helper to create a test session
export function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionId: overrides.sessionId || crypto.randomUUID(),
    userId: overrides.userId || crypto.randomUUID(),
    username: overrides.username || "testuser",
    createdAt: overrides.createdAt || new Date().toISOString(),
    expiresAt: overrides.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Helper to extract cookies from response
export function extractCookies(response: Response): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookieHeader = response.headers.get("set-cookie");
  
  if (setCookieHeader) {
    // Split by comma first, then process each cookie
    setCookieHeader.split(",").forEach(cookieStr => {
      const cookieParts = cookieStr.trim().split(";");
      cookieParts.forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.includes("=")) {
          const [name, ...valueParts] = trimmedPart.split("=");
          if (name && valueParts.length > 0) {
            cookies[name] = valueParts.join("=");
          }
        }
      });
    });
  }
  
  return cookies;
}

// Helper to parse JSON response
export async function parseJsonResponse(response: Response): Promise<any> {
  return await response.json();
}