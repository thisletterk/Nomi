import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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

export class MoodPromptManager {
  private static STORAGE_KEY = "mood_prompts_settings";
  private static LAST_PROMPT_KEY = "last_mood_prompt";

  static async initializeNotifications(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("❌ Notification permission denied");
        return false;
      }

      // Configure notification behavior
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      console.log("✅ Notifications initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Error initializing notifications:", error);
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
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      for (const prompt of prompts) {
        if (!prompt.enabled) continue;

        const [hours, minutes] = prompt.time.split(":").map(Number);

        // Use different trigger types based on platform
        let trigger: any;

        if (Platform.OS === "ios") {
          // iOS supports calendar triggers
          trigger = {
            hour: hours,
            minute: minutes,
            repeats: true,
          };
        } else {
          // Android - schedule for next occurrence of this time
          const now = new Date();
          const scheduledTime = new Date();
          scheduledTime.setHours(hours, minutes, 0, 0);

          // If the time has passed today, schedule for tomorrow
          if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }

          // Use daily repeat with proper interval
          trigger = {
            date: scheduledTime,
            repeats: true,
            repeatInterval: "day" as any, // Repeat daily
          };
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: prompt.title,
            body: prompt.message,
            data: {
              type: "mood_prompt",
              promptId: prompt.id,
              promptType: prompt.type,
            },
          },
          trigger,
        });

        console.log(`📅 Scheduled ${prompt.type} prompt for ${prompt.time}`);
      }
    } catch (error) {
      console.error("❌ Error scheduling notifications:", error);
    }
  }

  static async shouldShowInAppPrompt(
    userId: string
  ): Promise<MoodPrompt | null> {
    try {
      const lastPromptStr = await AsyncStorage.getItem(this.LAST_PROMPT_KEY);
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const hour = now.getHours();

      // Check if user has logged mood today
      const todaysMood = await MoodDatabase.getMoodEntryForDate(userId, today);

      // If they've already logged a mood today, don't show any prompts
      if (todaysMood) {
        console.log("💭 User already logged mood today, skipping prompt");
        return null;
      }

      // Parse last prompt data to be more specific
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
          } else {
            // Old format - just a timestamp
            const timestamp = new Date(lastPromptStr).getTime();
            if (!isNaN(timestamp)) {
              lastPromptData = {
                date: new Date(timestamp).toISOString().split("T")[0],
                type: "unknown",
                timestamp,
              };
            }
          }
        } catch (e) {
          console.log("Error parsing last prompt data:", e);
        }
      }

      // Don't show prompts too frequently (minimum 3 hours between prompts)
      if (
        lastPromptData &&
        now.getTime() - lastPromptData.timestamp < 3 * 60 * 60 * 1000
      ) {
        console.log("💭 Too soon since last prompt, waiting...");
        return null;
      }

      // Don't show the same type of prompt twice in one day
      if (lastPromptData && lastPromptData.date === today) {
        console.log(`💭 Already showed ${lastPromptData.type} prompt today`);
        return null;
      }

      const prompts = await this.getPromptSettings();

      // Determine which prompt to show based on time of day
      let appropriatePrompt: MoodPrompt | null = null;

      if (hour >= 6 && hour < 12) {
        // Morning: 6 AM - 12 PM
        appropriatePrompt =
          prompts.find((p) => p.type === "morning" && p.enabled) || null;
        // Don't show morning prompt after 10 AM unless it's early morning
        if (hour > 10) {
          console.log("💭 Too late for morning prompt");
          return null;
        }
      } else if (hour >= 12 && hour < 17) {
        // Afternoon: 12 PM - 5 PM
        appropriatePrompt =
          prompts.find((p) => p.type === "afternoon" && p.enabled) || null;
        // Only show afternoon prompt between 1-4 PM
        if (hour < 13 || hour > 16) {
          console.log("💭 Not the right time for afternoon prompt");
          return null;
        }
      } else if (hour >= 17 && hour < 22) {
        // Evening: 5 PM - 10 PM
        appropriatePrompt =
          prompts.find((p) => p.type === "evening" && p.enabled) || null;
        // Only show evening prompt between 6-9 PM
        if (hour < 18 || hour > 21) {
          console.log("💭 Not the right time for evening prompt");
          return null;
        }
      } else {
        // Late night/early morning - no prompts
        console.log("💭 Outside prompt hours (10 PM - 6 AM)");
        return null;
      }

      if (appropriatePrompt) {
        // Save the prompt data with more detail
        const promptData = {
          date: today,
          type: appropriatePrompt.type,
          timestamp: now.getTime(),
        };
        await AsyncStorage.setItem(
          this.LAST_PROMPT_KEY,
          JSON.stringify(promptData)
        );

        console.log(`💭 Showing ${appropriatePrompt.type} prompt for ${today}`);
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
            console.log("🧹 Cleared today's prompt history - user logged mood");
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
}
