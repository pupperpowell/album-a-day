import { RedisClient } from "bun";

class RedisManager {
  private static instance: RedisManager;
  private client: RedisClient;
  private isConnected: boolean = false;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.client = new RedisClient(redisUrl);
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        // Test connection with ping
        console.log("[REDIS] Attempting to connect to Redis...");
        await this.client.ping();
        this.isConnected = true;
        console.log("[REDIS] Successfully connected to Redis");
      } catch (error) {
        console.error("[REDIS] Failed to connect to Redis:", error);
        this.isConnected = false;
        throw error;
      }
    }
  }

  public getClient(): RedisClient {
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      // Bun's RedisClient doesn't have a quit method, connection is managed automatically
      this.isConnected = false;
      console.log("Redis connection marked as disconnected");
    }
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance();

// Export convenience functions
export const getRedisClient = (): RedisClient => {
	try {
		console.log(`[REDIS] Getting Redis client instance`);
		return redisManager.getClient();
	} catch (error) {
		console.error(`[REDIS] Error getting Redis client:`, error);
		throw error;
	}
};

// Initialize connection on module load
redisManager.connect().catch((error) => {
  console.error("[REDIS] Initial Redis connection failed:", error);
});
