import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from './env.js';
import * as schema from '@thecookflow/shared/schemas';

// Create Neon client
const sql = neon(env.DATABASE_URL);

// Create Drizzle instance with all schemas
export const db = drizzle(sql, { schema });

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as connected`;
    return result[0]?.connected === 1;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Export schema for convenience
export { schema };