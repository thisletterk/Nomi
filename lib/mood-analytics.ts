import type { MoodEntry, MoodStats } from "../types/mood";
import { MoodStorage } from "./mood-storage";

export class MoodAnalytics {
  static async getDailyStats(date: string): Promise<MoodStats> {
    const entries = await MoodStorage.getMoodEntriesForDateRange(date, date);
    return await this.calculateStats(entries, "day");
  }

  static async getWeeklyStats(startDate: string): Promise<MoodStats> {
    const endDate = this.addDays(startDate, 6);
    const entries = await MoodStorage.getMoodEntriesForDateRange(
      startDate,
      endDate
    );
    return await this.calculateStats(entries, "week");
  }

  static async getMonthlyStats(
    year: number,
    month: number
  ): Promise<MoodStats> {
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    const endDate = `${year}-${month.toString().padStart(2, "0")}-31`;
    const entries = await MoodStorage.getMoodEntriesForDateRange(
      startDate,
      endDate
    );
    return await this.calculateStats(entries, "month");
  }

  private static async calculateStats(
    entries: MoodEntry[],
    period: "day" | "week" | "month"
  ): Promise<MoodStats> {
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
      streak: await this.calculateStreak(),
    };
  }

  private static async calculateStreak(): Promise<number> {
    const allEntries = await MoodStorage.getAllMoodEntries();
    if (allEntries.length === 0) return 0;

    const sortedEntries = allEntries.sort((a, b) => b.timestamp - a.timestamp);
    const uniqueDates = [...new Set(sortedEntries.map((entry) => entry.date))];

    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let currentDate = today;

    for (const date of uniqueDates) {
      if (date === currentDate) {
        streak++;
        currentDate = this.subtractDays(currentDate, 1);
      } else {
        break;
      }
    }

    return streak;
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
