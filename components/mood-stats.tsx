"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { type MoodStats, MOOD_TYPES } from "../types/mood";
import { MoodAnalytics } from "../lib/mood-analytics";

const { width } = Dimensions.get("window");

type StatsPeriod = "day" | "week" | "month";

export default function MoodStatsView() {
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>("week");
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [selectedPeriod]);

  const loadStats = async () => {
    setLoading(true);
    try {
      let statsData: MoodStats;
      const today = new Date();

      switch (selectedPeriod) {
        case "day":
          const todayStr = today.toISOString().split("T")[0];
          statsData = await MoodAnalytics.getDailyStats(todayStr);
          break;
        case "week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekStartStr = weekStart.toISOString().split("T")[0];
          statsData = await MoodAnalytics.getWeeklyStats(weekStartStr);
          break;
        case "month":
          statsData = await MoodAnalytics.getMonthlyStats(
            today.getFullYear(),
            today.getMonth() + 1
          );
          break;
      }

      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (averageMood: number): string => {
    const mood = MOOD_TYPES.find((m) => Math.abs(m.value - averageMood) < 0.5);
    return mood?.emoji || "😐";
  };

  const getMoodColor = (averageMood: number): string => {
    const mood = MOOD_TYPES.find((m) => Math.abs(m.value - averageMood) < 0.5);
    return mood?.color || "#6b7280";
  };

  const renderPeriodSelector = () => (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#374151",
        borderRadius: 25,
        padding: 4,
        marginBottom: 20,
      }}
    >
      {(["day", "week", "month"] as StatsPeriod[]).map((period) => (
        <TouchableOpacity
          key={period}
          onPress={() => setSelectedPeriod(period)}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 20,
            backgroundColor:
              selectedPeriod === period ? "#3b82f6" : "transparent",
          }}
        >
          <Text
            style={{
              color: selectedPeriod === period ? "#fff" : "#9ca3af",
              textAlign: "center",
              fontWeight: selectedPeriod === period ? "bold" : "normal",
              textTransform: "capitalize",
            }}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewCard = () => {
    if (!stats || stats.totalEntries === 0) {
      return (
        <View
          style={{
            backgroundColor: "#374151",
            borderRadius: 20,
            padding: 20,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 10 }}>📊</Text>
          <Text style={{ color: "#9ca3af", fontSize: 16, textAlign: "center" }}>
            No mood data for this {selectedPeriod} yet.{"\n"}
            Start tracking your mood to see insights!
          </Text>
        </View>
      );
    }

    return (
      <LinearGradient
        colors={[
          getMoodColor(stats.averageMood) + "20",
          getMoodColor(stats.averageMood) + "10",
        ]}
        style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: getMoodColor(stats.averageMood) + "30",
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 15 }}>
          <Text style={{ fontSize: 48, marginBottom: 5 }}>
            {getMoodEmoji(stats.averageMood)}
          </Text>
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              textTransform: "capitalize",
            }}
          >
            Average {selectedPeriod} Mood
          </Text>
          <Text
            style={{
              color: getMoodColor(stats.averageMood),
              fontSize: 24,
              fontWeight: "bold",
            }}
          >
            {stats.averageMood.toFixed(1)}/5.0
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            paddingTop: 15,
            borderTopWidth: 1,
            borderTopColor: "#4b5563",
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Ionicons name="calendar" size={20} color="#3b82f6" />
            <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
              Entries
            </Text>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              {stats.totalEntries}
            </Text>
          </View>

          <View style={{ alignItems: "center" }}>
            <Ionicons name="flame" size={20} color="#f59e0b" />
            <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
              Streak
            </Text>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              {stats.streak} days
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderMoodDistribution = () => {
    if (!stats || stats.totalEntries === 0) return null;

    return (
      <View
        style={{
          backgroundColor: "#374151",
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 15,
            textAlign: "center",
          }}
        >
          Mood Distribution
        </Text>

        {MOOD_TYPES.map((mood) => {
          const count = stats.moodDistribution[mood.id] || 0;
          const percentage =
            stats.totalEntries > 0 ? (count / stats.totalEntries) * 100 : 0;

          return (
            <View key={mood.id} style={{ marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>
                    {mood.emoji}
                  </Text>
                  <Text style={{ color: "#e5e7eb", fontSize: 14 }}>
                    {mood.name}
                  </Text>
                </View>
                <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                  {count} ({percentage.toFixed(0)}%)
                </Text>
              </View>

              <View
                style={{
                  height: 6,
                  backgroundColor: "#4b5563",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${percentage}%`,
                    backgroundColor: mood.color,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="hourglass" size={32} color="#3b82f6" />
        <Text style={{ color: "#9ca3af", marginTop: 10 }}>
          Loading stats...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <View style={{ padding: 20, paddingBottom: 100 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#fff",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Mood Analytics 📊
        </Text>

        {renderPeriodSelector()}
        {renderOverviewCard()}
        {renderMoodDistribution()}
      </View>
    </ScrollView>
  );
}
