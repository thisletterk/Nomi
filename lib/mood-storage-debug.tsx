import { MoodDatabase } from "./mood-database-debug";
import type { MoodEntry } from "../types/mood";

// Debug version of MoodStorage class
export class MoodStorage {
  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    console.log("🏪 MOOD STORAGE: saveMoodEntry called");
    console.log("📦 Entry to save:", entry);

    // Check if this is actually calling save or update
    console.trace("📍 Call stack trace - where is this being called from?");

    return MoodDatabase.saveMoodEntry(entry);
  }

  static async getAllMoodEntries(userId: string): Promise<MoodEntry[]> {
    console.log("🏪 MOOD STORAGE: getAllMoodEntries called for user:", userId);
    return MoodDatabase.getAllMoodEntries(userId);
  }

  static async getMoodEntriesForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MoodEntry[]> {
    console.log("🏪 MOOD STORAGE: getMoodEntriesForDateRange called");
    return MoodDatabase.getMoodEntriesForDateRange(userId, startDate, endDate);
  }

  static async getMoodEntryForDate(
    userId: string,
    date: string
  ): Promise<MoodEntry | null> {
    console.log("🏪 MOOD STORAGE: getMoodEntryForDate called for:", {
      userId,
      date,
    });
    const result = await MoodDatabase.getMoodEntryForDate(userId, date);
    console.log(
      "🏪 MOOD STORAGE: getMoodEntryForDate result:",
      result ? "found entry" : "no entry found"
    );
    return result;
  }

  static async updateMoodEntry(
    entryId: string,
    updates: Partial<MoodEntry>
  ): Promise<void> {
    console.log(
      "🏪 MOOD STORAGE: updateMoodEntry called - THIS SHOULD NOT BE CALLED FOR NEW ENTRIES!"
    );
    console.log("📝 Update details:", { entryId, updates });
    console.trace(
      "📍 Call stack trace - where is this update being called from?"
    );

    return MoodDatabase.updateMoodEntry(entryId, updates);
  }

  static async deleteMoodEntry(entryId: string): Promise<void> {
    console.log("🏪 MOOD STORAGE: deleteMoodEntry called for:", entryId);
    return MoodDatabase.deleteMoodEntry(entryId);
  }
}
