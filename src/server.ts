import 'dotenv/config';
import app from './app';
import { config } from './config';
import { markExpiredSessionsAsIncomplete } from './services/sessionCleanup.service';
import { checkDatabaseConnection } from './config/supabase';

const PORT = config.port;

// Check database connection 
checkDatabaseConnection().then((isConnected) => {
  if (isConnected) {
    console.log('Database connection: OK');
  } else {
    console.warn(' Database connection: FAILED - Server will start but database operations may fail');
  }
});

// Start server regardless of database connection status
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  
  // Run cleanup job every 15 minutes to mark expired sessions as incomplete
  setInterval(async () => {
    try {
      await markExpiredSessionsAsIncomplete();
      // Logging is handled inside the function
    } catch (error) {
      console.error('Error in background session cleanup:', error);
    }
  }, 15 * 60 * 1000); // Every 15 minutes
  
  console.log('Background session cleanup job started (runs every 15 minutes)');
});
