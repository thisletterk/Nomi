import { neon } from "@neondatabase/serverless";

// For React Native/Expo, environment variables need to be prefixed with EXPO_PUBLIC_
// to be accessible on the client side
const getDatabaseUrl = () => {
  // Try EXPO_PUBLIC_ prefixed version first (for client-side access)
  if (process.env.EXPO_PUBLIC_DATABASE_URL) {
    return process.env.EXPO_PUBLIC_DATABASE_URL;
  }

  // Fallback to regular DATABASE_URL (for server-side)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // If neither is found, return null to handle gracefully
  return null;
};

const databaseUrl = getDatabaseUrl();

// Create a function to get SQL client that handles missing URL gracefully
export const getSqlClient = () => {
  if (!databaseUrl) {
    console.warn("⚠️ Database URL not found. Using fallback mode.");
    return null;
  }

  try {
    return neon(databaseUrl);
  } catch (error) {
    console.error("❌ Failed to create database client:", error);
    return null;
  }
};

// Export the SQL client (can be null)
export const sql = getSqlClient();

// Test connection function with better error handling
export async function testConnection() {
  if (!sql) {
    console.warn("⚠️ Database not configured. Skipping connection test.");
    return false;
  }

  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log("✅ Database connected successfully:", result[0].current_time);
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Helper function to check if database is available
export const isDatabaseAvailable = () => {
  return sql !== null;
};
