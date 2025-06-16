import { getSqlClient, isDatabaseAvailable } from "./neon-client";
import type { MoodEntry, MoodType } from "../types/mood";
import { MOOD_TYPES } from "../types/mood";

export class MoodDatabase {
  private static getSql() {
    const sql = getSqlClient();
    if (!sql) {
      throw new Error(
        "Database not available. Please check your DATABASE_URL configuration."
      );
    }
    return sql;
  }

  // Get all mood types
  static async getMoodTypes(): Promise<MoodType[]> {
    if (!isDatabaseAvailable()) {
      console.warn("Database not available, returning default mood types");
      return MOOD_TYPES;
    }

    try {
      const sql = this.getSql();
      const result = await sql`
        SELECT id, name, emoji, color, value 
        FROM mood_types 
        ORDER BY value ASC
      `;
      return result as MoodType[];
    } catch (error) {
      console.error("Error fetching mood types:", error);
      // Fallback to default types
      return MOOD_TYPES;
    }
  }

  // Save a new mood entry
  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error("Database not available. Cannot save mood entry.");
    }

    try {
      const sql = this.getSql();
      await sql`
        INSERT INTO mood_entries (
          id, user_id, mood_type_id, intensity, note, date, timestamp
        ) VALUES (
          ${entry.id}, 
          ${entry.userId}, 
          ${entry.mood.id}, 
          ${entry.intensity}, 
          ${entry.note || null}, 
          ${entry.date}, 
          ${entry.timestamp}
        )
      `;
    } catch (error) {
      console.error("Error saving mood entry:", error);
      throw error;
    }
  }

  // Update an existing mood entry
  static async updateMoodEntry(
    entryId: string,
    updates: Partial<MoodEntry>
  ): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error("Database not available. Cannot update mood entry.");
    }

    try {
      const sql = this.getSql();
      const setClause = [];
      const values: any[] = [];

      if (updates.mood) {
        setClause.push("mood_type_id = $" + (values.length + 1));
        values.push(updates.mood.id);
      }
      if (updates.intensity !== undefined) {
        setClause.push("intensity = $" + (values.length + 1));
        values.push(updates.intensity);
      }
      if (updates.note !== undefined) {
        setClause.push("note = $" + (values.length + 1));
        values.push(updates.note || null);
      }
      if (updates.timestamp) {
        setClause.push("timestamp = $" + (values.length + 1));
        values.push(updates.timestamp);
      }

      if (setClause.length === 0) return;

      values.push(entryId);

      await sql`
        UPDATE mood_entries 
        SET ${sql.unsafe(setClause.join(", "))}
        WHERE id = ${entryId}
      `;
    } catch (error) {
      console.error("Error updating mood entry:", error);
      throw error;
    }
  }

  // Get all mood entries for a user
  static async getAllMoodEntries(userId: string): Promise<MoodEntry[]> {
    if (!isDatabaseAvailable()) {
      console.warn("Database not available, returning empty mood entries");
      return [];
    }

    try {
      const sql = this.getSql();
      const result = await sql`
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

      return result.map((row) => ({
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
        note: row.note,
        date: row.date,
        timestamp: row.timestamp,
      })) as MoodEntry[];
    } catch (error) {
      console.error("Error fetching mood entries:", error);
      return [];
    }
  }

  // Get mood entries for a date range
  static async getMoodEntriesForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MoodEntry[]> {
    if (!isDatabaseAvailable()) {
      console.warn("Database not available, returning empty mood entries");
      return [];
    }

    try {
      const sql = this.getSql();
      const result = await sql`
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

      return result.map((row) => ({
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
        note: row.note,
        date: row.date,
        timestamp: row.timestamp,
      })) as MoodEntry[];
    } catch (error) {
      console.error("Error fetching mood entries for date range:", error);
      return [];
    }
  }

  // Get mood entry for a specific date
  static async getMoodEntryForDate(
    userId: string,
    date: string
  ): Promise<MoodEntry | null> {
    if (!isDatabaseAvailable()) {
      console.warn("Database not available, returning null for mood entry");
      return null;
    }

    try {
      const sql = this.getSql();
      const result = await sql`
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

      if (result.length === 0) return null;

      const row = result[0];
      return {
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
        note: row.note,
        date: row.date,
        timestamp: row.timestamp,
      } as MoodEntry;
    } catch (error) {
      console.error("Error fetching mood entry for date:", error);
      return null;
    }
  }

  // Delete a mood entry
  static async deleteMoodEntry(entryId: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error("Database not available. Cannot delete mood entry.");
    }

    try {
      const sql = this.getSql();
      await sql`DELETE FROM mood_entries WHERE id = ${entryId}`;
    } catch (error) {
      console.error("Error deleting mood entry:", error);
      throw error;
    }
  }

  // Get mood statistics for analytics
  static async getMoodStats(
    userId: string,
    startDate?: string,
    endDate?: string
  ) {
    if (!isDatabaseAvailable()) {
      console.warn("Database not available, returning empty stats");
      return [];
    }

    try {
      const sql = this.getSql();
      let query = sql`
        SELECT 
          COUNT(*) as total_entries,
          AVG(mt.value) as average_mood,
          mt.id as mood_type_id,
          mt.name as mood_name,
          COUNT(*) as mood_count
        FROM mood_entries me
        JOIN mood_types mt ON me.mood_type_id = mt.id
        WHERE me.user_id = ${userId}
      `;

      if (startDate && endDate) {
        query = sql`
          SELECT 
            COUNT(*) as total_entries,
            AVG(mt.value) as average_mood,
            mt.id as mood_type_id,
            mt.name as mood_name,
            COUNT(*) as mood_count
          FROM mood_entries me
          JOIN mood_types mt ON me.mood_type_id = mt.id
          WHERE me.user_id = ${userId}
            AND me.date >= ${startDate}
            AND me.date <= ${endDate}
          GROUP BY mt.id, mt.name
        `;
      } else {
        query = sql`
          SELECT 
            COUNT(*) as total_entries,
            AVG(mt.value) as average_mood,
            mt.id as mood_type_id,
            mt.name as mood_name,
            COUNT(*) as mood_count
          FROM mood_entries me
          JOIN mood_types mt ON me.mood_type_id = mt.id
          WHERE me.user_id = ${userId}
          GROUP BY mt.id, mt.name
        `;
      }

      const result = await query;
      return result;
    } catch (error) {
      console.error("Error fetching mood stats:", error);
      return [];
    }
  }

  // Calculate current streak
  static async getCurrentStreak(userId: string): Promise<number> {
    if (!isDatabaseAvailable()) {
      console.warn("Database not available, returning 0 for streak");
      return 0;
    }

    try {
      const sql = this.getSql();
      const result = await sql`
        WITH daily_entries AS (
          SELECT DISTINCT date
          FROM mood_entries
          WHERE user_id = ${userId}
          ORDER BY date DESC
        ),
        consecutive_days AS (
          SELECT 
            date,
            date - (ROW_NUMBER() OVER (ORDER BY date DESC))::integer AS group_id
          FROM daily_entries
        )
        SELECT COUNT(*) as streak
        FROM consecutive_days
        WHERE group_id = (
          SELECT group_id 
          FROM consecutive_days 
          ORDER BY date DESC 
          LIMIT 1
        )
      `;

      return result[0]?.streak || 0;
    } catch (error) {
      console.error("Error calculating streak:", error);
      return 0;
    }
  }
}
