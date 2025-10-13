import { beforeEach, afterEach } from "bun:test";

// Mock Redis client for testing
const mockRedisData = new Map<string, string>();
const mockRedisHash = new Map<string, Record<string, string>>();

// Mock RedisClient class
class MockRedisClient {
  async get(key: string): Promise<string | null> {
    return mockRedisData.get(key) || null;
  }

  async set(key: string, value: string): Promise<string> {
    mockRedisData.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    const existed = mockRedisData.has(key);
    mockRedisData.delete(key);
    return existed ? 1 : 0;
  }

  async hget(hash: string, field: string): Promise<string | null> {
    const hashData = mockRedisHash.get(hash);
    return hashData?.[field] || null;
  }

  async hset(hash: string, data: Record<string, string>): Promise<number> {
    const existingData = mockRedisHash.get(hash) || {};
    const newData = { ...existingData, ...data };
    mockRedisHash.set(hash, newData);
    return Object.keys(data).length;
  }

  async expire(key: string, seconds: number): Promise<number> {
    // For testing, we'll just return 1 to indicate success
    return 1;
  }

  async ping(): Promise<string> {
    return "PONG";
  }
}

// Mock the redis-client module
const originalModule = await import("../src/app/lib/redis-client");

// Create mock functions
const mockGetRedisClient = () => new MockRedisClient();

// Setup and teardown
beforeEach(() => {
  // Clear all mock data before each test
  mockRedisData.clear();
  mockRedisHash.clear();
  
  // Mock the getRedisClient function
  globalThis.mockGetRedisClient = mockGetRedisClient;
});

afterEach(() => {
  // Clean up after each test
  mockRedisData.clear();
  mockRedisHash.clear();
});

// Export utilities for tests
export { mockRedisData, mockRedisHash, MockRedisClient };

// Extend global type for our mock
declare global {
  var mockGetRedisClient: () => any;
}