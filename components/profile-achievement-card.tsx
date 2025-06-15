"use client";

import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

interface ProfileAchievementCardProps {
  achievement: Achievement;
}

export default function ProfileAchievementCard({
  achievement,
}: ProfileAchievementCardProps) {
  const progressPercentage =
    achievement.progress && achievement.maxProgress
      ? (achievement.progress / achievement.maxProgress) * 100
      : 0;

  return (
    <View
      style={{
        backgroundColor: "#374151",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: achievement.unlocked
          ? achievement.color + "30"
          : "#4b5563",
        opacity: achievement.unlocked ? 1 : 0.6,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: achievement.unlocked
              ? achievement.color + "20"
              : "#4b5563",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <Ionicons
            name={achievement.icon as any}
            size={24}
            color={achievement.unlocked ? achievement.color : "#6b7280"}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: achievement.unlocked ? "#fff" : "#9ca3af",
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            {achievement.title}
          </Text>
          <Text
            style={{
              color: "#9ca3af",
              fontSize: 14,
              lineHeight: 18,
            }}
          >
            {achievement.description}
          </Text>
        </View>

        {achievement.unlocked && (
          <View
            style={{
              backgroundColor: achievement.color + "20",
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                color: achievement.color,
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              ✓ Unlocked
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {achievement.progress !== undefined &&
        achievement.maxProgress &&
        !achievement.unlocked && (
          <View>
            <View
              style={{
                height: 6,
                backgroundColor: "#4b5563",
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${progressPercentage}%`,
                  backgroundColor: achievement.color,
                  borderRadius: 3,
                }}
              />
            </View>
            <Text
              style={{ color: "#6b7280", fontSize: 12, textAlign: "right" }}
            >
              {achievement.progress}/{achievement.maxProgress}
            </Text>
          </View>
        )}
    </View>
  );
}
