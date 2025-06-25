"use client";

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { MoodPrompt } from "@/lib/mood-prompts";

interface MoodPromptModalProps {
  visible: boolean;
  prompt: MoodPrompt | null;
  onClose: () => void;
  onTrackMood: () => void;
}

export default function MoodPromptModal({
  visible,
  prompt,
  onClose,
  onTrackMood,
}: MoodPromptModalProps) {
  const router = useRouter();
  const [scaleAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!prompt) return null;

  const getPromptEmoji = (type: string) => {
    switch (type) {
      case "morning":
        return "🌅";
      case "afternoon":
        return "🌤️";
      case "evening":
        return "🌙";
      default:
        return "💭";
    }
  };

  const getPromptColor = (type: string) => {
    switch (type) {
      case "morning":
        return ["#f59e0b", "#fbbf24"];
      case "afternoon":
        return ["#3b82f6", "#60a5fa"];
      case "evening":
        return ["#8b5cf6", "#a78bfa"];
      default:
        return ["#6b7280", "#9ca3af"];
    }
  };

  const handleTrackMood = () => {
    onClose();
    onTrackMood();
    router.push("/mood");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            width: "100%",
            maxWidth: 350,
          }}
        >
          <LinearGradient
            colors={getPromptColor(prompt.type)}
            style={{
              borderRadius: 24,
              padding: 24,
              alignItems: "center",
            }}
          >
            {/* Close button */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>

            {/* Emoji */}
            <Text style={{ fontSize: 48, marginBottom: 16 }}>
              {getPromptEmoji(prompt.type)}
            </Text>

            {/* Title */}
            <Text
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {prompt.title}
            </Text>

            {/* Message */}
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 16,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 22,
              }}
            >
              {prompt.message}
            </Text>

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                >
                  Later
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTrackMood}
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: getPromptColor(prompt.type)[0],
                    fontSize: 16,
                    fontWeight: "bold",
                  }}
                >
                  Track Mood
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}
