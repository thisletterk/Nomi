"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";
import MoodSelector from "@/components/mood-selector";
import MoodStatsView from "@/components/mood-stats";
import type { MoodEntry } from "@/types/mood";
import { MoodStorage } from "@/lib/mood-storage";

type MoodTabView = "today" | "stats";

export default function MoodTab() {
  const { user } = useUser();
  const [activeView, setActiveView] = useState<MoodTabView>("today");
  const [todaysMood, setTodaysMood] = useState<MoodEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadTodaysMood();
    }
  }, [user]);

  const loadTodaysMood = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const mood = await MoodStorage.getMoodEntryForDate(user.id, today);
      setTodaysMood(mood);
    } catch (error) {
      console.error("Error loading today's mood:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTodaysMood();
    setRefreshing(false);
  };

  const handleMoodSaved = (entry: MoodEntry) => {
    setTodaysMood(entry);
  };

  const renderTabSelector = () => (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#1f2937",
        borderRadius: 25,
        padding: 4,
        marginHorizontal: 20,
        marginBottom: 20,
      }}
    >
      <TouchableOpacity
        onPress={() => setActiveView("today")}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 20,
          backgroundColor: activeView === "today" ? "#3b82f6" : "transparent",
        }}
      >
        <Text
          style={{
            color: activeView === "today" ? "#fff" : "#9ca3af",
            textAlign: "center",
            fontWeight: activeView === "today" ? "bold" : "normal",
            fontSize: 16,
          }}
        >
          Today's Mood
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActiveView("stats")}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 20,
          backgroundColor: activeView === "stats" ? "#3b82f6" : "transparent",
        }}
      >
        <Text
          style={{
            color: activeView === "stats" ? "#fff" : "#9ca3af",
            textAlign: "center",
            fontWeight: activeView === "stats" ? "bold" : "normal",
            fontSize: 16,
          }}
        >
          Analytics
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTodaysView = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: 120, // Extra padding for bottom navigation
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      keyboardShouldPersistTaps="handled"
    >
      {todaysMood && (
        <View
          style={{
            margin: 20,
            backgroundColor: "#374151",
            borderRadius: 20,
            padding: 20,
            borderWidth: 2,
            borderColor: todaysMood.mood.color + "40",
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 15 }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>
              {todaysMood.mood.emoji}
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Today you're feeling {todaysMood.mood.name.toLowerCase()}
            </Text>
            <Text
              style={{
                color: todaysMood.mood.color,
                fontSize: 16,
                marginTop: 4,
              }}
            >
              Intensity: {todaysMood.intensity}/5
            </Text>
            {todaysMood.note && (
              <View
                style={{
                  marginTop: 10,
                  padding: 12,
                  backgroundColor: "#4b5563",
                  borderRadius: 10,
                  width: "100%",
                }}
              >
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontSize: 14,
                    fontStyle: "italic",
                  }}
                >
                  "{todaysMood.note}"
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setTodaysMood(null)}
            style={{
              backgroundColor: "#6b7280",
              borderRadius: 10,
              padding: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "500" }}>
              Update Today's Mood
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <MoodSelector onMoodSaved={handleMoodSaved} existingEntry={todaysMood} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <LinearGradient
        colors={["#0f0f0f", "#1f2937", "#0f0f0f"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: "#374151",
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#fff",
              textAlign: "center",
            }}
          >
            Mood Tracker 🌈
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#9ca3af",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Track your emotional journey
          </Text>
        </View>

        {renderTabSelector()}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {activeView === "today" ? renderTodaysView() : <MoodStatsView />}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
