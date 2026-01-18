import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/supabase';
import { checkRedisConnection } from '../config/redis';
import { config } from '../config';

export const getHealth = async (req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();
  const redisConnected = config.redis.enabled ? await checkRedisConnection() : null;
  
  const status = {
    database: dbConnected ? 'connected' : 'disconnected',
    ...(config.redis.enabled && { redis: redisConnected ? 'connected' : 'disconnected' }),
  };
  
  // If any required service is down, return 503
  if (!dbConnected || (config.redis.enabled && !redisConnected)) {
    return res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      ...status,
    });
  }
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    ...status,
  });
};
