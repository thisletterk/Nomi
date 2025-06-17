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

  // Generate a unique ID for mood entries to prevent overwrites
  private static generateUniqueId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const uniqueId = `mood_${userId}_${timestamp}_${random}`;
    console.log("🆔 Generated unique ID:", uniqueId);
    return uniqueId;
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
      return MOOD_TYPES;
    }
  }

  // Save a new mood entry - ALWAYS creates a new record
  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    console.log(
      "🔥 SAVE MOOD ENTRY CALLED - This should ALWAYS create a NEW record"
    );
    console.log("📝 Original entry data:", {
      id: entry.id,
      userId: entry.userId,
      mood: entry.mood.name,
      intensity: entry.intensity,
      note: entry.note,
      date: entry.date,
    });

    if (!isDatabaseAvailable()) {
      throw new Error("Database not available. Cannot save mood entry.");
    }

    // ALWAYS generate a new unique ID - ignore the passed ID
    const uniqueId = this.generateUniqueId(entry.userId);

    try {
      const sql = this.getSql();

      // Check if there are any existing entries for this user today
      const existingEntries = await sql`
        SELECT id, note, mood_type_id, intensity 
        FROM mood_entries 
        WHERE user_id = ${entry.userId} AND date = ${entry.date}
      `;

      console.log(
        `📊 Found ${existingEntries.length} existing entries for ${entry.date}:`,
        existingEntries
      );

      // Validate intensity
      if (entry.intensity < 1 || entry.intensity > 5) {
        throw new Error(
          `Invalid intensity: ${entry.intensity}. Must be between 1 and 5.`
        );
      }

      console.log("🚀 Inserting NEW mood entry with unique ID:", uniqueId);

      // Insert with the unique ID - this should create a new record
      const result = await sql`
        INSERT INTO mood_entries (
          id, user_id, mood_type_id, intensity, note, date, timestamp
        ) VALUES (
          ${uniqueId}, 
          ${entry.userId}, 
          ${entry.mood.id}, 
          ${entry.intensity}, 
          ${entry.note || null}, 
          ${entry.date}, 
          ${entry.timestamp}
        )
        RETURNING id, created_at
      `;

      console.log("✅ NEW mood entry created successfully:", result[0]);

      // Verify the entry was actually created
      const verifyEntries = await sql`
        SELECT COUNT(*) as count 
        FROM mood_entries 
        WHERE user_id = ${entry.userId} AND date = ${entry.date}
      `;

      console.log(
        `📈 Total entries for ${entry.date} after insert:`,
        verifyEntries[0].count
      );
    } catch (error) {
      console.error("❌ Error saving mood entry:", error);
      throw error;
    }
  }

  // Update an existing mood entry - should only be called for actual updates
  static async updateMoodEntry(
    entryId: string,
    updates: Partial<MoodEntry>
  ): Promise<void> {
    console.log(
      "🔄 UPDATE MOOD ENTRY CALLED - This modifies an existing record"
    );
    console.log("📝 Update data:", { entryId, updates });

    if (!isDatabaseAvailable()) {
      throw new Error("Database not available. Cannot update mood entry.");
    }

    try {
      const sql = this.getSql();

      // Check if the entry exists
      const existingEntry = await sql`
        SELECT * FROM mood_entries WHERE id = ${entryId}
      `;

      if (existingEntry.length === 0) {
        throw new Error(`Mood entry with ID ${entryId} not found`);
      }

      console.log("📋 Existing entry before update:", existingEntry[0]);

      // Update mood type if provided
      if (updates.mood) {
        await sql`
          UPDATE mood_entries 
          SET mood_type_id = ${updates.mood.id}
          WHERE id = ${entryId}
        `;
        console.log("✅ Updated mood type to:", updates.mood.name);
      }

      // Update intensity if provided
      if (updates.intensity !== undefined) {
        if (updates.intensity < 1 || updates.intensity > 5) {
          throw new Error(`Invalid intensity: ${updates.intensity}`);
        }
        await sql`
          UPDATE mood_entries 
          SET intensity = ${updates.intensity}
          WHERE id = ${entryId}
        `;
        console.log("✅ Updated intensity to:", updates.intensity);
      }

      // Update note if provided
      if (updates.note !== undefined) {
        await sql`
          UPDATE mood_entries 
          SET note = ${updates.note || null}
          WHERE id = ${entryId}
        `;
        console.log("✅ Updated note to:", updates.note);
      }

      console.log("✅ Mood entry updated successfully:", entryId);
    } catch (error) {
      console.error("❌ Error updating mood entry:", error);
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
          me.created_at,
          mt.id as mood_id,
          mt.name as mood_name,
          mt.emoji as mood_emoji,
          mt.color as mood_color,
          mt.value as mood_value
        FROM mood_entries me
        JOIN mood_types mt ON me.mood_type_id = mt.id
        WHERE me.user_id = ${userId}
        ORDER BY me.created_at DESC, me.timestamp DESC
      `;

      console.log(
        `📊 Retrieved ${result.length} mood entries for user ${userId}`
      );

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

  // Get mood entry for a specific date (returns the most recent one)
  static async getMoodEntryForDate(
    userId: string,
    date: string
  ): Promise<MoodEntry | null> {
    console.log(`🔍 GET MOOD ENTRY FOR DATE CALLED - ${userId} on ${date}`);

    if (!isDatabaseAvailable()) {
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

      console.log(
        `📊 Found ${result.length} entries for ${date}:`,
        result.length > 0 ? result[0] : "none"
      );

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
      const result =
        await sql`DELETE FROM mood_entries WHERE id = ${entryId} RETURNING id`;

      if (result.length === 0) {
        throw new Error("Mood entry not found");
      }

      console.log("✅ Mood entry deleted successfully:", entryId);
    } catch (error) {
      console.error("Error deleting mood entry:", error);
      throw error;
    }
  }
}
