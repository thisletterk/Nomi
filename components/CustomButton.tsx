"use client";

import { View, TouchableOpacity, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  const insets = useSafeAreaInsets();

  const tabIcons: { [key: string]: string } = {
    index: "home",
    mood: "heart",
    chat: "chatbubble-ellipses",
    profile: "person",
  };

  const tabLabels: { [key: string]: string } = {
    index: "Home",
    mood: "Mood",
    chat: "Chat",
    profile: "Profile",
  };

  return (
    <LinearGradient
      colors={["#1f2937", "#111827"]}
      style={{
        flexDirection: "row",
        paddingBottom: insets.bottom,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#374151",
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 8,
            }}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: isFocused ? "#3b82f6" : "transparent",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Ionicons
                name={tabIcons[route.name] as any}
                size={24}
                color={isFocused ? "#3b82f6" : "#9ca3af"}
              />
            </View>
            <Text
              style={{
                color: isFocused ? "#3b82f6" : "#9ca3af",
                fontSize: 12,
                fontWeight: isFocused ? "600" : "400",
              }}
            >
              {tabLabels[route.name]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </LinearGradient>
  );
}
