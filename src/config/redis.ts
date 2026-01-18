import { createClient, RedisClientType } from 'redis';
import { config } from './index';

// Redis client instance
let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client instance
 * Note: This function returns the client but connection happens asynchronously
 */
export const getRedisClient = (): RedisClientType | null => {
  if (!config.redis.enabled) {
    return null;
  }

  if (!redisClient) {
    const socketConfig = {
      host: config.redis.host,
      port: config.redis.port,
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error('Redis: Max reconnection retries reached');
          return new Error('Max reconnection retries reached');
        }
        // Exponential backoff: 100ms, 200ms, 400ms, etc., max 3000ms
        return Math.min(retries * 100, 3000);
      },
    };

    const baseOptions = {
      socket: socketConfig,
      database: config.redis.database || 0,
    };

    // Only include password if it's provided (not empty string)
    const clientOptions = config.redis.password
      ? { ...baseOptions, password: config.redis.password }
      : baseOptions;

    redisClient = createClient(clientOptions);

    // Error event handlers
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      console.log('Redis: Client ready');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis: Reconnecting...');
    });

    redisClient.on('end', () => {
      console.log('Redis: Connection ended');
    });

    // Connect to Redis asynchronously
    redisClient.connect().catch((err) => {
      console.error('Redis: Failed to connect:', err);
    });
  }

  return redisClient;
};

/**
 * Check Redis connection
 */
export const checkRedisConnection = async (): Promise<boolean> => {
  if (!config.redis.enabled) {
    return false;
  }

  try {
    const client = getRedisClient();
    if (!client) {
      return false;
    }

    // Ping Redis to check connection
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis connection check failed:', error);
    return false;
  }
};

/**
 * Close Redis connection gracefully
 */
export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis: Connection closed');
    } catch (error) {
      console.error('Redis: Error closing connection:', error);
    } finally {
      redisClient = null;
    }
  }
};

// Export the client getter for direct access if needed
export { redisClient };
