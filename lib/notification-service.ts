import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  frequency: "daily" | "twice-daily" | "three-times" | "custom";
  times: string[]; // Array of time strings like "09:00", "15:00", "21:00"
  customMessage?: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  frequency: "twice-daily",
  times: ["10:00", "18:00"],
  customMessage: undefined,
};

const MOOD_PROMPTS = [
  "How are you feeling right now? 🌈",
  "Take a moment to check in with yourself 💙",
  "What's your mood like today? ✨",
  "Time for a quick mood check-in! 🌟",
  "How would you describe your current feelings? 💭",
  "Let's track your emotional wellness 🌸",
  "Your mood matters - how are you doing? 💚",
  "Quick mood check: How are you feeling? 🦋",
];

export class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = DEFAULT_SETTINGS;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // Load saved settings
      await this.loadSettings();

      // Request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permission not granted");
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("mood-reminders", {
          name: "Mood Reminders",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#3b82f6",
          sound: "default",
        });
      }

      // Schedule initial notifications if enabled
      if (this.settings.enabled) {
        await this.scheduleNotifications();
      }

      return true;
    } catch (error) {
      console.error("Error initializing notifications:", error);
      return false;
    }
  }

  async loadSettings(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem("notification_settings");
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  }

  async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings };
      await AsyncStorage.setItem(
        "notification_settings",
        JSON.stringify(this.settings)
      );

      // Reschedule notifications with new settings
      await this.cancelAllNotifications();
      if (this.settings.enabled) {
        await this.scheduleNotifications();
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  async scheduleNotifications(): Promise<void> {
    try {
      // Cancel existing notifications first
      await this.cancelAllNotifications();

      if (!this.settings.enabled) return;

      const times = this.getNotificationTimes();

      for (const time of times) {
        await this.scheduleRepeatingNotification(time);
      }

      console.log(`Scheduled ${times.length} mood reminder notifications`);
    } catch (error) {
      console.error("Error scheduling notifications:", error);
    }
  }

  private getNotificationTimes(): string[] {
    switch (this.settings.frequency) {
      case "daily":
        return ["10:00"];
      case "twice-daily":
        return ["10:00", "18:00"];
      case "three-times":
        return ["09:00", "15:00", "21:00"];
      case "custom":
        return this.settings.times;
      default:
        return ["10:00", "18:00"];
    }
  }

  private async scheduleRepeatingNotification(time: string): Promise<void> {
    const [hours, minutes] = time.split(":").map(Number);
    const randomPrompt =
      MOOD_PROMPTS[Math.floor(Math.random() * MOOD_PROMPTS.length)];

    const trigger: Notifications.DailyTriggerInput = {
      type: "daily",
      hour: hours,
      minute: minutes,
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Mood Check-in Time! 🌈",
        body: this.settings.customMessage || randomPrompt,
        data: {
          type: "mood-reminder",
          time: time,
        },
        sound: "default",
      },
      trigger,
    });
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error canceling notifications:", error);
    }
  }

  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error getting scheduled notifications:", error);
      return [];
    }
  }

  // Handle notification responses (when user taps notification)
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Handle notifications received while app is in foreground
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
