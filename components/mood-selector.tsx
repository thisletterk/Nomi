"use client";

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { type MoodEntry, type MoodType, MOOD_TYPES } from "../types/mood";
import { MoodDatabase } from "../lib/mood-database";
import { MoodAnalytics } from "../lib/mood-analytics";
import { useUser } from "@clerk/clerk-expo";
// import { __DEV__ } from "react-native"

const { width } = Dimensions.get("window");

interface MoodSelectorProps {
  onMoodSaved?: (entry: MoodEntry) => void;
  existingEntry?: MoodEntry | null;
}

export default function MoodSelector({
  onMoodSaved,
  existingEntry,
}: MoodSelectorProps) {
  const { user } = useUser();
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [moodTypes, setMoodTypes] = useState<MoodType[]>(MOOD_TYPES);
  const [scaleAnim] = useState(new Animated.Value(1));
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadMoodTypes();
    initializeDatabase();
    // Debug database on component mount
    if (user) {
      debugCurrentState();
    }
  }, [user]);

  const initializeDatabase = async () => {
    try {
      await MoodDatabase.initializeDatabase();
      console.log("✅ Database initialized in mood selector");
    } catch (error) {
      console.error("❌ Failed to initialize database:", error);
    }
  };

  const debugCurrentState = async () => {
    if (!user) return;
    console.log("🔍 === MOOD SELECTOR DEBUG ===");
    await MoodDatabase.debugDatabase(user.id);
    await MoodAnalytics.debugAnalytics(user.id);
    console.log("🔍 === END DEBUG ===");
  };

  const loadMoodTypes = async () => {
    try {
      const types = await MoodDatabase.getMoodTypes();
      setMoodTypes(types);
      console.log("📝 Loaded mood types:", types.length);
    } catch (error) {
      console.error("Error loading mood types:", error);
      setMoodTypes(MOOD_TYPES);
    }
  };

  const handleMoodSelect = (mood: MoodType) => {
    console.log("🎯 Mood selected:", mood.name);
    setSelectedMood(mood);
    setIntensity(mood.value);

    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetForm = () => {
    console.log("🔄 Resetting form");
    setSelectedMood(null);
    setIntensity(3);
    setNote("");
    if (textInputRef.current) {
      textInputRef.current.clear();
    }
  };

  const handleSaveMood = async () => {
    if (!selectedMood || !user) {
      Alert.alert("Error", "Please select a mood first");
      return;
    }

    console.log("💾 Starting mood save process...");
    setSaving(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const timestamp = Date.now();

      const moodEntry: MoodEntry = {
        id: `mood_${timestamp}_${user.id}_${Math.random().toString(36).substring(2, 15)}`,
        userId: user.id,
        mood: selectedMood,
        intensity,
        note: note.trim(),
        timestamp,
        date: today,
      };

      console.log("💾 Saving mood entry to database:", moodEntry);

      // Save to database
      await MoodDatabase.saveMoodEntry(moodEntry);

      // Verify it was saved
      const verification = await MoodDatabase.getAllMoodEntries(user.id);
      console.log(
        "✅ Verification: User now has",
        verification.length,
        "mood entries in database"
      );

      // Call the callback to refresh parent components
      console.log("📢 Calling onMoodSaved callback...");
      onMoodSaved?.(moodEntry);

      // Dismiss keyboard first
      Keyboard.dismiss();

      Alert.alert(
        "Mood Saved! 🎉",
        `Your ${selectedMood.name.toLowerCase()} mood has been recorded for today.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Debug after save
              setTimeout(() => {
                debugCurrentState();
              }, 1000);
            },
          },
        ]
      );

      // Reset form after successful save
      setTimeout(() => {
        resetForm();
      }, 100);
    } catch (error) {
      console.error("❌ Error saving mood:", error);
      Alert.alert(
        "Error",
        `Failed to save your mood: ${
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message?: string }).message
            : "Please try again."
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Debug Info */}
      {/* {__DEV__ && (
        <TouchableOpacity
          onPress={debugCurrentState}
          style={{
            backgroundColor: "#374151",
            padding: 10,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 12 }}>
            🔍 Debug Database (Dev Only)
          </Text>
        </TouchableOpacity>
      )} */}

      {/* Header */}
      <View style={{ alignItems: "center", marginBottom: 30 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#fff",
            marginBottom: 8,
          }}
        >
          How are you feeling right now?
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          Track your mood to better understand your emotional patterns
        </Text>
      </View>

      {/* Mood Selection */}
      <View style={{ marginBottom: 30 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#e5e7eb",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Select your mood
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            flexWrap: "wrap",
            gap: 15,
          }}
        >
          {moodTypes.map((mood) => (
            <TouchableOpacity
              key={mood.id}
              onPress={() => handleMoodSelect(mood)}
              style={{
                alignItems: "center",
                padding: 15,
                borderRadius: 20,
                backgroundColor:
                  selectedMood?.id === mood.id ? mood.color + "20" : "#374151",
                borderWidth: 2,
                borderColor:
                  selectedMood?.id === mood.id ? mood.color : "transparent",
                minWidth: (width - 80) / 3,
              }}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>
                  {mood.emoji}
                </Text>
              </Animated.View>
              <Text
                style={{
                  color: selectedMood?.id === mood.id ? mood.color : "#e5e7eb",
                  fontSize: 12,
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                {mood.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Intensity Slider */}
      {selectedMood && (
        <View style={{ marginBottom: 30 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#e5e7eb",
              marginBottom: 15,
            }}
          >
            Intensity Level: {intensity}/5
          </Text>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setIntensity(level)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor:
                    intensity >= level ? selectedMood.color : "#374151",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor:
                    intensity >= level ? selectedMood.color : "#4b5563",
                }}
              >
                <Text
                  style={{
                    color: intensity >= level ? "#fff" : "#9ca3af",
                    fontWeight: "bold",
                  }}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Note Input */}
      <View style={{ marginBottom: 30 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#e5e7eb",
            marginBottom: 10,
          }}
        >
          Add a note (optional)
        </Text>
        <TextInput
          ref={textInputRef}
          value={note}
          onChangeText={setNote}
          placeholder="What's contributing to this mood?"
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: "#374151",
            borderRadius: 12,
            padding: 15,
            color: "#fff",
            fontSize: 16,
            textAlignVertical: "top",
            borderWidth: 1,
            borderColor: "#4b5563",
            minHeight: 80,
          }}
          maxLength={200}
          returnKeyType="done"
          blurOnSubmit={true}
        />
        <Text
          style={{
            color: "#6b7280",
            fontSize: 12,
            textAlign: "right",
            marginTop: 5,
          }}
        >
          {note.length}/200
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSaveMood}
        disabled={!selectedMood || saving}
        style={{ opacity: !selectedMood || saving ? 0.5 : 1 }}
      >
        <LinearGradient
          colors={
            selectedMood
              ? [selectedMood.color, selectedMood.color + "CC"]
              : ["#6b7280", "#4b5563"]
          }
          style={{
            borderRadius: 25,
            padding: 18,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          {saving ? (
            <Ionicons
              name="hourglass"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
          ) : (
            <Ionicons
              name="add-circle"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            {saving ? "Saving..." : "Save Mood Entry"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Info Text */}
      <Text
        style={{
          color: "#6b7280",
          fontSize: 12,
          textAlign: "center",
          marginTop: 15,
          fontStyle: "italic",
        }}
      >
        Each mood entry will be saved to your database
      </Text>
    </View>
  );
}
