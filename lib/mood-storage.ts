import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MoodEntry } from "../types/mood";

const MOOD_STORAGE_KEY = "nomi_mood_entries";

export class MoodStorage {
  static async saveMoodEntry(entry: MoodEntry): Promise<void> {
    try {
      const existingEntries = await this.getAllMoodEntries();
      const updatedEntries = [...existingEntries, entry];
      await AsyncStorage.setItem(
        MOOD_STORAGE_KEY,
        JSON.stringify(updatedEntries)
      );
    } catch (error) {
      console.error("Error saving mood entry:", error);
      throw error;
    }
  }

  static async getAllMoodEntries(): Promise<MoodEntry[]> {
    try {
      const entries = await AsyncStorage.getItem(MOOD_STORAGE_KEY);
      return entries ? JSON.parse(entries) : [];
    } catch (error) {
      console.error("Error getting mood entries:", error);
      return [];
    }
  }

  static async getMoodEntriesForDateRange(
    startDate: string,
    endDate: string
  ): Promise<MoodEntry[]> {
    try {
      const allEntries = await this.getAllMoodEntries();
      return allEntries
        .filter((entry) => entry.date >= startDate && entry.date <= endDate)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error getting mood entries for date range:", error);
      return [];
    }
  }

  static async getMoodEntryForDate(date: string): Promise<MoodEntry | null> {
    try {
      const allEntries = await this.getAllMoodEntries();
      return allEntries.find((entry) => entry.date === date) || null;
    } catch (error) {
      console.error("Error getting mood entry for date:", error);
      return null;
    }
  }

  static async updateMoodEntry(
    entryId: string,
    updates: Partial<MoodEntry>
  ): Promise<void> {
    try {
      const allEntries = await this.getAllMoodEntries();
      const updatedEntries = allEntries.map((entry) =>
        entry.id === entryId ? { ...entry, ...updates } : entry
      );
      await AsyncStorage.setItem(
        MOOD_STORAGE_KEY,
        JSON.stringify(updatedEntries)
      );
    } catch (error) {
      console.error("Error updating mood entry:", error);
      throw error;
    }
  }

  static async deleteMoodEntry(entryId: string): Promise<void> {
    try {
      const allEntries = await this.getAllMoodEntries();
      const filteredEntries = allEntries.filter(
        (entry) => entry.id !== entryId
      );
      await AsyncStorage.setItem(
        MOOD_STORAGE_KEY,
        JSON.stringify(filteredEntries)
      );
    } catch (error) {
      console.error("Error deleting mood entry:", error);
      throw error;
    }
  }
}
