import { neon } from "@neondatabase/serverless";
import { type MoodEntry, type MoodType, MOOD_TYPES } from "../types/mood";

// Initialize Neon database connection
const sql = neon(process.env.EXPO_PUBLIC_DATABASE_URL!);

export class MoodDatabase {
  static async initializeDatabase(): Promise<void> {
    try {
      console.log("🔧 Initializing mood database (Neon PostgreSQL)...");

      // Test connection
      const result = await sql`SELECT 1 as test`;
      console.log("✅ Database connection successful:", result);

      console.log("✅ Mood database initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing mood database:", error);
      throw error;
    }
  }

  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    try {
      console.log("💾 Saving mood entry to database:", entry.id);

      await sql`
        INSERT INTO mood_entries (
          id, 
          user_id, 
          mood_type_id, 
          intensity, 
          note, 
          date, 
          timestamp
        ) VALUES (
          ${entry.id},
          ${entry.userId},
          ${entry.mood.id},
          ${entry.intensity},
          ${entry.note || ""},
          ${entry.date},
          ${entry.timestamp}
        )
        ON CONFLICT (id) DO UPDATE SET
          mood_type_id = EXCLUDED.mood_type_id,
          intensity = EXCLUDED.intensity,
          note = EXCLUDED.note,
          updated_at = NOW()
      `;

      console.log("✅ Mood entry saved to database successfully");
    } catch (error) {
      console.error("❌ Error saving mood entry to database:", error);
      throw error;
    }
  }

  static async getAllMoodEntries(userId: string): Promise<MoodEntry[]> {
    try {
      console.log(`📖 Getting all mood entries for user: ${userId}`);

      const rows = await sql`
        SELECT 
          me.id,
          me.user_id,
          me.intensity,
          me.note,
          me.date,
          me.timestamp,
          mt.id as mood_id,
          mt.name as mood_name,
          mt.emoji as mood_emoji,
          mt.color as mood_color,
          mt.value as mood_value
        FROM mood_entries me
        JOIN mood_types mt ON me.mood_type_id = mt.id
        WHERE me.user_id = ${userId}
        ORDER BY me.timestamp DESC
      `;

      const entries: MoodEntry[] = rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        mood: {
          id: row.mood_id,
          name: row.mood_name,
          emoji: row.mood_emoji,
          color: row.mood_color,
          value: row.mood_value,
        },
        intensity: row.intensity,
        note: row.note || "",
        date: row.date,
        timestamp: Number(row.timestamp),
      }));

      console.log(`📊 Retrieved ${entries.length} mood entries from database`);
      return entries;
    } catch (error) {
      console.error("❌ Error getting mood entries from database:", error);
      return [];
    }
  }

  static async getMoodEntryForDate(
    userId: string,
    date: string
  ): Promise<MoodEntry | null> {
    try {
      console.log(`📅 Getting mood entry for user ${userId} on ${date}`);

      const rows = await sql`
        SELECT 
          me.id,
          me.user_id,
          me.intensity,
          me.note,
          me.date,
          me.timestamp,
          mt.id as mood_id,
          mt.name as mood_name,
          mt.emoji as mood_emoji,
          mt.color as mood_color,
          mt.value as mood_value
        FROM mood_entries me
        JOIN mood_types mt ON me.mood_type_id = mt.id
        WHERE me.user_id = ${userId} AND me.date = ${date}
        ORDER BY me.timestamp DESC
        LIMIT 1
      `;

      if (rows.length === 0) {
        console.log(`📅 No mood entry found for ${date}`);
        return null;
      }

      const row = rows[0];
      const entry: MoodEntry = {
        id: row.id,
        userId: row.user_id,
        mood: {
          id: row.mood_id,
          name: row.mood_name,
          emoji: row.mood_emoji,
          color: row.mood_color,
          value: row.mood_value,
        },
        intensity: row.intensity,
        note: row.note || "",
        date: row.date,
        timestamp: Number(row.timestamp),
      };

      console.log(`📅 Found mood entry for ${date}:`, entry.mood.name);
      return entry;
    } catch (error) {
      console.error("❌ Error getting mood entry for date:", error);
      return null;
    }
  }

  static async getMoodEntriesForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MoodEntry[]> {
    try {
      console.log(
        `📊 Getting mood entries for ${userId} from ${startDate} to ${endDate}`
      );

      const rows = await sql`
        SELECT 
          me.id,
          me.user_id,
          me.intensity,
          me.note,
          me.date,
          me.timestamp,
          mt.id as mood_id,
          mt.name as mood_name,
          mt.emoji as mood_emoji,
          mt.color as mood_color,
          mt.value as mood_value
        FROM mood_entries me
        JOIN mood_types mt ON me.mood_type_id = mt.id
        WHERE me.user_id = ${userId} 
          AND me.date >= ${startDate} 
          AND me.date <= ${endDate}
        ORDER BY me.timestamp DESC
      `;

      const entries: MoodEntry[] = rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        mood: {
          id: row.mood_id,
          name: row.mood_name,
          emoji: row.mood_emoji,
          color: row.mood_color,
          value: row.mood_value,
        },
        intensity: row.intensity,
        note: row.note || "",
        date: row.date,
        timestamp: Number(row.timestamp),
      }));

      console.log(`📊 Retrieved ${entries.length} entries for date range`);
      return entries;
    } catch (error) {
      console.error("❌ Error getting mood entries for date range:", error);
      return [];
    }
  }

  static async getCurrentStreak(userId: string): Promise<number> {
    try {
      console.log(`🔥 Calculating streak for user: ${userId}`);

      // Get unique dates with mood entries, ordered by date descending
      const rows = await sql`
        SELECT DISTINCT date
        FROM mood_entries
        WHERE user_id = ${userId}
        ORDER BY date DESC
      `;

      if (rows.length === 0) {
        return 0;
      }

      let streak = 0;
      const today = new Date();
      const currentDate = new Date(today);

      // Check each day backwards from today
      for (const row of rows) {
        const currentDateStr = currentDate.toISOString().split("T")[0];
        const entryDate = row.date;

        if (currentDateStr === entryDate) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      console.log(`🔥 Calculated streak: ${streak} days`);
      return streak;
    } catch (error) {
      console.error("❌ Error calculating streak:", error);
      return 0;
    }
  }

  static async getMoodTypes(): Promise<MoodType[]> {
    try {
      console.log("📝 Getting mood types from database...");

      const rows = await sql`
        SELECT id, name, emoji, color, value
        FROM mood_types
        ORDER BY value ASC
      `;

      const moodTypes: MoodType[] = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        emoji: row.emoji,
        color: row.color,
        value: row.value,
      }));

      console.log(`📝 Retrieved ${moodTypes.length} mood types from database`);
      return moodTypes;
    } catch (error) {
      console.error("❌ Error getting mood types from database:", error);
      return MOOD_TYPES; // Fallback to static types
    }
  }

  // Debug method
  static async debugDatabase(userId: string): Promise<void> {
    try {
      console.log("🔍 === DATABASE DEBUG ===");

      // Test connection
      const connectionTest = await sql`SELECT NOW() as current_time`;
      console.log("🔍 Database connection:", connectionTest[0]);

      // Get mood types
      const moodTypes = await sql`SELECT * FROM mood_types ORDER BY value`;
      console.log("🔍 Available mood types:", moodTypes);

      // Get user entries
      const userEntries = await sql`
        SELECT 
          me.*,
          mt.name as mood_name
        FROM mood_entries me
        JOIN mood_types mt ON me.mood_type_id = mt.id
        WHERE me.user_id = ${userId}
        ORDER BY me.timestamp DESC
        LIMIT 5
      `;
      console.log("🔍 Recent user entries:", userEntries);

      // Get entry count
      const countResult = await sql`
        SELECT COUNT(*) as total
        FROM mood_entries
        WHERE user_id = ${userId}
      `;
      console.log("🔍 Total entries for user:", countResult[0].total);

      console.log("🔍 === END DATABASE DEBUG ===");
    } catch (error) {
      console.error("❌ Database debug error:", error);
    }
  }

  // Clear all data for user (for testing)
  static async clearUserData(userId: string): Promise<void> {
    try {
      const result = await sql`
        DELETE FROM mood_entries 
        WHERE user_id = ${userId}
      `;
      console.log("🧹 Cleared mood data for user:", userId);
    } catch (error) {
      console.error("❌ Error clearing user data:", error);
    }
  }
}
