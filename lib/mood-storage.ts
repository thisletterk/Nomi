import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MoodEntry } from "../types/mood";

export class MoodStorage {
  private static STORAGE_KEY = "mood_entries_v2"; // Changed key to avoid conflicts

  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    try {
      console.log("🔄 Saving mood entry:", entry);

      const existingEntries = await this.getAllMoodEntries();

      // Always add as new entry - never update existing ones
      const updatedEntries = [...existingEntries, entry];

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedEntries)
      );

      console.log("✅ Mood entry saved successfully");
      console.log("📊 Total entries now:", updatedEntries.length);

      // Verify the save worked
      const verification = await this.getAllMoodEntries();
      console.log("🔍 Verification - entries in storage:", verification.length);
    } catch (error) {
      console.error("❌ Error saving mood entry:", error);
      throw error;
    }
  }

  static async getAllMoodEntries(): Promise<MoodEntry[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      const entries = data ? JSON.parse(data) : [];
      console.log("📖 Retrieved entries from storage:", entries.length);
      return entries;
    } catch (error) {
      console.error("❌ Error getting mood entries:", error);
      return [];
    }
  }

  static async getMoodEntriesForUser(userId: string): Promise<MoodEntry[]> {
    try {
      const allEntries = await this.getAllMoodEntries();
      const userEntries = allEntries.filter((entry) => entry.userId === userId);
      console.log(`📊 User ${userId} has ${userEntries.length} mood entries`);
      return userEntries;
    } catch (error) {
      console.error("❌ Error getting user mood entries:", error);
      return [];
    }
  }

  static async getMoodEntryForDate(
    userId: string,
    date: string
  ): Promise<MoodEntry | null> {
    try {
      const userEntries = await this.getMoodEntriesForUser(userId);
      // Get the most recent entry for the date
      const dateEntries = userEntries.filter((entry) => entry.date === date);
      const result =
        dateEntries.length > 0 ? dateEntries[dateEntries.length - 1] : null;
      console.log(`📅 Entry for ${date}:`, result ? "Found" : "Not found");
      return result;
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
      const userEntries = await this.getMoodEntriesForUser(userId);
      const rangeEntries = userEntries
        .filter((entry) => {
          return entry.date >= startDate && entry.date <= endDate;
        })
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      console.log(
        `📊 Date range ${startDate} to ${endDate}: ${rangeEntries.length} entries`
      );
      return rangeEntries;
    } catch (error) {
      console.error("❌ Error getting mood entries for date range:", error);
      return [];
    }
  }

  static async getRecentMoodEntries(
    userId: string,
    limit = 5
  ): Promise<MoodEntry[]> {
    try {
      const userEntries = await this.getMoodEntriesForUser(userId);
      const recent = userEntries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      console.log(`🕒 Recent ${limit} entries for user:`, recent.length);
      return recent;
    } catch (error) {
      console.error("❌ Error getting recent mood entries:", error);
      return [];
    }
  }

  static async deleteMoodEntry(entryId: string): Promise<void> {
    try {
      const allEntries = await this.getAllMoodEntries();
      const updatedEntries = allEntries.filter((entry) => entry.id !== entryId);
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedEntries)
      );
      console.log("🗑️ Mood entry deleted:", entryId);
    } catch (error) {
      console.error("❌ Error deleting mood entry:", error);
      throw error;
    }
  }

  static async clearAllEntries(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log("🧹 All mood entries cleared");
    } catch (error) {
      console.error("❌ Error clearing mood entries:", error);
      throw error;
    }
  }

  // Debug method to inspect storage
  static async debugStorage(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("🔍 All AsyncStorage keys:", allKeys);

      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      console.log("🔍 Raw mood data:", data);

      const entries = await this.getAllMoodEntries();
      console.log("🔍 Parsed entries:", entries);
    } catch (error) {
      console.error("❌ Debug storage error:", error);
    }
  }
}
