import { describe, it, expect, beforeEach, mock } from "bun:test";
import { POST } from "../../src/app/api/auth/login/route";
import { AuthUtils } from "../../src/app/lib/auth-utils";
import { createMockRequest, createTestUser, extractCookies, parseJsonResponse } from "../test-helpers";

// Mock the AuthUtils module
mock.module("../../src/app/lib/auth-utils", () => ({
  AuthUtils: {
    authenticateUser: mock(() => Promise.resolve(null)),
    createSession: mock(() => Promise.resolve({
      sessionId: "test-session-id",
      userId: "test-user-id",
      username: "testuser",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })),
  },
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mock.restore();
  });

  it("should return 400 when username is missing", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Username and password are required");
  });

  it("should return 400 when password is missing", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      username: "testuser",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Username and password are required");
  });

  it("should return 400 when both username and password are missing", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {});

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Username and password are required");
  });

  it("should return 401 when user does not exist", async () => {
    // Mock authenticateUser to return null (user not found)
    const mockAuthenticateUser = mock(() => Promise.resolve(null));
    AuthUtils.authenticateUser = mockAuthenticateUser;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      username: "nonexistentuser",
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid username or password");
    expect(mockAuthenticateUser).toHaveBeenCalledWith("nonexistentuser", "password123");
  });

  it("should return 401 when password is incorrect", async () => {
    // Mock authenticateUser to return null (invalid password)
    const mockAuthenticateUser = mock(() => Promise.resolve(null));
    AuthUtils.authenticateUser = mockAuthenticateUser;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      username: "testuser",
      password: "wrongpassword",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid username or password");
    expect(mockAuthenticateUser).toHaveBeenCalledWith("testuser", "wrongpassword");
  });

  it("should successfully login with valid credentials", async () => {
    const testUser = createTestUser({
      username: "testuser",
      id: "user-123",
    });

    const testSession = {
      sessionId: "session-123",
      userId: "user-123",
      username: "testuser",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Mock authenticateUser to return a user
    const mockAuthenticateUser = mock(() => Promise.resolve(testUser));
    AuthUtils.authenticateUser = mockAuthenticateUser;

    // Mock createSession to return a session
    const mockCreateSession = mock(() => Promise.resolve(testSession));
    AuthUtils.createSession = mockCreateSession;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      username: "testuser",
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);
    const cookies = extractCookies(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user-123");
    expect(data.user.username).toBe("testuser");
    expect(data.user.createdAt).toBe(testUser.createdAt);
    
    // Check session cookie
    expect(cookies.session_id).toBe("session-123");
    
    // Verify mocks were called correctly
    expect(mockAuthenticateUser).toHaveBeenCalledWith("testuser", "password123");
    expect(mockCreateSession).toHaveBeenCalledWith("user-123", "testuser");
  });

  it("should return 500 when an error occurs during authentication", async () => {
    // Mock authenticateUser to throw an error
    const mockAuthenticateUser = mock(() => Promise.reject(new Error("Database error")));
    AuthUtils.authenticateUser = mockAuthenticateUser;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      username: "testuser",
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return 500 when an error occurs during session creation", async () => {
    const testUser = createTestUser({
      username: "testuser",
      id: "user-123",
    });

    // Mock authenticateUser to return a user
    const mockAuthenticateUser = mock(() => Promise.resolve(testUser));
    AuthUtils.authenticateUser = mockAuthenticateUser;

    // Mock createSession to throw an error
    const mockCreateSession = mock(() => Promise.reject(new Error("Session creation error")));
    AuthUtils.createSession = mockCreateSession;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      username: "testuser",
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should set session cookie with correct options", async () => {
    const testUser = createTestUser();
    const testSession = {
      sessionId: "session-123",
      userId: testUser.id,
      username: testUser.username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const mockAuthenticateUser = mock(() => Promise.resolve(testUser));
    const mockCreateSession = mock(() => Promise.resolve(testSession));
    AuthUtils.authenticateUser = mockAuthenticateUser;
    AuthUtils.createSession = mockCreateSession;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/login", {
      username: "testuser",
      password: "password123",
    });

    const response = await POST(request);
    const setCookieHeader = response.headers.get("set-cookie");

    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain("session_id=session-123");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Path=/");
    expect(setCookieHeader).toContain("Max-Age=604800"); // 7 days in seconds
  });
});