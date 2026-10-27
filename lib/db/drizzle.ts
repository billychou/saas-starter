import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// When POSTGRES_URL points at a local TCP tunnel (see scripts/pg-tunnel.mjs)
// but the TLS endpoint requires the real hostname as SNI, set
// PG_TLS_SERVERNAME to the original Neon host to override it.
const tunnelOptions = process.env.PG_TLS_SERVERNAME
  ? {
      ssl: {
        servername: process.env.PG_TLS_SERVERNAME,
        rejectUnauthorized: false
      }
    }
  : {};

export const client = postgres(process.env.POSTGRES_URL, tunnelOptions);
export const db = drizzle(client, { schema });
