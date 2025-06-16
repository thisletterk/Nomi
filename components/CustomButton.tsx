"use client";

import type React from "react";

import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
  icon?: React.ReactNode;
}

export default function CustomButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "medium",
  icon,
}: CustomButtonProps) {
  const getButtonHeight = () => {
    switch (size) {
      case "small":
        return 40;
      case "large":
        return 56;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "large":
        return 18;
      default:
        return 16;
    }
  };

  const getColors = (): [string, string, ...string[]] => {
    switch (variant) {
      case "secondary":
        return ["#6b7280", "#4b5563"];
      case "outline":
        return ["transparent", "transparent"];
      default:
        return ["#3b82f6", "#1d4ed8"];
    }
  };

  const isDisabled = disabled || loading;

  if (variant === "outline") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={{
          height: getButtonHeight(),
          borderRadius: 12,
          borderWidth: 2,
          borderColor: isDisabled ? "#6b7280" : "#3b82f6",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          opacity: isDisabled ? 0.5 : 1,
          paddingHorizontal: 20,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#3b82f6" />
        ) : (
          <>
            {icon && <>{icon}</>}
            <Text
              style={{
                color: isDisabled ? "#6b7280" : "#3b82f6",
                fontSize: getFontSize(),
                fontWeight: "600",
                marginLeft: icon ? 8 : 0,
              }}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={{
        height: getButtonHeight(),
        borderRadius: 12,
        overflow: "hidden",
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      <LinearGradient
        colors={getColors()}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          paddingHorizontal: 20,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            {icon && <>{icon}</>}
            <Text
              style={{
                color: "#fff",
                fontSize: getFontSize(),
                fontWeight: "600",
                marginLeft: icon ? 8 : 0,
              }}
            >
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}
