import 'dotenv/config';
import app from './app';
import { config } from './config';
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
});
