import { describe, it, expect, beforeEach, mock } from "bun:test";
import { POST } from "../../src/app/api/auth/register/route";
import { AuthUtils } from "../../src/app/lib/auth-utils";
import { createMockRequest, createTestUser, extractCookies, parseJsonResponse } from "../test-helpers";

// Mock the AuthUtils module
mock.module("../../src/app/lib/auth-utils", () => ({
  AuthUtils: {
    createUser: mock(() => Promise.resolve(createTestUser())),
    createSession: mock(() => Promise.resolve({
      sessionId: "test-session-id",
      userId: "test-user-id",
      username: "testuser",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })),
  },
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mock.restore();
  });

  it("should return 400 when username is missing", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Username and password are required");
  });

  it("should return 400 when password is missing", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "testuser",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Username and password are required");
  });

  it("should return 400 when both username and password are missing", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {});

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Username and password are required");
  });

  it("should return 400 when password is too short", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "testuser",
      password: "123", // Less than 6 characters
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Password must be at least 6 characters long");
  });

  it("should return 400 when password is exactly 5 characters", async () => {
    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "testuser",
      password: "12345", // Exactly 5 characters
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe("Password must be at least 6 characters long");
  });

  it("should return 409 when username already exists", async () => {
    // Mock createUser to throw an error for existing username
    const mockCreateUser = mock(() => Promise.reject(new Error("Username already exists")));
    AuthUtils.createUser = mockCreateUser;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "existinguser",
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(409);
    expect(data.error).toBe("Username already exists");
    expect(mockCreateUser).toHaveBeenCalledWith("existinguser", "password123");
  });

  it("should successfully register with valid credentials", async () => {
    const testUser = createTestUser({
      username: "newuser",
      id: "user-456",
    });

    const testSession = {
      sessionId: "session-456",
      userId: "user-456",
      username: "newuser",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Mock createUser to return a user
    const mockCreateUser = mock(() => Promise.resolve(testUser));
    AuthUtils.createUser = mockCreateUser;

    // Mock createSession to return a session
    const mockCreateSession = mock(() => Promise.resolve(testSession));
    AuthUtils.createSession = mockCreateSession;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "newuser",
      password: "password123",
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);
    const cookies = extractCookies(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user-456");
    expect(data.user.username).toBe("newuser");
    expect(data.user.createdAt).toBe(testUser.createdAt);
    
    // Check session cookie
    expect(cookies.session_id).toBe("session-456");
    
    // Verify mocks were called correctly
    expect(mockCreateUser).toHaveBeenCalledWith("newuser", "password123");
    expect(mockCreateSession).toHaveBeenCalledWith("user-456", "newuser");
  });

  it("should accept password with exactly 6 characters", async () => {
    const testUser = createTestUser({
      username: "newuser",
      id: "user-456",
    });

    const testSession = {
      sessionId: "session-456",
      userId: "user-456",
      username: "newuser",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const mockCreateUser = mock(() => Promise.resolve(testUser));
    const mockCreateSession = mock(() => Promise.resolve(testSession));
    AuthUtils.createUser = mockCreateUser;
    AuthUtils.createSession = mockCreateSession;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "newuser",
      password: "123456", // Exactly 6 characters
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledWith("newuser", "123456");
  });

  it("should accept long passwords", async () => {
    const testUser = createTestUser({
      username: "newuser",
      id: "user-456",
    });

    const testSession = {
      sessionId: "session-456",
      userId: "user-456",
      username: "newuser",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const mockCreateUser = mock(() => Promise.resolve(testUser));
    const mockCreateSession = mock(() => Promise.resolve(testSession));
    AuthUtils.createUser = mockCreateUser;
    AuthUtils.createSession = mockCreateSession;

    const longPassword = "thisisaverylongpasswordthatshouldbeaccepted";

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "newuser",
      password: longPassword,
    });

    const response = await POST(request);
    const data = await parseJsonResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledWith("newuser", longPassword);
  });

  it("should return 500 when an error occurs during user creation", async () => {
    // Mock createUser to throw a generic error
    const mockCreateUser = mock(() => Promise.reject(new Error("Database error")));
    AuthUtils.createUser = mockCreateUser;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
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
      username: "newuser",
      id: "user-456",
    });

    // Mock createUser to return a user
    const mockCreateUser = mock(() => Promise.resolve(testUser));
    AuthUtils.createUser = mockCreateUser;

    // Mock createSession to throw an error
    const mockCreateSession = mock(() => Promise.reject(new Error("Session creation error")));
    AuthUtils.createSession = mockCreateSession;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "newuser",
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
      sessionId: "session-789",
      userId: testUser.id,
      username: testUser.username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const mockCreateUser = mock(() => Promise.resolve(testUser));
    const mockCreateSession = mock(() => Promise.resolve(testSession));
    AuthUtils.createUser = mockCreateUser;
    AuthUtils.createSession = mockCreateSession;

    const request = createMockRequest("POST", "http://localhost:3000/api/auth/register", {
      username: "testuser",
      password: "password123",
    });

    const response = await POST(request);
    const setCookieHeader = response.headers.get("set-cookie");

    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain("session_id=session-789");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Path=/");
    expect(setCookieHeader).toContain("Max-Age=604800"); // 7 days in seconds
  });
});