"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
  FlatList,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import MaskedView from "@react-native-masked-view/masked-view";
import type { MoodEntry } from "@/types/mood";
import { MoodStorage } from "@/lib/mood-storage";
import { MoodAnalytics } from "@/lib/mood-analytics";
// Add this import at the top
import DatabaseStatus from "@/components/database-status";

const { width, height } = Dimensions.get("window");

interface HomeSection {
  id: string;
  type:
    | "welcome"
    | "mood-check"
    | "quick-stats"
    | "recent-moods"
    | "quick-actions"
    | "insights";
  data?: any;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
}

const quickActions: QuickAction[] = [
  {
    id: "chat",
    title: "Chat with Nomi",
    subtitle: "Start a conversation",
    icon: "chatbubble-ellipses",
    color: "#3b82f6",
    route: "/chat",
  },
  {
    id: "voice",
    title: "Voice Chat",
    subtitle: "Talk naturally",
    icon: "mic",
    color: "#8b5cf6",
    route: "/chat",
  },
  {
    id: "mood",
    title: "Track Mood",
    subtitle: "How are you feeling?",
    icon: "heart",
    color: "#ec4899",
    route: "/mood",
  },
  {
    id: "insights",
    title: "View Insights",
    subtitle: "Your progress",
    icon: "analytics",
    color: "#10b981",
    route: "/mood",
  },
];

const GradientText = ({ text, style }: { text: string; style?: any }) => (
  <MaskedView
    maskElement={
      <Text style={[{ fontSize: 28, fontWeight: "bold" }, style]}>{text}</Text>
    }
  >
    <LinearGradient
      colors={["#3b82f6", "#ec4899", "#8b5cf6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text
        style={[
          { fontSize: 28, fontWeight: "bold", color: "transparent" },
          style,
        ]}
      >
        {text}
      </Text>
    </LinearGradient>
  </MaskedView>
);

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [todaysMood, setTodaysMood] = useState<MoodEntry | null>(null);
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [sections, setSections] = useState<HomeSection[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (user) {
      loadData();
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

  const loadData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const mood = await MoodStorage.getMoodEntryForDate(user.id, today);
      setTodaysMood(mood);

      // Get recent moods (last 7 days)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const recent = await MoodStorage.getMoodEntriesForDateRange(
        user.id,
        weekStartStr,
        today
      );
      setRecentMoods(recent.slice(0, 5));

      // Get weekly stats
      const stats = await MoodAnalytics.getWeeklyStats(user.id, weekStartStr);
      setWeeklyStats(stats);

      // Build sections
      const newSections: HomeSection[] = [
        { id: "welcome", type: "welcome" },
        { id: "mood-check", type: "mood-check", data: mood },
        { id: "quick-actions", type: "quick-actions" },
        { id: "quick-stats", type: "quick-stats", data: stats },
        { id: "recent-moods", type: "recent-moods", data: recent.slice(0, 3) },
        { id: "insights", type: "insights", data: { mood, stats } },
      ];
      setSections(newSections);
    } catch (error) {
      console.error("Error loading home data:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const renderWelcomeSection = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        padding: 20,
        alignItems: "center",
      }}
    >
      <GradientText
        text={`${getGreeting()}, ${user?.firstName || "there"}! 👋`}
        style={{ fontSize: 24 }}
      />
      <Text
        style={{
          color: "#9ca3af",
          fontSize: 16,
          textAlign: "center",
          marginTop: 8,
          lineHeight: 22,
        }}
      >
        Welcome back to your wellness journey.{"\n"}How can I support you today?
      </Text>
    </Animated.View>
  );

  const renderMoodCheckSection = () => (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <LinearGradient
        colors={
          todaysMood
            ? [todaysMood.mood.color + "20", todaysMood.mood.color + "10"]
            : ["#374151", "#4b5563"]
        }
        style={{
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: todaysMood ? todaysMood.mood.color + "30" : "#4b5563",
        }}
      >
        {todaysMood ? (
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 32, marginRight: 12 }}>
                {todaysMood.mood.emoji}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}
                >
                  Today's Mood
                </Text>
                <Text style={{ color: todaysMood.mood.color, fontSize: 14 }}>
                  {todaysMood.mood.name} • {todaysMood.intensity}/5
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/mood")}
                style={{
                  backgroundColor: todaysMood.mood.color + "30",
                  borderRadius: 15,
                  padding: 8,
                }}
              >
                <Ionicons
                  name="create"
                  size={16}
                  color={todaysMood.mood.color}
                />
              </TouchableOpacity>
            </View>
            {todaysMood.note && (
              <Text
                style={{ color: "#e5e7eb", fontSize: 14, fontStyle: "italic" }}
              >
                "{todaysMood.note}"
              </Text>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/mood")}
            style={{ alignItems: "center" }}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🌈</Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              How are you feeling today?
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 14 }}>
              Tap to track your mood
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  const renderQuickActions = () => (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <Text
        style={{
          color: "#fff",
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        Quick Actions
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={() => router.push(action.route as any)}
            style={{
              width: (width - 52) / 2,
              backgroundColor: "#374151",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: action.color + "30",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: action.color + "20",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name={action.icon as any}
                size={20}
                color={action.color}
              />
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 4,
              }}
            >
              {action.title}
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>
              {action.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuickStats = () => {
    if (!weeklyStats || weeklyStats.totalEntries === 0) return null;

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
          This Week
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#374151",
              borderRadius: 16,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Ionicons name="trending-up" size={24} color="#10b981" />
            <Text
              style={{
                color: "#10b981",
                fontSize: 20,
                fontWeight: "bold",
                marginTop: 8,
              }}
            >
              {weeklyStats.averageMood.toFixed(1)}
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>Avg Mood</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#374151",
              borderRadius: 16,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Ionicons name="calendar" size={24} color="#3b82f6" />
            <Text
              style={{
                color: "#3b82f6",
                fontSize: 20,
                fontWeight: "bold",
                marginTop: 8,
              }}
            >
              {weeklyStats.totalEntries}
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>Check-ins</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#374151",
              borderRadius: 16,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Ionicons name="flame" size={24} color="#f59e0b" />
            <Text
              style={{
                color: "#f59e0b",
                fontSize: 20,
                fontWeight: "bold",
                marginTop: 8,
              }}
            >
              {weeklyStats.streak}
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>Day Streak</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRecentMoods = () => {
    if (recentMoods.length === 0) return null;

    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
            Recent Moods
          </Text>
          <TouchableOpacity onPress={() => router.push("/mood")}>
            <Text style={{ color: "#3b82f6", fontSize: 14 }}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {recentMoods.slice(0, 3).map((mood, index) => (
            <View
              key={mood.id}
              style={{
                flex: 1,
                backgroundColor: "#374151",
                borderRadius: 12,
                padding: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: mood.mood.color + "30",
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>
                {mood.mood.emoji}
              </Text>
              <Text
                style={{
                  color: mood.mood.color,
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                {mood.mood.name}
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 10, marginTop: 2 }}>
                {new Date(mood.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderInsights = () => {
    if (!weeklyStats || weeklyStats.totalEntries === 0) return null;

    const insights = [];
    if (weeklyStats.averageMood >= 4) {
      insights.push("🌟 You've been feeling great this week!");
    } else if (weeklyStats.averageMood <= 2) {
      insights.push(
        "💙 Remember, it's okay to have tough days. I'm here for you."
      );
    }

    if (weeklyStats.streak >= 7) {
      insights.push("🔥 Amazing! You've been consistent with mood tracking.");
    }

    if (insights.length === 0) return null;

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
          Insights
        </Text>
        {insights.map((insight, index) => (
          <View
            key={index}
            style={{
              backgroundColor: "#374151",
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderLeftWidth: 4,
              borderLeftColor: "#3b82f6",
            }}
          >
            <Text style={{ color: "#e5e7eb", fontSize: 14, lineHeight: 20 }}>
              {insight}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderSection: ListRenderItem<HomeSection> = ({ item }) => {
    switch (item.type) {
      case "welcome":
        return renderWelcomeSection();
      case "mood-check":
        return renderMoodCheckSection();
      case "quick-actions":
        return renderQuickActions();
      case "quick-stats":
        return renderQuickStats();
      case "recent-moods":
        return renderRecentMoods();
      case "insights":
        return renderInsights();
      default:
        return null;
    }
  };

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
          <View>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
              Nomi
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>
              Your wellness companion
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
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

            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#10b981",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                {user?.firstName?.charAt(0) || "U"}
              </Text>
            </View>
          </View>
        </View>

        {/* Database Status - Add this line */}
        {/* <DatabaseStatus /> */}

        {/* Content - Using FlatList to avoid nesting issues */}
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}
