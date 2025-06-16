import { MoodDatabase } from "./mood-database";
import type { MoodEntry } from "../types/mood";

// Updated MoodStorage class to use Neon database
export class MoodStorage {
  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    return MoodDatabase.saveMoodEntry(entry);
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
    return MoodDatabase.getMoodEntryForDate(userId, date);
  }

  static async updateMoodEntry(
    entryId: string,
    updates: Partial<MoodEntry>
  ): Promise<void> {
    return MoodDatabase.updateMoodEntry(entryId, updates);
  }

  static async deleteMoodEntry(entryId: string): Promise<void> {
    return MoodDatabase.deleteMoodEntry(entryId);
  }
}
