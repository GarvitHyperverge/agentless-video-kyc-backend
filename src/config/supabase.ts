import postgres from 'postgres';
import { config } from './index';

const sql = postgres(config.databaseUrl);

// Function to check database connection
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

export default sql;