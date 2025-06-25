"use client";

import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MoodSelector from "@/components/mood-selector";
import MoodStatsView from "@/components/mood-stats";
import type { MoodEntry } from "@/types/mood";

export default function MoodScreen() {
  const [activeTab, setActiveTab] = useState<"track" | "analytics">("track");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMoodSaved = (entry: MoodEntry) => {
    console.log("🎉 Mood saved callback received:", entry.mood.name);
    // Force refresh of analytics when mood is saved
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      {/* Header with Tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#1f2937",
          borderBottomWidth: 1,
          borderBottomColor: "#374151",
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab("track")}
          style={{
            flex: 1,
            paddingVertical: 16,
            alignItems: "center",
            backgroundColor: activeTab === "track" ? "#3b82f6" : "transparent",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="heart"
              size={20}
              color={activeTab === "track" ? "#fff" : "#9ca3af"}
            />
            <Text
              style={{
                color: activeTab === "track" ? "#fff" : "#9ca3af",
                fontSize: 16,
                fontWeight: activeTab === "track" ? "bold" : "normal",
                marginLeft: 8,
              }}
            >
              Track Mood
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("analytics")}
          style={{
            flex: 1,
            paddingVertical: 16,
            alignItems: "center",
            backgroundColor:
              activeTab === "analytics" ? "#3b82f6" : "transparent",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="analytics"
              size={20}
              color={activeTab === "analytics" ? "#fff" : "#9ca3af"}
            />
            <Text
              style={{
                color: activeTab === "analytics" ? "#fff" : "#9ca3af",
                fontSize: 16,
                fontWeight: activeTab === "analytics" ? "bold" : "normal",
                marginLeft: 8,
              }}
            >
              Analytics
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "track" ? (
          <ScrollView
            style={{ flex: 1, marginBottom: 100 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <MoodSelector onMoodSaved={handleMoodSaved} />
          </ScrollView>
        ) : (
          <MoodStatsView key={refreshKey} />
        )}
      </View>
    </SafeAreaView>
  );
}
