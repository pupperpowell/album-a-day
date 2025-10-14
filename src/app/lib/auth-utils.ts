import { getRedisClient } from "./redis-client";

const client = getRedisClient();

// User data interfaces
export interface User {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  username: string;
  createdAt: string;
  expiresAt: string;
}

// Authentication utilities
export class AuthUtils {
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private static readonly USER_PREFIX = "user:";
  private static readonly SESSION_PREFIX = "session:";
  private static readonly USERNAME_INDEX = "usernames";

  /**
   * Hash a password using Bun.password
   */
  static async hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  }

  /**
   * Generate a random session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Create a new user
   */
  static async createUser(username: string, password: string, name: string): Promise<User> {
    // Check if username already exists
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Hash the password
    const passwordHash = await this.hashPassword(password);
    const userId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const user: User = {
      id: userId,
      username,
      name,
      passwordHash,
      createdAt,
    };

    // Store user data
    await client.set(`${this.USER_PREFIX}${userId}`, JSON.stringify(user));
    
    // Add username to index for quick lookup
    await client.hset(this.USERNAME_INDEX, { [username]: userId });

    return user;
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    const userId = await client.hget(this.USERNAME_INDEX, username);
    if (!userId) {
      return null;
    }

    return this.getUserById(userId);
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const userData = await client.get(`${this.USER_PREFIX}${userId}`);
    if (!userData) {
      return null;
    }

    return JSON.parse(userData) as User;
  }

  /**
   * Authenticate user with username and password
   */
  static async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Create a new session for a user
   */
  static async createSession(userId: string, username: string): Promise<Session> {
    const sessionId = this.generateSessionId();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000).toISOString();

    const session: Session = {
      sessionId,
      userId,
      username,
      createdAt,
      expiresAt,
    };

    // Store session with TTL
    await client.set(`${this.SESSION_PREFIX}${sessionId}`, JSON.stringify(session));
    await client.expire(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_TTL);

    return session;
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<Session | null> {
    const sessionData = await client.get(`${this.SESSION_PREFIX}${sessionId}`);
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData) as Session;
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    await client.del(`${this.SESSION_PREFIX}${sessionId}`);
  }

  /**
   * Refresh session (extend expiration)
   */
  static async refreshSession(sessionId: string): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const newExpiresAt = new Date(Date.now() + this.SESSION_TTL * 1000).toISOString();
    const updatedSession: Session = {
      ...session,
      expiresAt: newExpiresAt,
    };

    await client.set(`${this.SESSION_PREFIX}${sessionId}`, JSON.stringify(updatedSession));
    await client.expire(`${this.SESSION_PREFIX}${sessionId}`, this.SESSION_TTL);

    return updatedSession;
  }

  /**
   * Get all sessions for a user
   */
  static async getUserSessions(userId: string): Promise<Session[]> {
    // This would require a more complex implementation with indexing
    // For now, return empty array
    return [];
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteAllUserSessions(userId: string): Promise<void> {
    // This would require a more complex implementation with indexing
    // For now, this is a placeholder
  }
}