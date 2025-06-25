export interface MoodContextData {
  recentMoods: Array<{
    emoji: string;
    label: string;
    intensity: number;
    date: string;
    note?: string;
    daysSince: number;
  }>;
  contextSummary: string;
}

export class MoodContextGenerator {
  private static lastGeneratedContext = "";
  private static lastContextTimestamp = 0;
  private static readonly CONTEXT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async generateMoodContext(
    userId: string
  ): Promise<MoodContextData | null> {
    try {
      // Fetch mood data using the existing API structure
      const response = await fetch(`/api/mood?userId=${userId}`);

      if (!response.ok) {
        console.log("API response not ok:", response.status);
        return null;
      }

      const result = await response.json();
      const moodHistory = result.data || result || [];

      if (!moodHistory || moodHistory.length === 0) {
        return null;
      }

      // Transform recent 5 entries
      const recentEntries = moodHistory.slice(0, 5).map((entry: any) => {
        const entryDate = new Date(entry.date || entry.created_at);
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          emoji: entry.mood_types?.emoji || entry.emoji || "😐",
          label: entry.mood_types?.name || entry.label || "Unknown",
          intensity: entry.intensity || entry.mood_types?.value || 3,
          date: entryDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          note: entry.note,
          daysSince,
        };
      });

      const contextSummary = this.generateContextSummary(recentEntries);

      return {
        recentMoods: recentEntries,
        contextSummary,
      };
    } catch (error) {
      console.error("Error generating mood context:", error);
      return null;
    }
  }

  private static generateContextSummary(moods: any[]): string {
    const now = Date.now();

    // Check cache to avoid repetition
    if (
      now - this.lastContextTimestamp < this.CONTEXT_CACHE_DURATION &&
      this.lastGeneratedContext
    ) {
      return this.lastGeneratedContext;
    }

    let summary = "";

    if (moods.length > 0) {
      const mostRecent = moods[0];
      summary += `The user's most recent mood was ${mostRecent.emoji} ${mostRecent.label} (${mostRecent.intensity}/5)`;

      if (mostRecent.daysSince === 0) {
        summary += ` logged today`;
      } else if (mostRecent.daysSince === 1) {
        summary += ` logged yesterday`;
      } else {
        summary += ` logged ${mostRecent.daysSince} days ago`;
      }

      if (mostRecent.note) {
        summary += ` with the note: "${mostRecent.note}"`;
      }
      summary += ". ";
    }

    // Analyze recent pattern
    if (moods.length > 1) {
      const avgIntensity =
        moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length;
      if (avgIntensity <= 2.5) {
        summary += `Recent entries show lower mood levels. `;
      } else if (avgIntensity >= 4) {
        summary += `Recent entries show positive mood levels. `;
      } else {
        summary += `Recent mood levels have been moderate. `;
      }
    }

    // Add notes context if available
    const moodsWithNotes = moods.filter(
      (m) => m.note && m.note.trim().length > 0
    );
    if (moodsWithNotes.length > 0) {
      const recentNote = moodsWithNotes[0].note;
      summary += `Recent context: "${recentNote}". `;
    }

    this.lastGeneratedContext = summary.trim();
    this.lastContextTimestamp = now;

    return this.lastGeneratedContext;
  }

  static clearContextCache(): void {
    this.lastGeneratedContext = "";
    this.lastContextTimestamp = 0;
  }
}
