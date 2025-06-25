import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
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
    message: "How are you feeling about today?",
    time: "09:00",
    enabled: true,
  },
  {
    id: "afternoon",
    type: "afternoon",
    title: "Afternoon Check-in 🌤️",
    message: "How's your day going so far?",
    time: "14:00",
    enabled: true,
  },
  {
    id: "evening",
    type: "evening",
    title: "Evening Reflection 🌙",
    message: "Want to reflect on one small win from today?",
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
          trigger: {
            type: "calendar",
            hour: hours,
            minute: minutes,
            repeats: true,
          },
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
      const lastPrompt = lastPromptStr ? new Date(lastPromptStr) : null;
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Check if user has logged mood today
      const todaysMood = await MoodDatabase.getMoodEntryForDate(userId, today);

      // If they've already logged a mood today, don't show prompt
      if (todaysMood) {
        return null;
      }

      // Check if we've shown a prompt in the last 4 hours
      if (
        lastPrompt &&
        now.getTime() - lastPrompt.getTime() < 4 * 60 * 60 * 1000
      ) {
        return null;
      }

      const hour = now.getHours();
      const prompts = await this.getPromptSettings();

      // Determine which prompt to show based on time
      let appropriatePrompt: MoodPrompt | null = null;

      if (hour >= 6 && hour < 12) {
        appropriatePrompt =
          prompts.find((p) => p.type === "morning" && p.enabled) || null;
      } else if (hour >= 12 && hour < 17) {
        appropriatePrompt =
          prompts.find((p) => p.type === "afternoon" && p.enabled) || null;
      } else if (hour >= 17 && hour < 22) {
        appropriatePrompt =
          prompts.find((p) => p.type === "evening" && p.enabled) || null;
      }

      if (appropriatePrompt) {
        await AsyncStorage.setItem(this.LAST_PROMPT_KEY, now.toISOString());
        console.log(`💭 Showing ${appropriatePrompt.type} prompt`);
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
        prompts.push("Take a moment to check in with yourself");
      } else {
        const averageMood =
          last7Days.reduce((sum, entry) => sum + entry.mood.value, 0) /
          last7Days.length;

        if (averageMood >= 4) {
          prompts.push(
            "You've been feeling great lately! What's contributing to your positive mood?"
          );
          prompts.push("What's one thing you're excited about today?");
          prompts.push("How can you share this positive energy with others?");
        } else if (averageMood <= 2) {
          prompts.push(
            "I notice you've been having some tough days. How are you feeling right now?"
          );
          prompts.push(
            "What's one small thing that might bring you comfort today?"
          );
          prompts.push(
            "Remember, it's okay to have difficult days. What support do you need?"
          );
        } else {
          prompts.push("How are you feeling in this moment?");
          prompts.push("What's one thing that went well today?");
          prompts.push(
            "What emotion are you experiencing most strongly right now?"
          );
        }
      }

      return prompts;
    } catch (error) {
      console.error("❌ Error getting personalized prompts:", error);
      return ["How are you feeling today?"];
    }
  }
}
