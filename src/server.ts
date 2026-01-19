import 'dotenv/config';
import app from './app';
import { config } from './config';
import { checkDatabaseConnection } from './config/supabase';
import { checkRedisConnection } from './config/redis';
import WebSocket from 'ws';

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

// Check Vosk connection
const checkVoskConnection = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const { host, port, protocol } = config.vosk;
    const wsUrl = `${protocol}://${host}:${port}`;
    
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 3000);

    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
};

checkVoskConnection().then((isConnected) => {
  if (isConnected) {
    console.log('Vosk connection: OK');
  } else {
    console.warn('Vosk connection: FAILED - Speech-to-text features will not work');
  }
});

// Start server regardless of connection status
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
