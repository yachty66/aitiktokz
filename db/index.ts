import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Get the database URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create postgres connection
const client = postgres(connectionString, { 
  prepare: false,
  max: 10 
});

// Create drizzle instance
export const db = drizzle(client, { schema });

