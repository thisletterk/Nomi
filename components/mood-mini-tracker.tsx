"use client";

import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { MOOD_TYPES, type MoodEntry, type MoodType } from "../types/mood";
import { MoodStorage } from "../lib/mood-storage";
import { useUser } from "@clerk/clerk-expo";

interface MoodMiniTrackerProps {
  onMoodSaved?: (entry: MoodEntry) => void;
}

export default function MoodMiniTracker({ onMoodSaved }: MoodMiniTrackerProps) {
  const { user } = useUser();
  const [saving, setSaving] = useState(false);

  const handleQuickMood = async (mood: MoodType) => {
    if (!user) return;

    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const moodEntry: MoodEntry = {
        id: `mood_${Date.now()}_${user.id}`,
        userId: user.id,
        mood,
        intensity: mood.value,
        timestamp: Date.now(),
        date: today,
      };

      await MoodStorage.saveMoodEntry(moodEntry);
      onMoodSaved?.(moodEntry);
      Alert.alert(
        "Mood Saved! 🎉",
        `Your ${mood.name.toLowerCase()} mood has been recorded.`
      );
    } catch (error) {
      console.error("Error saving quick mood:", error);
      Alert.alert("Error", "Failed to save your mood.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#374151",
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 16,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Quick Mood Check 🌈
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        {MOOD_TYPES.map((mood) => (
          <TouchableOpacity
            key={mood.id}
            onPress={() => handleQuickMood(mood)}
            disabled={saving}
            style={{
              alignItems: "center",
              padding: 8,
              borderRadius: 12,
              backgroundColor: mood.color + "20",
              opacity: saving ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>{mood.emoji}</Text>
            <Text
              style={{ color: mood.color, fontSize: 10, fontWeight: "500" }}
            >
              {mood.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
