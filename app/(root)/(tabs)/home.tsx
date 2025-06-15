import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-expo";
import { AppState, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Text, View, FlatList, RefreshControl } from "react-native";
import { fontSizes } from "@/constants/fontSizes";
import ScreenWrapper from "@/components/ScreenWrapper";
import {
  getMedications,
  Medication,
  getTodaysDoses,
  DoseHistory,
} from "@/utils/storage";
import {
  registerForPushNotificationsAsync,
  scheduleMedicationReminder,
} from "@/utils/notifications";
import NotificationModal from "@/components/NotificationModal";
import HomeHeader from "@/components/HomeHeader";
import MoodTracker from "@/components/MoodTracker";
import DailyTip from "@/components/DailyTip";
import { useMood } from "@/contexts/MoodContext";

const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) {
    return "Good morning";
  } else if (currentHour < 18) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
};

const getCurrentDate = (): string => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return today.toLocaleDateString("en-US", options);
};

type MoodItem = {
  id: string;
  mood: string;
  icon: string;
  color: string;
};

const moodData: MoodItem[] = [
  { id: "1", mood: "Happy", icon: "😊", color: "#FFD700" },
  { id: "2", mood: "Calm", icon: "😌", color: "#87CEEB" },
  { id: "3", mood: "Stressed", icon: "😟", color: "#FF6347" },
  { id: "4", mood: "Excited", icon: "😄", color: "#FFA500" },
  { id: "5", mood: "Relaxed", icon: "😎", color: "#32CD32" },
  { id: "6", mood: "Sad", icon: "😢", color: "#1E90FF" },
  { id: "7", mood: "Angry", icon: "😡", color: "#FF4500" },
  { id: "8", mood: "Loved", icon: "❤️", color: "#FF69B4" },
];

const fetchDailyTip = async (): Promise<string> => {
  try {
    const response = await fetch("https://zenquotes.io/api/random");
    const data = await response.json();
    return data[0]?.q || "Stay positive and keep moving forward!";
  } catch (error) {
    console.error("Failed to fetch daily tip:", error);
    return "Stay positive and keep moving forward!";
  }
};

const styles = StyleSheet.create({
  sectionContainer: {
    padding: 24,
    backgroundColor: "#FFF", // Neutral background
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  moodAccent: {
    borderLeftWidth: 6,
    paddingLeft: 18,
  },
  sectionHeader: {
    color: "#4D2C1D",
    fontFamily: "JakartaBold",
    fontSize: fontSizes.subheading + 2,
    marginBottom: 8,
  },
  sectionBody: {
    color: "#4D2C1D",
    marginTop: 10,
    fontSize: fontSizes.body,
  },
  errorBox: {
    padding: 16,
    backgroundColor: "#ffe5e5",
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: "#b00020",
  },
  streakBarContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  streakLabel: {
    fontSize: 14,
    color: "#4D2C1D",
    marginBottom: 4,
    fontFamily: "JakartaMedium",
  },
  streakBar: {
    width: "80%",
    height: 12,
    backgroundColor: "#FFE5B4",
    borderRadius: 8,
    overflow: "hidden",
  },
  streakFill: {
    height: "100%",
    backgroundColor: "#FFAA4D",
    borderRadius: 8,
  },
});

const STREAK_TOTAL = 7; // e.g., 7 days streak

// --- ADD THIS FUNCTION ---
type SaveMoodArgs = {
  userId: string;
  mood: string;
  label: string;
  color: string;
};

async function saveMoodToDatabase({
  userId,
  mood,
  label,
  color,
}: SaveMoodArgs) {
  try {
    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mood, label, color }),
    });
    if (!res.ok) {
      throw new Error("Failed to save mood");
    }
    return await res.json();
  } catch (error) {
    console.error("Error saving mood:", error);
  }
}
// --- END ADD ---

const Home = () => {
  const { user } = useUser();
  const greeting = getGreeting();
  const currentDate = getCurrentDate();

  const [dailyTip, setDailyTip] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [medicationError, setMedicationError] = useState<string | null>(null);
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [streak, setStreak] = useState(3); // Example: 3-day streak

  const { selectedMood, setSelectedMood } = useMood();

  useFocusEffect(
    useCallback(() => {
      fetchDailyTip().then(setDailyTip);
    }, [])
  );

  const loadMedications = useCallback(async () => {
    try {
      setMedicationError(null);
      const [allMedications, todaysDoses] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
      ]);
      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = parseInt(med.duration.split(" ")[0]);
        if (
          durationDays === -1 ||
          (today >= startDate &&
            today <=
              new Date(
                startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
              ))
        ) {
          return true;
        }
        return false;
      });

      setTodaysMedications(todayMeds);

      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);
    } catch (error) {
      setMedicationError("Failed to load medications. Please try again.");
      console.error("Error loading medications:", error);
    }
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }
      const medications = await getMedications();
      for (const medication of medications) {
        if (medication.reminderEnabled) {
          await scheduleMedicationReminder(medication);
        }
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  useEffect(() => {
    loadMedications();
    setupNotifications();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadMedications();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  // --- UPDATE THIS FUNCTION ---
  const handleSelectMood = useCallback(
    async (id: string) => {
      setSelectedMoodId(id);
      const mood = moodData.find((m) => m.id === id);
      if (mood && user) {
        setSelectedMood({
          mood: mood.icon,
          label: mood.mood,
          color: mood.color,
        });
        await saveMoodToDatabase({
          userId: user.id,
          mood: mood.icon,
          label: mood.mood,
          color: mood.color,
        });
      }
    },
    [setSelectedMood, setSelectedMoodId, moodData, user]
  );
  // --- END UPDATE ---

  const sections = [
    { type: "moodTracker" },
    { type: "dailyTip" },
    { type: "additionalContent" },
    { type: "footer" },
  ];

  const renderSection = useCallback(
    ({ item }: { item: { type: string } }) => {
      if (item.type === "moodTracker") {
        return (
          <View
            style={[
              styles.sectionContainer,
              selectedMood && {
                ...styles.moodAccent,
                borderLeftColor: selectedMood.color,
              },
            ]}
          >
            {/* Streak/Progress Bar */}
            <View style={styles.streakBarContainer}>
              <Text style={styles.streakLabel}>{streak} day streak!</Text>
              <View style={styles.streakBar}>
                <View
                  style={[
                    styles.streakFill,
                    { width: `${(streak / STREAK_TOTAL) * 100}%` },
                  ]}
                />
              </View>
            </View>
            {/* Mood Tracker */}
            <MoodTracker
              moodData={moodData}
              selectedMoodId={selectedMoodId}
              onSelectMood={handleSelectMood}
              largeIcons
            />
          </View>
        );
      } else if (item.type === "dailyTip") {
        return (
          <View style={styles.sectionContainer}>
            <DailyTip tip={dailyTip} />
          </View>
        );
      } else if (item.type === "additionalContent") {
        return (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Additional Content</Text>
            <Text style={styles.sectionBody}>
              This is where you can add more content, such as articles, tips, or
              any other information you want to share with the user.
            </Text>
          </View>
        );
      } else if (item.type === "footer") {
        return (
          <View
            style={[styles.sectionContainer, { backgroundColor: "#FFF9F0" }]}
          >
            <Text style={styles.sectionHeader}>Footer Section</Text>
            <Text style={styles.sectionBody}>
              Privacy Policy | Terms of Service | Support
            </Text>
          </View>
        );
      }
      return null;
    },
    [dailyTip, selectedMoodId, handleSelectMood, streak, selectedMood]
  );

  // Avatar and notification badge for header
  const avatarUrl = user?.imageUrl || undefined;
  const notificationCount = todaysMedications.length - completedDoses;

  return (
    <ScreenWrapper>
      <HomeHeader
        currentDate={currentDate}
        greeting={greeting}
        userFirstName={user?.firstName ?? undefined}
        avatarUrl={avatarUrl}
        onNotificationPress={() => setShowNotifications(true)}
        notificationCount={notificationCount}
        selectedMood={selectedMood}
      />
      {medicationError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{medicationError}</Text>
        </View>
      )}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.type}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        accessible={true}
        accessibilityLabel="Home content sections"
      />
      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        medications={todaysMedications}
      />
    </ScreenWrapper>
  );
};

export default Home;
