import { MoodDatabase } from "./mood-database";
import type { MoodEntry } from "../types/mood";

// Fixed MoodStorage class that ALWAYS creates new entries
export class MoodStorage {
  // ALWAYS save as new entry - never update existing ones
  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    console.log("🏪 MOOD STORAGE: Always saving as NEW entry");

    // Generate a guaranteed unique ID
    const uniqueId = `mood_${entry.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const entryWithUniqueId = { ...entry, id: uniqueId };

    // Always create a new entry
    return MoodDatabase.saveMoodEntry(entryWithUniqueId);
  }

  static async getAllMoodEntries(userId: string): Promise<MoodEntry[]> {
    return MoodDatabase.getAllMoodEntries(userId);
  }

  static async getMoodEntriesForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MoodEntry[]> {
    return MoodDatabase.getMoodEntriesForDateRange(userId, startDate, endDate);
  }

  static async getMoodEntryForDate(
    userId: string,
    date: string
  ): Promise<MoodEntry | null> {
    // Still return the entry for display purposes
    return MoodDatabase.getMoodEntryForDate(userId, date);
  }

  // Redirect update calls to create new entries instead
  static async updateMoodEntry(
    entryId: string,
    updates: Partial<MoodEntry>
  ): Promise<void> {
    console.log(
      "🔄 MOOD STORAGE: updateMoodEntry redirected to create new entry"
    );

    if (!updates.userId) {
      throw new Error("userId is required to create a new entry");
    }

    // Get the existing entry to merge with updates
    const allEntries = await MoodDatabase.getAllMoodEntries(updates.userId);
    const existingEntry = allEntries.find((entry) => entry.id === entryId);

    if (!existingEntry) {
      throw new Error(`Entry with ID ${entryId} not found`);
    }

    // Create a new entry with merged data
    const newEntry: MoodEntry = {
      ...existingEntry,
      ...updates,
      id: `mood_${updates.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now(),
    };

    console.log("🆕 Creating new entry instead of updating:", newEntry);
    return MoodDatabase.saveMoodEntry(newEntry);
  }

  static async deleteMoodEntry(entryId: string): Promise<void> {
    return MoodDatabase.deleteMoodEntry(entryId);
  }
}
