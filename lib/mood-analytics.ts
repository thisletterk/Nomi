import { type MoodEntry, type MoodStats, MOOD_TYPES } from "../types/mood";
import { MoodDatabase } from "./mood-database";

export class MoodAnalytics {
  static async getDailyStats(userId: string, date: string): Promise<MoodStats> {
    try {
      console.log(`📊 Getting daily stats for ${userId} on ${date}`);
      const entries = await MoodDatabase.getMoodEntriesForDateRange(
        userId,
        date,
        date
      );
      const stats = this.calculateStats(entries, "day");
      console.log("📊 Daily stats calculated:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error getting daily stats:", error);
      return this.getEmptyStats("day");
    }
  }

  static async getWeeklyStats(
    userId: string,
    weekStartDate: string
  ): Promise<MoodStats> {
    try {
      console.log(
        `📊 Getting weekly stats for ${userId} starting ${weekStartDate}`
      );
      const weekEnd = new Date(weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const entries = await MoodDatabase.getMoodEntriesForDateRange(
        userId,
        weekStartDate,
        weekEndStr
      );
      const stats = this.calculateStats(entries, "week");
      console.log("📊 Weekly stats calculated:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error getting weekly stats:", error);
      return this.getEmptyStats("week");
    }
  }

  static async getMonthlyStats(
    userId: string,
    year: number,
    month: number
  ): Promise<MoodStats> {
    try {
      console.log(`📊 Getting monthly stats for ${userId} - ${year}/${month}`);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      console.log(`📅 Month range: ${startDateStr} to ${endDateStr}`);
      const entries = await MoodDatabase.getMoodEntriesForDateRange(
        userId,
        startDateStr,
        endDateStr
      );
      const stats = this.calculateStats(entries, "month");
      console.log("📊 Monthly stats calculated:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error getting monthly stats:", error);
      return this.getEmptyStats("month");
    }
  }

  private static calculateStats(
    entries: MoodEntry[],
    period: "day" | "week" | "month"
  ): MoodStats {
    console.log(`🧮 Calculating stats for ${entries.length} entries`);
    console.log("🧮 Sample entries:", entries.slice(0, 2));

    if (entries.length === 0) {
      console.log("📊 No entries found, returning empty stats");
      return this.getEmptyStats(period);
    }

    // Calculate average mood using mood values
    const totalMoodValue = entries.reduce((sum, entry) => {
      console.log(
        `🧮 Entry mood: ${entry.mood.name} (value: ${entry.mood.value})`
      );
      return sum + entry.mood.value;
    }, 0);
    const averageMood = totalMoodValue / entries.length;

    // Calculate mood distribution - count by mood type ID
    const moodDistribution: Record<string, number> = {};

    // Initialize all mood types to 0 using the correct IDs from database
    MOOD_TYPES.forEach((mood) => {
      moodDistribution[mood.id] = 0;
    });

    // Count actual entries
    entries.forEach((entry) => {
      const moodId = entry.mood.id;
      console.log(`🧮 Counting mood: ${moodId} (${entry.mood.name})`);

      if (moodDistribution.hasOwnProperty(moodId)) {
        moodDistribution[moodId]++;
      } else {
        // If mood ID doesn't exist in our types, still count it
        moodDistribution[moodId] = (moodDistribution[moodId] || 0) + 1;
      }
    });

    console.log("📊 Final mood distribution:", moodDistribution);
    console.log("📊 Average mood:", averageMood);

    return {
      totalEntries: entries.length,
      averageMood,
      moodDistribution,
      streak: 0, // Will be calculated separately
      period,
    };
  }

  private static getEmptyStats(period: "day" | "week" | "month"): MoodStats {
    const moodDistribution: Record<string, number> = {};
    MOOD_TYPES.forEach((mood) => {
      moodDistribution[mood.id] = 0;
    });

    return {
      totalEntries: 0,
      averageMood: 0,
      moodDistribution,
      streak: 0,
      period,
    };
  }

  static async calculateStreak(userId: string): Promise<number> {
    try {
      console.log(`🔥 Calculating streak for ${userId}`);
      const streak = await MoodDatabase.getCurrentStreak(userId);
      console.log(`🔥 Calculated streak: ${streak} days`);
      return streak;
    } catch (error) {
      console.error("❌ Error calculating streak:", error);
      return 0;
    }
  }

  // Enhanced mood context with emotional intelligence
  static async getDetailedMoodContext(userId: string): Promise<string> {
    try {
      console.log(`🧠 Getting detailed mood context for ${userId}`);
      const allEntries = await MoodDatabase.getAllMoodEntries(userId);

      if (allEntries.length === 0) {
        return "No mood history available yet. This is a great time to start tracking your emotional journey!";
      }

      // Get recent entries (last 7 days)
      const recentEntries = allEntries.slice(0, 10);
      const last7Days = allEntries.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      });

      // Analyze patterns
      const analysis = this.analyzeMoodPatterns(recentEntries, last7Days);

      console.log(
        "🧠 Detailed mood context generated:",
        analysis.substring(0, 200) + "..."
      );
      return analysis;
    } catch (error) {
      console.error("❌ Error getting detailed mood context:", error);
      return "I'm having trouble accessing your mood history right now, but I'm here to listen and support you.";
    }
  }

  private static analyzeMoodPatterns(
    recentEntries: MoodEntry[],
    last7Days: MoodEntry[]
  ): string {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Today's mood
    const todaysMood = recentEntries.find((entry) => entry.date === today);
    const yesterdaysMood = recentEntries.find(
      (entry) => entry.date === yesterdayStr
    );

    // Weekly trends
    const weeklyAverage =
      last7Days.length > 0
        ? last7Days.reduce((sum, entry) => sum + entry.mood.value, 0) /
          last7Days.length
        : 0;

    // Mood frequency in last 7 days
    const moodCounts: Record<string, number> = {};
    last7Days.forEach((entry) => {
      moodCounts[entry.mood.id] = (moodCounts[entry.mood.id] || 0) + 1;
    });

    const dominantMood = Object.entries(moodCounts).reduce((a, b) =>
      moodCounts[a[0]] > moodCounts[b[0]] ? a : b
    )?.[0];

    const dominantMoodType = MOOD_TYPES.find((m) => m.id === dominantMood);

    // Recent notes analysis
    const recentNotes = recentEntries
      .filter((entry) => entry.note && entry.note.trim().length > 0)
      .slice(0, 3)
      .map((entry) => `"${entry.note}" (${entry.mood.name})`);

    // Build contextual analysis
    let context = "EMOTIONAL CONTEXT:\n";

    // Current state
    if (todaysMood) {
      context += `Today: ${todaysMood.mood.emoji} ${todaysMood.mood.name} (intensity: ${todaysMood.intensity}/5)`;
      if (todaysMood.note) {
        context += ` - "${todaysMood.note}"`;
      }
      context += "\n";
    }

    if (yesterdaysMood && todaysMood) {
      const change = todaysMood.mood.value - yesterdaysMood.mood.value;
      if (change > 0) {
        context += `Mood improved from yesterday (${yesterdaysMood.mood.name} → ${todaysMood.mood.name})\n`;
      } else if (change < 0) {
        context += `Mood declined from yesterday (${yesterdaysMood.mood.name} → ${todaysMood.mood.name})\n`;
      } else {
        context += `Mood stable from yesterday (${todaysMood.mood.name})\n`;
      }
    }

    // Weekly patterns
    if (last7Days.length > 0) {
      context += `\nWEEKLY PATTERN (${last7Days.length} entries):\n`;
      context += `Average mood: ${weeklyAverage.toFixed(1)}/5 `;

      if (weeklyAverage >= 4) {
        context += "(Generally positive week)\n";
      } else if (weeklyAverage <= 2) {
        context += "(Challenging week)\n";
      } else {
        context += "(Mixed week)\n";
      }

      if (dominantMoodType) {
        context += `Most frequent: ${dominantMoodType.emoji} ${dominantMoodType.name} (${moodCounts[dominantMood]} times)\n`;
      }
    }

    // Recent thoughts/notes
    if (recentNotes.length > 0) {
      context += `\nRECENT THOUGHTS:\n`;
      recentNotes.forEach((note) => {
        context += `- ${note}\n`;
      });
    }

    // Emotional insights
    context += `\nEMOTIONAL INSIGHTS:\n`;

    if (weeklyAverage >= 4) {
      context += "- User has been in a positive emotional state\n";
      context += "- Good time to explore goals and growth\n";
    } else if (weeklyAverage <= 2) {
      context += "- User may be going through a difficult period\n";
      context += "- Needs extra support and validation\n";
      context += "- Focus on coping strategies and self-care\n";
    } else {
      context += "- User experiencing normal emotional fluctuations\n";
      context += "- Good balance of support and encouragement\n";
    }

    // Streak information
    const streak = last7Days.length;
    if (streak >= 7) {
      context += `- Excellent mood tracking consistency (${streak} days)\n`;
    } else if (streak >= 3) {
      context += `- Good tracking habit developing (${streak} recent entries)\n`;
    }

    context += `\nUSE THIS CONTEXT TO:\n`;
    context += `- Reference specific moods and notes naturally\n`;
    context += `- Acknowledge emotional patterns you notice\n`;
    context += `- Provide appropriate support based on recent trends\n`;
    context += `- Celebrate improvements or offer comfort during difficult times\n`;
    context += `- Ask thoughtful follow-up questions about their experiences\n`;

    return context;
  }

  // Simple mood context for quick reference
  static async getMoodContext(userId: string, limit = 5): Promise<string> {
    try {
      console.log(`🧠 Getting simple mood context for ${userId}`);
      const allEntries = await MoodDatabase.getAllMoodEntries(userId);
      const recentMoods = allEntries.slice(0, limit);

      if (recentMoods.length === 0) {
        console.log("🧠 No recent moods found");
        return "No recent mood entries available.";
      }

      console.log(`🧠 Found ${recentMoods.length} recent moods`);

      const moodSummary = recentMoods
        .map((entry) => {
          let dateStr = "Recent";

          try {
            if (
              entry.timestamp &&
              typeof entry.timestamp === "number" &&
              entry.timestamp > 0
            ) {
              const date = new Date(entry.timestamp);
              if (!isNaN(date.getTime())) {
                dateStr = date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }
            }

            if (dateStr === "Recent" && entry.date) {
              const date = new Date(entry.date);
              if (!isNaN(date.getTime())) {
                dateStr = date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }
            }
          } catch (error) {
            console.log("🧠 Date parsing error for entry:", entry.id, error);
            dateStr = "Recent";
          }

          const note = entry.note ? ` — "${entry.note}"` : " — No note";
          return `- ${entry.mood.emoji} ${entry.mood.name} (${entry.intensity}/5) on ${dateStr}${note}`;
        })
        .join("\n");

      const context = `Recent moods:\n${moodSummary}`;
      console.log("🧠 Mood context generated:", context);
      return context;
    } catch (error) {
      console.error("❌ Error getting mood context:", error);
      return "Unable to retrieve recent mood data.";
    }
  }

  // Debug method
  static async debugAnalytics(userId: string): Promise<void> {
    try {
      console.log("🔍 === MOOD ANALYTICS DEBUG ===");
      const allEntries = await MoodDatabase.getAllMoodEntries(userId);
      console.log(`🔍 Total entries for user: ${allEntries.length}`);

      if (allEntries.length > 0) {
        console.log(
          "🔍 Sample entries with timestamps:",
          allEntries.slice(0, 3).map((entry) => ({
            id: entry.id,
            mood: entry.mood.name,
            moodId: entry.mood.id,
            timestamp: entry.timestamp,
            date: entry.date,
            timestampAsDate: entry.timestamp
              ? new Date(entry.timestamp)
              : "Invalid",
          }))
        );

        const today = new Date().toISOString().split("T")[0];
        const todayStats = await this.getDailyStats(userId, today);
        console.log("🔍 Today's stats:", todayStats);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekStats = await this.getWeeklyStats(userId, weekStartStr);
        console.log("🔍 Week stats:", weekStats);

        const context = await this.getDetailedMoodContext(userId);
        console.log(
          "🔍 Detailed mood context:",
          context.substring(0, 300) + "..."
        );
      }
      console.log("🔍 === END DEBUG ===");
    } catch (error) {
      console.error("❌ Debug analytics error:", error);
    }
  }
}
