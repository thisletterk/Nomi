"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  notificationService,
  type NotificationSettings,
} from "@/lib/notification-service";

interface NotificationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const FREQUENCY_OPTIONS = [
  { key: "daily", label: "Once Daily", description: "One reminder per day" },
  {
    key: "twice-daily",
    label: "Twice Daily",
    description: "Morning and evening",
  },
  {
    key: "three-times",
    label: "Three Times",
    description: "Morning, afternoon, evening",
  },
  { key: "custom", label: "Custom", description: "Set your own times" },
];

const PRESET_TIMES = {
  daily: ["10:00"],
  "twice-daily": ["10:00", "18:00"],
  "three-times": ["09:00", "15:00", "21:00"],
};

export default function NotificationSettingsModal({
  visible,
  onClose,
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(
    notificationService.getSettings()
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSettings(notificationService.getSettings());
    }
  }, [visible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationService.saveSettings(settings);
      Alert.alert(
        "Settings Saved! ✅",
        "Your notification preferences have been updated.",
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to save notification settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleFrequencyChange = (
    frequency: NotificationSettings["frequency"]
  ) => {
    const newTimes =
      frequency === "custom"
        ? settings.times
        : PRESET_TIMES[frequency] || ["10:00"];
    setSettings({
      ...settings,
      frequency,
      times: newTimes,
    });
  };

  const renderFrequencyOption = (option: (typeof FREQUENCY_OPTIONS)[0]) => (
    <TouchableOpacity
      key={option.key}
      onPress={() =>
        handleFrequencyChange(option.key as NotificationSettings["frequency"])
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor:
          settings.frequency === option.key ? "#3b82f620" : "#374151",
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor:
          settings.frequency === option.key ? "#3b82f6" : "transparent",
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor:
            settings.frequency === option.key ? "#3b82f6" : "#6b7280",
          backgroundColor:
            settings.frequency === option.key ? "#3b82f6" : "transparent",
          marginRight: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {settings.frequency === option.key && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#fff",
            }}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>
          {option.label}
        </Text>
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>
          {option.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
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
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#9ca3af" />
          </TouchableOpacity>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
            Mood Reminders
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: "#3b82f6",
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Enable/Disable Toggle */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#374151",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>
                Enable Reminders
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                Get notified to track your mood
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => setSettings({ ...settings, enabled })}
              trackColor={{ false: "#4b5563", true: "#3b82f6" }}
              thumbColor={settings.enabled ? "#fff" : "#9ca3af"}
            />
          </View>

          {settings.enabled && (
            <>
              {/* Frequency Selection */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "bold",
                    marginBottom: 12,
                  }}
                >
                  Reminder Frequency
                </Text>
                {FREQUENCY_OPTIONS.map(renderFrequencyOption)}
              </View>

              {/* Current Schedule Preview */}
              <View
                style={{
                  backgroundColor: "#374151",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  Your Schedule
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {settings.times.map((time, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: "#3b82f620",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: "#3b82f6",
                      }}
                    >
                      <Text style={{ color: "#3b82f6", fontSize: 14 }}>
                        {time}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Tips */}
              <View
                style={{
                  backgroundColor: "#1f2937",
                  borderRadius: 12,
                  padding: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: "#10b981",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="bulb" size={20} color="#10b981" />
                  <Text
                    style={{
                      color: "#10b981",
                      fontSize: 16,
                      fontWeight: "500",
                      marginLeft: 8,
                    }}
                  >
                    Tips for Success
                  </Text>
                </View>
                <Text
                  style={{ color: "#e5e7eb", fontSize: 14, lineHeight: 20 }}
                >
                  • Consistent tracking helps identify patterns{"\n"}• Choose
                  times when you can reflect honestly{"\n"}• Don't worry about
                  "perfect" moods - all feelings are valid{"\n"}• Use notes to
                  add context to your mood entries
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
