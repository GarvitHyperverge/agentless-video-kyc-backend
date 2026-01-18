import 'dotenv/config';
import app from './app';
import { config } from './config';
import { checkDatabaseConnection } from './config/supabase';
import { checkRedisConnection } from './config/redis';

const PORT = config.port;

// Check database connection 
checkDatabaseConnection().then((isConnected) => {
  if (isConnected) {
    console.log('Database connection: OK');
  } else {
    console.warn(' Database connection: FAILED - Server will start but database operations may fail');
  }
});

// Check Redis connection (if enabled)
if (config.redis.enabled) {
  checkRedisConnection().then((isConnected) => {
    if (isConnected) {
      console.log('Redis connection: OK');
    } else {
      console.warn('Redis connection: FAILED - Server will start but Redis operations may fail');
    }
  });
} else {
  console.log('Redis: DISABLED (set REDIS_ENABLED=true to enable)');
}

// Start server regardless of database connection status
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
