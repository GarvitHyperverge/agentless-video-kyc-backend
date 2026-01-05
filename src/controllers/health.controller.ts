import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/supabase';

export const getHealth = async (req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();
  
  if (!dbConnected) {
    return res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
};
