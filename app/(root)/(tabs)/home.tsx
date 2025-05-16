import React, { useState, useEffect, useCallback } from "react";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { AppState } from "react-native";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
} from "react-native";
import { fontSizes } from "@/constants/fontSizes";
import ScreenWrapper from "@/components/ScreenWrapper";
import NotificationButton from "@/components/NotificationButton";
import {
  getMedications,
  Medication,
  getTodaysDoses,
  recordDose,
  DoseHistory,
} from "@/utils/storage";
import {
  registerForPushNotificationsAsync,
  scheduleMedicationReminder,
} from "@/utils/notifications";
import NotificationModal from "@/components/NotificationModal";

// Function to get the greeting based on the time of day
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

// Sample mood data for the mood tracker
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

// Sample daily tips data
const dailyTips = [
  "Take a deep breath and focus on the present moment.",
  "Remember, progress is progress, no matter how small.",
  "Drink plenty of water and stay hydrated today.",
  "You are stronger than you think. Keep going!",
  "Take a moment to write down three things you're grateful for.",
];

// Function to get a random daily tip
const getDailyTip = (): string => {
  const randomIndex = Math.floor(Math.random() * dailyTips.length);
  return dailyTips[randomIndex];
};

const Home = () => {
  const { user } = useUser();
  const greeting = getGreeting();
  const currentDate = getCurrentDate();
  const dailyTip = getDailyTip();

  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh

  //////////////////////////////
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);

  const loadMedications = useCallback(async () => {
    try {
      const [allMedications, todaysDoses] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
      ]);

      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      // Filter medications for today
      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = parseInt(med.duration.split(" ")[0]);

        // For ongoing medications or if within duration
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

      // Calculate completed doses
      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);
    } catch (error) {
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

      // Schedule reminders for all medications
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

  // Use useEffect for initial load
  useEffect(() => {
    loadMedications();
    setupNotifications();

    // Handle app state changes for notifications
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadMedications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /////////////////////////////

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate a network request or data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000); // Refresh complete after 2 seconds
  };

  const sections = [
    { type: "moodTracker" },
    { type: "dailyTip" },
    { type: "additionalContent" },
    { type: "footer" },
  ];

  const renderSection = ({ item }: { item: { type: string } }) => {
    if (item.type === "moodTracker") {
      return (
        <View style={{ padding: 20 }}>
          <Text
            style={{
              color: "#4D2C1D",
              fontFamily: "JakartaBold",
              fontSize: fontSizes.subheading,
            }}
          >
            How do you feel?
          </Text>
          <FlatList
            data={moodData}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  alignItems: "center",
                  flex: 1,
                  marginVertical: 10,
                }}
              >
                <View
                  style={{
                    backgroundColor: item.color,
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                </View>
                <Text
                  style={{
                    color: "#4D2C1D",
                    fontFamily: "JakartaMedium",
                    fontSize: 14,
                    marginTop: 8,
                  }}
                >
                  {item.mood}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            numColumns={4}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      );
    } else if (item.type === "dailyTip") {
      return (
        <View
          style={{
            padding: 20,
            backgroundColor: "#FFF4CC",
            borderRadius: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: "#4D2C1D",
              fontFamily: "JakartaBold",
              fontSize: fontSizes.subheading,
            }}
          >
            Daily Tip
          </Text>
          <Text
            style={{
              color: "#4D2C1D",
              marginTop: 10,
              fontSize: fontSizes.body,
            }}
          >
            {dailyTip}
          </Text>
        </View>
      );
    } else if (item.type === "additionalContent") {
      return (
        <View style={{ padding: 20 }}>
          <Text
            style={{
              color: "#4D2C1D",
              fontFamily: "JakartaBold",
              fontSize: fontSizes.subheading,
            }}
          >
            Additional Content
          </Text>
          <Text
            style={{
              color: "#4D2C1D",
              marginTop: 10,
              fontSize: fontSizes.body,
            }}
          >
            This is where you can add more content, such as articles, tips, or
            any other information you want to share with the user.
          </Text>
        </View>
      );
    } else if (item.type === "footer") {
      return (
        <View
          style={{
            padding: 20,
            backgroundColor: "#FFF4CC",
            borderRadius: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: "#4D2C1D",
              fontFamily: "JakartaBold",
              fontSize: fontSizes.subheading,
            }}
          >
            Footer Section
          </Text>
          <Text
            style={{
              color: "#4D2C1D",
              marginTop: 10,
              fontSize: fontSizes.body,
            }}
          >
            This is where you can add footer content, such as links to privacy
            policy, terms of service, or any other relevant information.
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ScreenWrapper>
      {/* Static Header Section */}
      <View
        style={{
          backgroundColor: "#4D2C1D",
          padding: 20,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFF4CC", fontSize: 14 }}>{currentDate}</Text>
          <NotificationButton
            onPress={() => setShowNotifications(true)}
            notificationCount={todaysMedications.length}
          />
          {/* <Text>{todaysMedications}dd</Text> */}
        </View>

        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}
        >
          <Image
            source={{ uri: "https://randomuser.me/api/portraits/men/44.jpg" }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
          <View style={{ marginLeft: 16 }}>
            <Text
              style={{
                color: "#FFF4CC",
                fontFamily: "JakartaBold",
                fontSize: 18,
              }}
            >
              {greeting}, {user?.firstName}!
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ color: "#A9FFCB", fontSize: 12, marginRight: 8 }}>
                Pro
              </Text>
              <Text style={{ color: "#FFAA4D", fontSize: 12, marginRight: 8 }}>
                • 80%
              </Text>
              <Text style={{ color: "#FFF4CC", fontSize: 12 }}>😊 Happy</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: "#FFF4CC",
            flexDirection: "row",
            alignItems: "center",
            marginTop: 20,
            borderRadius: 50,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <TextInput
            placeholder="Search anything..."
            placeholderTextColor="#ADADAD"
            style={{ flex: 1, color: "#4D2C1D" }}
          />
          <TouchableOpacity>
            <Text style={{ color: "#4D2C1D", fontWeight: "bold" }}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content with Pull-to-Refresh */}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      {/* NOTIFICATION MODAL */}

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        medications={todaysMedications}
      />
    </ScreenWrapper>
  );
};

export default Home;
