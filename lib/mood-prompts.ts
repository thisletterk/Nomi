import PushNotification from "react-native-push-notification";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MoodDatabase } from "./mood-database";

export interface MoodPrompt {
  id: string;
  type: "morning" | "afternoon" | "evening" | "check-in";
  title: string;
  message: string;
  time: string; // HH:MM format
  enabled: boolean;
}

export const DEFAULT_PROMPTS: MoodPrompt[] = [
  {
    id: "morning",
    type: "morning",
    title: "Good Morning! 🌅",
    message: "Want to check in on how you're feeling today?",
    time: "09:00",
    enabled: true,
  },
  {
    id: "afternoon",
    type: "afternoon",
    title: "Afternoon Check-in 🌤️",
    message: "How's your day flowing so far?",
    time: "14:00",
    enabled: true,
  },
  {
    id: "evening",
    type: "evening",
    title: "Evening Reflection 🌙",
    message: "Want to reflect on one positive moment from today?",
    time: "19:00",
    enabled: true,
  },
];

// Helper function to get next occurrence of a time
function getNextOccurrence(hours: number, minutes: number): Date {
  const now = new Date();
  const scheduledTime = new Date();

  scheduledTime.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  return scheduledTime;
}

export class MoodPromptManager {
  private static STORAGE_KEY = "mood_prompts_settings";
  private static LAST_PROMPT_KEY = "last_mood_prompt";
  private static LAST_NOTIFICATION_SCHEDULE_KEY = "last_notification_schedule";

  static async initializeNotifications(): Promise<boolean> {
    try {
      console.log("✅ Mood notifications initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Error initializing mood notifications:", error);
      return false;
    }
  }

  static async getPromptSettings(): Promise<MoodPrompt[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return DEFAULT_PROMPTS;
    } catch (error) {
      console.error("❌ Error getting prompt settings:", error);
      return DEFAULT_PROMPTS;
    }
  }

  static async updatePromptSettings(prompts: MoodPrompt[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(prompts));
      await this.scheduleNotifications(prompts);
      console.log("✅ Prompt settings updated");
    } catch (error) {
      console.error("❌ Error updating prompt settings:", error);
    }
  }

  static async scheduleNotifications(prompts: MoodPrompt[]): Promise<void> {
    try {
      // Check if we've already scheduled notifications today
      const today = new Date().toDateString();
      const lastScheduled = await AsyncStorage.getItem(
        this.LAST_NOTIFICATION_SCHEDULE_KEY
      );

      if (lastScheduled === today) {
        console.log("📅 Mood notifications already scheduled for today");
        return;
      }

      // Cancel existing mood prompt notifications
      await this.cancelMoodNotifications();

      const scheduledCount = { morning: 0, afternoon: 0, evening: 0 };

      for (const prompt of prompts) {
        if (!prompt.enabled) {
          console.log(`⏭️ Skipping disabled prompt: ${prompt.type}`);
          continue;
        }

        const [hours, minutes] = prompt.time.split(":").map(Number);

        // Validate time format
        if (
          isNaN(hours) ||
          isNaN(minutes) ||
          hours < 0 ||
          hours > 23 ||
          minutes < 0 ||
          minutes > 59
        ) {
          console.error(
            `❌ Invalid time format for ${prompt.type}: ${prompt.time}`
          );
          continue;
        }

        // Get the next occurrence of this time
        const nextOccurrence = getNextOccurrence(hours, minutes);
        const now = new Date();
        const minutesUntil =
          (nextOccurrence.getTime() - now.getTime()) / (1000 * 60);

        // Only schedule if it's more than 1 minute in the future
        if (minutesUntil < 1) {
          console.log(`⚠️ Skipping ${prompt.type} - too close to current time`);
          continue;
        }

        console.log(`📅 Scheduling ${prompt.type} mood prompt:`);
        console.log(`   - Time: ${prompt.time}`);
        console.log(`   - Next occurrence: ${nextOccurrence.toLocaleString()}`);
        console.log(`   - Minutes until: ${Math.round(minutesUntil)}`);

        const notificationId = `mood_${prompt.type}`;

        // Schedule daily repeating notification
        PushNotification.localNotificationSchedule({
          id: notificationId,
          title: prompt.title,
          message: prompt.message,
          date: nextOccurrence,
          repeatType: "day",
          channelId: "wellness-reminders",
          userInfo: {
            type: "mood_prompt",
            promptId: prompt.id,
            promptType: prompt.type,
          },
          playSound: true,
          soundName: "default",
          vibrate: true,
          vibration: 300,
        });

        scheduledCount[prompt.type as keyof typeof scheduledCount]++;
        console.log(
          `✅ Scheduled ${prompt.type} mood prompt for ${prompt.time}`
        );
      }

      // Mark that we've scheduled notifications for today
      await AsyncStorage.setItem(this.LAST_NOTIFICATION_SCHEDULE_KEY, today);

      console.log(`📅 Scheduled mood notifications:`, scheduledCount);
    } catch (error) {
      console.error("❌ Error scheduling mood notifications:", error);
    }
  }

  static async cancelMoodNotifications(): Promise<void> {
    try {
      // Cancel specific mood notification IDs
      const moodTypes = ["morning", "afternoon", "evening"];
      for (const type of moodTypes) {
        PushNotification.cancelLocalNotification(`mood_${type}`);
      }

      console.log(`🧹 Cancelled mood prompt notifications`);
    } catch (error) {
      console.error("❌ Error canceling mood notifications:", error);
    }
  }

  static async shouldShowInAppPrompt(
    userId: string
  ): Promise<MoodPrompt | null> {
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const hour = now.getHours();

      // Check if user has logged mood today
      const todaysMood = await MoodDatabase.getMoodEntryForDate(userId, today);

      // If they've already logged a mood today, don't show any prompts
      if (todaysMood) {
        console.log(
          "💭 User already logged mood today, skipping in-app prompt"
        );
        return null;
      }

      // Get last prompt data
      const lastPromptStr = await AsyncStorage.getItem(this.LAST_PROMPT_KEY);
      let lastPromptData: {
        date: string;
        type: string;
        timestamp: number;
      } | null = null;

      if (lastPromptStr) {
        try {
          const parsed = JSON.parse(lastPromptStr);
          if (parsed.date && parsed.type && parsed.timestamp) {
            lastPromptData = parsed;
          }
        } catch (e) {
          console.log("Error parsing last prompt data:", e);
        }
      }

      // Don't show prompts too frequently (minimum 4 hours between prompts)
      if (
        lastPromptData &&
        now.getTime() - lastPromptData.timestamp < 4 * 60 * 60 * 1000
      ) {
        console.log("💭 Too soon since last in-app prompt, waiting...");
        return null;
      }

      // Don't show the same type of prompt twice in one day
      if (lastPromptData && lastPromptData.date === today) {
        console.log(
          `💭 Already showed ${lastPromptData.type} in-app prompt today`
        );
        return null;
      }

      const prompts = await this.getPromptSettings();

      // Determine which prompt to show based on time of day with stricter time windows
      let appropriatePrompt: MoodPrompt | null = null;

      if (hour >= 7 && hour <= 11) {
        // Morning: 7 AM - 11 AM
        appropriatePrompt =
          prompts.find((p) => p.type === "morning" && p.enabled) || null;
      } else if (hour >= 13 && hour <= 16) {
        // Afternoon: 1 PM - 4 PM
        appropriatePrompt =
          prompts.find((p) => p.type === "afternoon" && p.enabled) || null;
      } else if (hour >= 18 && hour <= 21) {
        // Evening: 6 PM - 9 PM
        appropriatePrompt =
          prompts.find((p) => p.type === "evening" && p.enabled) || null;
      } else {
        // Outside prompt hours
        console.log(`💭 Outside in-app prompt hours (current: ${hour}:00)`);
        return null;
      }

      if (appropriatePrompt) {
        // Save the prompt data
        const promptData = {
          date: today,
          type: appropriatePrompt.type,
          timestamp: now.getTime(),
        };
        await AsyncStorage.setItem(
          this.LAST_PROMPT_KEY,
          JSON.stringify(promptData)
        );

        console.log(
          `💭 Showing ${appropriatePrompt.type} in-app prompt for ${today}`
        );
        return appropriatePrompt;
      }

      return null;
    } catch (error) {
      console.error("❌ Error checking in-app prompt:", error);
      return null;
    }
  }

  static async getPersonalizedPrompts(userId: string): Promise<string[]> {
    try {
      const recentEntries = await MoodDatabase.getAllMoodEntries(userId);
      const last7Days = recentEntries.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      });

      const prompts: string[] = [];

      if (last7Days.length === 0) {
        prompts.push("How are you feeling right now?");
        prompts.push("What's one thing you're grateful for today?");
        prompts.push("Want to check in on how your day is going?");
      } else {
        const averageMood =
          last7Days.reduce((sum, entry) => sum + entry.mood.value, 0) /
          last7Days.length;

        if (averageMood >= 4) {
          prompts.push(
            "You've been feeling great lately! What's contributing to your positive energy?"
          );
          prompts.push("What's one thing you're excited about today?");
          prompts.push("How can you share this positive momentum with others?");
        } else if (averageMood <= 2) {
          prompts.push("Want to check in on how you're doing this week?");
          prompts.push(
            "What's one small thing that might bring you comfort today?"
          );
          prompts.push("How are you taking care of yourself today?");
        } else {
          prompts.push("How are you feeling in this moment?");
          prompts.push("What's one thing that went well today?");
          prompts.push("Want to talk through your day?");
        }
      }

      return prompts;
    } catch (error) {
      console.error("❌ Error getting personalized prompts:", error);
      return ["How are you feeling today?"];
    }
  }

  static async clearTodaysPrompts(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const lastPromptStr = await AsyncStorage.getItem(this.LAST_PROMPT_KEY);

      if (lastPromptStr) {
        try {
          const parsed = JSON.parse(lastPromptStr);
          if (parsed.date === today) {
            // Clear today's prompt history since user logged a mood
            await AsyncStorage.removeItem(this.LAST_PROMPT_KEY);
            console.log(
              "🧹 Cleared today's in-app prompt history - user logged mood"
            );
          }
        } catch (e) {
          // Old format or invalid data, just clear it
          await AsyncStorage.removeItem(this.LAST_PROMPT_KEY);
        }
      }
    } catch (error) {
      console.error("❌ Error clearing today's prompts:", error);
    }
  }

  // Helper method to reset notification scheduling (for debugging)
  static async resetNotificationSchedule(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.LAST_NOTIFICATION_SCHEDULE_KEY);
      await this.cancelMoodNotifications();
      console.log("🔄 Reset mood notification schedule");
    } catch (error) {
      console.error("❌ Error resetting notification schedule:", error);
    }
  }
}
