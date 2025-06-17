"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MoodStorage } from "@/lib/mood-storage";
import { MoodAnalytics } from "@/lib/mood-analytics";

const { width } = Dimensions.get("window");

interface ProfileStats {
  totalMoodEntries: number;
  currentStreak: number;
  averageMood: number;
  joinDate: string;
}

interface SettingItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  type: "toggle" | "action" | "navigation";
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    dataSharing: false,
    reminderEnabled: true,
  });
  const [signingOut, setSigningOut] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
    startAnimations();
  }, [user]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadProfileData = async () => {
    if (!user) return;

    try {
      // Load mood statistics
      const allMoods = await MoodStorage.getAllMoodEntries(user.id);

      if (allMoods.length > 0) {
        const totalMoodValue = allMoods.reduce(
          (sum, mood) => sum + mood.mood.value,
          0
        );
        const averageMood = totalMoodValue / allMoods.length;

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const streak = await MoodAnalytics.calculateStreak(user.id);

        setStats({
          totalMoodEntries: allMoods.length,
          currentStreak: streak,
          averageMood: Math.round(averageMood * 10) / 10,
          joinDate: user?.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "Recently",
        });
      }

      // Load settings from storage
      const savedSettings = await AsyncStorage.getItem("user_settings");
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleSettingToggle = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem("user_settings", JSON.stringify(newSettings));
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? This will clear all local data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);
            try {
              // Clear local storage and cached data
              await AsyncStorage.clear();

              // Sign out from Clerk
              await signOut();

              // Navigate to sign-in page
              router.replace("/(auth)/sign-in");
            } catch (error) {
              console.error("Error during sign out:", error);
              Alert.alert(
                "Sign Out Error",
                "There was an issue signing you out. Please try again."
              );
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "Your mood data will be prepared for export. This feature helps you share your progress with healthcare providers.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Export", onPress: () => console.log("Export data") },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => console.log("Delete account"),
        },
      ]
    );
  };

  const settingsData: SettingItem[] = [
    {
      id: "notifications",
      title: "Push Notifications",
      subtitle: "Get reminders and updates",
      icon: "notifications",
      type: "toggle",
      value: settings.notifications,
      onToggle: (value) => handleSettingToggle("notifications", value),
    },
    {
      id: "reminders",
      title: "Daily Mood Reminders",
      subtitle: "Remind me to track my mood",
      icon: "alarm",
      type: "toggle",
      value: settings.reminderEnabled,
      onToggle: (value) => handleSettingToggle("reminderEnabled", value),
    },
    {
      id: "privacy",
      title: "Privacy Settings",
      subtitle: "Manage your data and privacy",
      icon: "shield-checkmark",
      type: "navigation",
      onPress: () => console.log("Privacy settings"),
    },
    {
      id: "export",
      title: "Export My Data",
      subtitle: "Download your mood history",
      icon: "download",
      type: "action",
      onPress: handleExportData,
    },
    {
      id: "support",
      title: "Help & Support",
      subtitle: "Get help or contact us",
      icon: "help-circle",
      type: "navigation",
      onPress: () => console.log("Help & Support"),
    },
    {
      id: "about",
      title: "About Nomi",
      subtitle: "Version 1.0.0",
      icon: "information-circle",
      type: "navigation",
      onPress: () => console.log("About"),
    },
  ];

  const renderProfileHeader = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        alignItems: "center",
        padding: 20,
      }}
    >
      {/* Profile Avatar */}
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: "#3b82f6",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
          borderWidth: 4,
          borderColor: "#374151",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 36, fontWeight: "bold" }}>
          {user?.firstName?.charAt(0) ||
            user?.emailAddresses[0]?.emailAddress?.charAt(0) ||
            "U"}
        </Text>
      </View>

      {/* User Info */}
      <Text
        style={{
          color: "#fff",
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 4,
        }}
      >
        {user?.firstName || "User"} {user?.lastName || ""}
      </Text>
      <Text style={{ color: "#9ca3af", fontSize: 16, marginBottom: 8 }}>
        {user?.emailAddresses[0]?.emailAddress}
      </Text>
      <Text style={{ color: "#6b7280", fontSize: 14 }}>
        Member since {stats?.joinDate}
      </Text>
    </Animated.View>
  );

  const renderStatsCards = () => {
    if (!stats) return null;

    const statCards = [
      {
        title: "Mood Entries",
        value: stats.totalMoodEntries.toString(),
        icon: "heart",
        color: "#ec4899",
      },
      {
        title: "Current Streak",
        value: `${stats.currentStreak} days`,
        icon: "flame",
        color: "#f59e0b",
      },
      {
        title: "Average Mood",
        value: `${stats.averageMood}/5`,
        icon: "trending-up",
        color: "#10b981",
      },
    ];

    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 15,
          }}
        >
          Your Progress
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {statCards.map((card, index) => (
            <View
              key={card.title}
              style={{
                flex: 1,
                backgroundColor: "#374151",
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: card.color + "30",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: card.color + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name={card.icon as any}
                  size={20}
                  color={card.color}
                />
              </View>
              <Text
                style={{
                  color: card.color,
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                {card.value}
              </Text>
              <Text
                style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}
              >
                {card.title}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      onPress={item.onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#374151",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#4b5563",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 16,
        }}
      >
        <Ionicons name={item.icon as any} size={20} color="#9ca3af" />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#fff",
            fontSize: 16,
            fontWeight: "500",
            marginBottom: 2,
          }}
        >
          {item.title}
        </Text>
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>{item.subtitle}</Text>
      </View>

      {item.type === "toggle" && (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: "#4b5563", true: "#3b82f6" }}
          thumbColor={item.value ? "#fff" : "#9ca3af"}
        />
      )}

      {item.type === "navigation" && (
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      )}
    </TouchableOpacity>
  );

  const renderSettings = () => (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <Text
        style={{
          color: "#fff",
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        Settings
      </Text>
      {settingsData.map(renderSettingItem)}
    </View>
  );

  const renderDangerZone = () => (
    <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
      <Text
        style={{
          color: "#ef4444",
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        Account
      </Text>

      <TouchableOpacity
        onPress={handleSignOut}
        disabled={signingOut}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#374151",
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: "#f59e0b30",
          opacity: signingOut ? 0.6 : 1,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#f59e0b20",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <Ionicons
            name={signingOut ? "hourglass" : "log-out"}
            size={20}
            color="#f59e0b"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#f59e0b", fontSize: 16, fontWeight: "500" }}>
            {signingOut ? "Signing Out..." : "Sign Out"}
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>
            {signingOut ? "Please wait..." : "Sign out of your account"}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDeleteAccount}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#374151",
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: "#ef444430",
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#ef444420",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "500" }}>
            Delete Account
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>
            Permanently delete your account
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <LinearGradient
        colors={["#0f0f0f", "#1f2937", "#111827", "#0f0f0f"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: "#374151",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>
            Profile
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#374151",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="refresh" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {renderProfileHeader()}
          {renderStatsCards()}
          {renderSettings()}
          {renderDangerZone()}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
