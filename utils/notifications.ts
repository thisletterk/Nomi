import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import type { Medication } from "./storage";
import { getMedications, getTodaysDoses } from "./storage";

const NOTIFICATION_STORAGE_KEY = "scheduled_notifications";
const PAST_DUE_CHECK_KEY = "last_past_due_check";

interface StoredNotification {
  id: string;
  medicationId: string;
  type: "medication" | "refill" | "past_due";
  scheduledFor: string;
  notificationId: string;
}

// Simple fallback notification system (no external dependencies)
class SimpleNotificationManager {
  private static timers: Map<string, NodeJS.Timeout> = new Map();

  static scheduleNotification(options: {
    id: string;
    title: string;
    message: string;
    date: Date;
    userInfo?: any;
  }) {
    const { id, title, message, date } = options;
    const now = new Date();
    const delay = date.getTime() - now.getTime();

    if (delay <= 0) {
      console.log(`⚠️ Notification ${id} scheduled for past time, skipping`);
      return;
    }

    // Clear existing timer if any
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id)!);
      this.timers.delete(id);
    }

    // Schedule new timer
    const timer = setTimeout(() => {
      console.log(`🔔 Notification: ${title} - ${message}`);
      // In a real app, this would show a system notification
      // For now, we just log it
      this.timers.delete(id);
    }, delay);

    this.timers.set(id, timer);
    console.log(
      `📅 Scheduled notification "${title}" for ${date.toLocaleString()}`
    );
  }

  static cancelNotification(id: string) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id)!);
      this.timers.delete(id);
      console.log(`🗑️ Cancelled notification: ${id}`);
    }
  }

  static cancelAllNotifications() {
    for (const [id, timer] of this.timers.entries()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    console.log("🗑️ Cancelled all notifications");
  }
}

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    console.log("✅ Simple notification system initialized");
    return "simple-notifications-enabled";
  } catch (error) {
    console.error("❌ Error initializing notifications:", error);
    return null;
  }
}

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

// Store notification info for tracking
async function storeNotificationInfo(
  notification: StoredNotification
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const notifications: StoredNotification[] = stored
      ? JSON.parse(stored)
      : [];

    // Remove any existing notifications for this medication and type
    const filtered = notifications.filter(
      (n) =>
        !(
          n.medicationId === notification.medicationId &&
          n.type === notification.type
        )
    );

    filtered.push(notification);
    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(filtered)
    );
  } catch (error) {
    console.error("Error storing notification info:", error);
  }
}

// Get stored notification info
async function getStoredNotifications(): Promise<StoredNotification[]> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error getting stored notifications:", error);
    return [];
  }
}

export async function scheduleMedicationReminder(
  medication: Medication
): Promise<string[]> {
  if (!medication.reminderEnabled || medication.times.length === 0) {
    console.log(
      `⏭️ Skipping reminder for ${medication.name} - not enabled or no times`
    );
    return [];
  }

  const identifiers: string[] = [];

  try {
    // Cancel any existing notifications for this medication first
    await cancelMedicationReminders(medication.id);

    console.log(`📅 Scheduling reminders for ${medication.name}`);

    // Schedule notifications for each time
    for (const time of medication.times) {
      const [hours, minutes] = time.split(":").map(Number);

      // Validate time format
      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        console.error(`❌ Invalid time format: ${time}`);
        continue;
      }

      // Get the next occurrence of this time
      const nextOccurrence = getNextOccurrence(hours, minutes);
      const now = new Date();

      console.log(`⏰ Scheduling ${medication.name} for ${time}:`);
      console.log(`   - Current time: ${now.toLocaleString()}`);
      console.log(`   - Next occurrence: ${nextOccurrence.toLocaleString()}`);
      console.log(
        `   - Minutes until: ${Math.round((nextOccurrence.getTime() - now.getTime()) / (1000 * 60))}`
      );

      // Only schedule if it's more than 1 minute in the future
      const minutesUntil =
        (nextOccurrence.getTime() - now.getTime()) / (1000 * 60);
      if (minutesUntil < 1) {
        console.log(
          `⚠️ Skipping ${medication.name} - too close to current time`
        );
        continue;
      }

      // Generate unique notification ID
      const notificationId = `med_${medication.id}_${time.replace(":", "")}`;

      // Schedule notification using simple system
      SimpleNotificationManager.scheduleNotification({
        id: notificationId,
        title: "Wellness Reminder 🌟",
        message: `Time for your ${medication.name} (${medication.dosage})`,
        date: nextOccurrence,
        userInfo: {
          medicationId: medication.id,
          type: "medication",
          medicationName: medication.name,
          dosage: medication.dosage,
          scheduledTime: time,
        },
      });

      identifiers.push(notificationId);

      // Store notification info for tracking
      await storeNotificationInfo({
        id: `${medication.id}-${time}`,
        medicationId: medication.id,
        type: "medication",
        scheduledFor: time,
        notificationId,
      });

      console.log(
        `✅ Scheduled ${medication.name} for ${time} (ID: ${notificationId})`
      );
    }

    console.log(
      `📱 Total notifications scheduled for ${medication.name}: ${identifiers.length}`
    );
    return identifiers;
  } catch (error) {
    console.error("❌ Error scheduling medication reminder:", error);
    return [];
  }
}

export async function scheduleRefillReminder(
  medication: Medication
): Promise<string | undefined> {
  // Don't schedule refill reminders immediately - only when supply is actually low
  if (
    !medication.refillReminder ||
    !medication.currentSupply ||
    !medication.refillAt
  ) {
    return undefined;
  }

  try {
    // Calculate if we need to show refill reminder
    const supplyPercentage =
      (medication.currentSupply / medication.totalSupply) * 100;

    console.log(`📦 Checking refill for ${medication.name}:`);
    console.log(
      `   - Current supply: ${medication.currentSupply}/${medication.totalSupply}`
    );
    console.log(`   - Percentage: ${supplyPercentage.toFixed(1)}%`);
    console.log(`   - Refill threshold: ${medication.refillAt}%`);

    // Only schedule if supply is actually low
    if (supplyPercentage > medication.refillAt) {
      console.log(`✅ Supply sufficient for ${medication.name}`);
      return undefined;
    }

    // Cancel any existing refill reminders for this medication
    await cancelRefillReminders(medication.id);

    // Schedule refill reminder for next day at 9 AM (not immediately)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const notificationId = `refill_${medication.id}`;

    SimpleNotificationManager.scheduleNotification({
      id: notificationId,
      title: "Supply Running Low 📦",
      message: `Your ${medication.name} is running low. You have ${medication.currentSupply} units left.`,
      date: tomorrow,
      userInfo: {
        medicationId: medication.id,
        type: "refill",
        medicationName: medication.name,
        currentSupply: medication.currentSupply,
      },
    });

    // Store notification info
    await storeNotificationInfo({
      id: `${medication.id}-refill`,
      medicationId: medication.id,
      type: "refill",
      scheduledFor: tomorrow.toISOString(),
      notificationId,
    });

    console.log(
      `📦 Scheduled refill reminder for ${medication.name} tomorrow at 9 AM`
    );
    return notificationId;
  } catch (error) {
    console.error("❌ Error scheduling refill reminder:", error);
    return undefined;
  }
}

export async function schedulePastDueReminder(
  medication: Medication,
  missedTime: string
): Promise<void> {
  try {
    const notificationId = `pastdue_${medication.id}_${missedTime.replace(":", "")}`;

    // Schedule past due reminder in 30 minutes
    const reminderTime = new Date();
    reminderTime.setMinutes(reminderTime.getMinutes() + 30);

    SimpleNotificationManager.scheduleNotification({
      id: notificationId,
      title: "Missed Wellness Reminder ⏰",
      message: `You missed your ${medication.name} at ${missedTime}. Take it when convenient.`,
      date: reminderTime,
      userInfo: {
        medicationId: medication.id,
        type: "past_due",
        medicationName: medication.name,
        missedTime,
      },
    });

    // Store notification info
    await storeNotificationInfo({
      id: `${medication.id}-pastdue-${missedTime}`,
      medicationId: medication.id,
      type: "past_due",
      scheduledFor: reminderTime.toISOString(),
      notificationId,
    });

    console.log(
      `⏰ Scheduled past due reminder for ${medication.name} (missed ${missedTime})`
    );
  } catch (error) {
    console.error("❌ Error scheduling past due reminder:", error);
  }
}

export async function checkForPastDueMedications(): Promise<void> {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Check if we've already checked for past due medications in the last hour
    const lastCheck = await AsyncStorage.getItem(PAST_DUE_CHECK_KEY);
    if (lastCheck) {
      const lastCheckTime = new Date(lastCheck);
      const hoursSinceLastCheck =
        (now.getTime() - lastCheckTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCheck < 1) {
        return; // Don't check too frequently
      }
    }

    // Get all medications and today's doses
    // Direct function calls since imports are at the top
    const [medications, todaysDoses] = await Promise.all([
      getMedications(),
      getTodaysDoses(),
    ]);

    for (const medication of medications) {
      if (!medication.reminderEnabled || medication.times.length === 0)
        continue;

      for (const time of medication.times) {
        const [hours, minutes] = time.split(":").map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Check if this time has passed and medication wasn't taken
        if (scheduledTime < now) {
          const wasTaken = todaysDoses.some(
            (dose) =>
              dose.medicationId === medication.id &&
              dose.taken &&
              new Date(dose.timestamp).toDateString() === today
          );

          if (!wasTaken) {
            // Check if we've already sent a past due reminder for this time today
            const storedNotifications = await getStoredNotifications();
            const alreadyReminded = storedNotifications.some(
              (n) =>
                n.medicationId === medication.id &&
                n.type === "past_due" &&
                n.scheduledFor.includes(today)
            );

            if (!alreadyReminded) {
              await schedulePastDueReminder(medication, time);
            }
          }
        }
      }
    }

    // Update last check time
    await AsyncStorage.setItem(PAST_DUE_CHECK_KEY, now.toISOString());
  } catch (error) {
    console.error("❌ Error checking for past due medications:", error);
  }
}

export async function cancelMedicationReminders(
  medicationId: string
): Promise<void> {
  try {
    const storedNotifications = await getStoredNotifications();

    const notificationsToCancel = storedNotifications.filter(
      (n) => n.medicationId === medicationId
    );

    for (const notification of notificationsToCancel) {
      SimpleNotificationManager.cancelNotification(notification.notificationId);
    }

    // Remove from stored notifications
    const updatedStored = storedNotifications.filter(
      (n) => n.medicationId !== medicationId
    );
    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(updatedStored)
    );

    console.log(
      `🗑️ Cancelled ${notificationsToCancel.length} notifications for medication: ${medicationId}`
    );
  } catch (error) {
    console.error("❌ Error canceling medication reminders:", error);
  }
}

export async function cancelRefillReminders(
  medicationId: string
): Promise<void> {
  try {
    const storedNotifications = await getStoredNotifications();

    const notificationsToCancel = storedNotifications.filter(
      (n) => n.medicationId === medicationId && n.type === "refill"
    );

    for (const notification of notificationsToCancel) {
      SimpleNotificationManager.cancelNotification(notification.notificationId);
    }

    // Remove from stored notifications
    const updatedStored = storedNotifications.filter(
      (n) => !(n.medicationId === medicationId && n.type === "refill")
    );
    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(updatedStored)
    );

    console.log(
      `🗑️ Cancelled refill reminders for medication: ${medicationId}`
    );
  } catch (error) {
    console.error("❌ Error canceling refill reminders:", error);
  }
}

export async function updateMedicationReminders(
  medication: Medication
): Promise<void> {
  try {
    console.log(`🔄 Updating reminders for ${medication.name}`);

    // Cancel existing reminders first
    await cancelMedicationReminders(medication.id);

    // Schedule new reminders only if enabled
    let medicationIds: string[] = [];
    let refillId: string | undefined;

    if (medication.reminderEnabled) {
      medicationIds = await scheduleMedicationReminder(medication);
    }

    if (medication.refillReminder) {
      refillId = await scheduleRefillReminder(medication);
    }

    console.log(`✅ Updated reminders for ${medication.name}:`, {
      medicationReminders: medicationIds.length,
      refillReminder: refillId ? 1 : 0,
    });
  } catch (error) {
    console.error("❌ Error updating medication reminders:", error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    SimpleNotificationManager.cancelAllNotifications();
    await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    await AsyncStorage.removeItem(PAST_DUE_CHECK_KEY);
    console.log("🗑️ Cancelled all scheduled notifications");
  } catch (error) {
    console.error("❌ Error canceling all notifications:", error);
  }
}

// Helper function to test notifications
export async function testNotification(): Promise<void> {
  try {
    const testTime = new Date();
    testTime.setSeconds(testTime.getSeconds() + 3);

    SimpleNotificationManager.scheduleNotification({
      id: "test_notification",
      title: "Test Notification 🧪",
      message: "This is a test notification from your wellness companion!",
      date: testTime,
      userInfo: { type: "test" },
    });

    console.log(`🧪 Test notification scheduled for 3 seconds`);
    Alert.alert(
      "Test Scheduled! 🧪",
      "Check the console in 3 seconds to see the notification log."
    );
  } catch (error) {
    console.error("❌ Error scheduling test notification:", error);
  }
}

// Helper function to get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<any[]> {
  try {
    const storedNotifications = await getStoredNotifications();

    console.log(
      `📱 Found ${storedNotifications.length} tracked notifications:`
    );
    storedNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.id}`);
      console.log(`   - Type: ${notif.type}`);
      console.log(`   - Medication: ${notif.medicationId}`);
      console.log(`   - Scheduled for: ${notif.scheduledFor}`);
    });

    return storedNotifications;
  } catch (error) {
    console.error("❌ Error getting scheduled notifications:", error);
    return [];
  }
}

// Helper function to check notification permissions
export async function checkNotificationPermissions(): Promise<{
  granted: boolean;
  status: string;
}> {
  try {
    return {
      granted: true,
      status: "granted",
    };
  } catch (error) {
    console.error("❌ Error checking notification permissions:", error);
    return {
      granted: false,
      status: "error",
    };
  }
}

// Helper to clean up old notifications
export async function cleanupOldNotifications(): Promise<void> {
  try {
    const storedNotifications = await getStoredNotifications();
    const now = new Date();

    // Remove notifications that are more than 7 days old
    const activeStored = storedNotifications.filter((n) => {
      const scheduledDate = new Date(n.scheduledFor);
      const daysDiff =
        (now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(activeStored)
    );

    console.log(
      `🧹 Cleaned up notification tracking: ${storedNotifications.length} -> ${activeStored.length}`
    );
  } catch (error) {
    console.error("❌ Error cleaning up notifications:", error);
  }
}
