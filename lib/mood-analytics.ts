import { MoodDatabase } from "./mood-database";
import type { MoodEntry, MoodStats } from "../types/mood";

export class MoodAnalytics {
  static async getDailyStats(userId: string, date: string): Promise<MoodStats> {
    const entries = await MoodDatabase.getMoodEntriesForDateRange(
      userId,
      date,
      date
    );
    return this.calculateStats(entries, "day");
  }

  static async getWeeklyStats(
    userId: string,
    startDate: string
  ): Promise<MoodStats> {
    const endDate = this.addDays(startDate, 6);
    const entries = await MoodDatabase.getMoodEntriesForDateRange(
      userId,
      startDate,
      endDate
    );
    return this.calculateStats(entries, "week");
  }

  static async getMonthlyStats(
    userId: string,
    year: number,
    month: number
  ): Promise<MoodStats> {
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    const endDate = `${year}-${month.toString().padStart(2, "0")}-31`;
    const entries = await MoodDatabase.getMoodEntriesForDateRange(
      userId,
      startDate,
      endDate
    );
    return this.calculateStats(entries, "month");
  }

  private static calculateStats(
    entries: MoodEntry[],
    period: "day" | "week" | "month"
  ): MoodStats {
    if (entries.length === 0) {
      return {
        averageMood: 0,
        totalEntries: 0,
        moodDistribution: {},
        streak: 0,
        period,
      };
    }

    const totalMoodValue = entries.reduce(
      (sum, entry) => sum + entry.mood.value,
      0
    );
    const averageMood = totalMoodValue / entries.length;

    const moodDistribution: { [key: string]: number } = {};
    entries.forEach((entry) => {
      moodDistribution[entry.mood.id] =
        (moodDistribution[entry.mood.id] || 0) + 1;
    });

    return {
      averageMood: Math.round(averageMood * 10) / 10,
      totalEntries: entries.length,
      moodDistribution,
      period,
      streak: 0, // Will be calculated separately
    };
  }

  static async calculateStreak(userId: string): Promise<number> {
    return MoodDatabase.getCurrentStreak(userId);
  }

  private static addDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  private static subtractDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  }
}
