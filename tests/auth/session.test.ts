import { describe, it, expect, beforeEach, mock } from "bun:test";
import { GET, DELETE } from "../../src/app/api/auth/session/route";
import { AuthUtils } from "../../src/app/lib/auth-utils";
import { createMockRequest, createTestUser, createTestSession, extractCookies, parseJsonResponse } from "../test-helpers";

// Mock the AuthUtils module
mock.module("../../src/app/lib/auth-utils", () => ({
  AuthUtils: {
    getSession: mock(() => Promise.resolve(null)),
    getUserById: mock(() => Promise.resolve(null)),
    refreshSession: mock(() => Promise.resolve(null)),
    deleteSession: mock(() => Promise.resolve()),
  },
}));

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mock.restore();
  });

  it("should return 401 when no session cookie is provided", async () => {
    const request = createMockRequest("GET", "http://localhost:3000/api/auth/session");

    const response = await GET(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("No session found");
  });

  it("should return 401 when session cookie is empty", async () => {
    const request = createMockRequest("GET", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "");

    const response = await GET(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("No session found");
  });

  it("should return 401 when session is invalid", async () => {
    // Mock getSession to return null (invalid session)
    const mockGetSession = mock(() => Promise.resolve(null));
    AuthUtils.getSession = mockGetSession;

    const request = createMockRequest("GET", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "invalid-session-id");

    const response = await GET(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired session");
    expect(mockGetSession).toHaveBeenCalledWith("invalid-session-id");
  });

  it("should return 401 when user is not found", async () => {
    const testSession = createTestSession({
      sessionId: "valid-session-id",
      userId: "user-123",
    });

    // Mock getSession to return a valid session
    const mockGetSession = mock(() => Promise.resolve(testSession));
    AuthUtils.getSession = mockGetSession;

    // Mock getUserById to return null (user not found)
    const mockGetUserById = mock(() => Promise.resolve(null));
    AuthUtils.getUserById = mockGetUserById;

    const request = createMockRequest("GET", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "valid-session-id");

    const response = await GET(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("User not found");
    expect(mockGetSession).toHaveBeenCalledWith("valid-session-id");
    expect(mockGetUserById).toHaveBeenCalledWith("user-123");
  });

  it("should successfully validate session and return user data", async () => {
    const testSession = createTestSession({
      sessionId: "valid-session-id",
      userId: "user-123",
      username: "testuser",
    });

    const testUser = createTestUser({
      id: "user-123",
      username: "testuser",
    });

    const refreshedSession = {
      ...testSession,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Mock all the AuthUtils methods
    const mockGetSession = mock(() => Promise.resolve(testSession));
    const mockGetUserById = mock(() => Promise.resolve(testUser));
    const mockRefreshSession = mock(() => Promise.resolve(refreshedSession));
    
    AuthUtils.getSession = mockGetSession;
    AuthUtils.getUserById = mockGetUserById;
    AuthUtils.refreshSession = mockRefreshSession;

    const request = createMockRequest("GET", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "valid-session-id");

    const response = await GET(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user-123");
    expect(data.user.username).toBe("testuser");
    expect(data.user.createdAt).toBe(testUser.createdAt);
    expect(data.session.sessionId).toBe("valid-session-id");
    expect(data.session.expiresAt).toBe(refreshedSession.expiresAt);

    // Verify mocks were called correctly
    expect(mockGetSession).toHaveBeenCalledWith("valid-session-id");
    expect(mockGetUserById).toHaveBeenCalledWith("user-123");
    expect(mockRefreshSession).toHaveBeenCalledWith("valid-session-id");
  });

  it("should return 500 when an error occurs during session validation", async () => {
    // Mock getSession to throw an error
    const mockGetSession = mock(() => Promise.reject(new Error("Database error")));
    AuthUtils.getSession = mockGetSession;

    const request = createMockRequest("GET", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "valid-session-id");

    const response = await GET(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return 500 when an error occurs during user retrieval", async () => {
    const testSession = createTestSession({
      sessionId: "valid-session-id",
      userId: "user-123",
    });

    // Mock getSession to return a valid session
    const mockGetSession = mock(() => Promise.resolve(testSession));
    AuthUtils.getSession = mockGetSession;

    // Mock getUserById to throw an error
    const mockGetUserById = mock(() => Promise.reject(new Error("User retrieval error")));
    AuthUtils.getUserById = mockGetUserById;

    const request = createMockRequest("GET", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "valid-session-id");

    const response = await GET(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("DELETE /api/auth/session", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mock.restore();
  });

  it("should return 401 when no session cookie is provided", async () => {
    const request = createMockRequest("DELETE", "http://localhost:3000/api/auth/session");

    const response = await DELETE(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("No session found");
  });

  it("should return 401 when session cookie is empty", async () => {
    const request = createMockRequest("DELETE", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "");

    const response = await DELETE(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("No session found");
  });

  it("should successfully logout and clear session", async () => {
    // Mock deleteSession to succeed
    const mockDeleteSession = mock(() => Promise.resolve());
    AuthUtils.deleteSession = mockDeleteSession;

    const request = createMockRequest("DELETE", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "valid-session-id");

    const response = await DELETE(request);
    const data = await parseJsonResponse(response);
    const cookies = extractCookies(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Logged out successfully");

    // Check that session cookie is cleared
    expect(cookies.session_id).toBe("");
    expect(cookies["Max-Age"]).toBe("0");

    // Verify deleteSession was called
    expect(mockDeleteSession).toHaveBeenCalledWith("valid-session-id");
  });

  it("should clear session cookie with correct options", async () => {
    const mockDeleteSession = mock(() => Promise.resolve());
    AuthUtils.deleteSession = mockDeleteSession;

    const request = createMockRequest("DELETE", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "valid-session-id");

    const response = await DELETE(request);
    const setCookieHeader = response.headers.get("set-cookie");

    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain("session_id=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Path=/");
    expect(setCookieHeader).toContain("Max-Age=0");
  });

  it("should return 500 when an error occurs during session deletion", async () => {
    // Mock deleteSession to throw an error
    const mockDeleteSession = mock(() => Promise.reject(new Error("Database error")));
    AuthUtils.deleteSession = mockDeleteSession;

    const request = createMockRequest("DELETE", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "valid-session-id");

    const response = await DELETE(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should logout even if session doesn't exist in database", async () => {
    // Mock deleteSession to succeed even if session doesn't exist
    const mockDeleteSession = mock(() => Promise.resolve());
    AuthUtils.deleteSession = mockDeleteSession;

    const request = createMockRequest("DELETE", "http://localhost:3000/api/auth/session");
    request.cookies.set("session_id", "nonexistent-session-id");

    const response = await DELETE(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Logged out successfully");

    // Verify deleteSession was called with the session ID
    expect(mockDeleteSession).toHaveBeenCalledWith("nonexistent-session-id");
  });
});