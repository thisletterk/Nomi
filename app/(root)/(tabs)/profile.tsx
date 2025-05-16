// app/(root)/(tabs)/settings.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fontSizes } from "@/constants/fontSizes";

export default function ProfileScreen() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode((previousState) => !previousState);
    // TODO: Implement actual dark mode functionality
  };

  // Section header component
  interface SectionHeaderProps {
    title: string;
    hasMoreOptions?: boolean;
  }

  const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    hasMoreOptions = true,
  }) => (
    <View className="flex-row justify-between items-center mb-2 mt-6">
      <Text className="text-[#5e4433] font-medium">{title}</Text>
      {hasMoreOptions && (
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color="#5e4433" />
        </TouchableOpacity>
      )}
    </View>
  );

  interface SettingsItemProps {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    rightText?: string;
    rightElement?: React.ReactNode;
    hasChevron?: boolean;
    noBorder?: boolean;
    textColor?: string;
    iconColor?: string;
    backgroundColor?: string;
    onPress?: () => void;
  }

  // Settings item component
  const SettingsItem: React.FC<SettingsItemProps> = ({
    icon,
    title,
    rightText,
    rightElement,
    hasChevron = true,
    noBorder = false,
    textColor = "#333",
    iconColor = "#666",
    backgroundColor = "white",
    onPress,
  }) => (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-4 px-5 ${!noBorder ? "border-b border-gray-100" : ""}`}
      style={{ backgroundColor }}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text className={`ml-3 font-medium`} style={{ color: textColor }}>
          {title}
        </Text>
      </View>
      <View className="flex-row items-center">
        {rightText && <Text className="text-gray-400 mr-2">{rightText}</Text>}
        {rightElement}
        {hasChevron && (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8f8f8]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="bg-primary-blue py-6 px-6 rounded-b-3xl">
        <TouchableOpacity
          className="bg-white/30 rounded-full p-2 w-10 h-10 items-center justify-center mb-4"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text
          className="text-white font-bold"
          style={{ fontSize: fontSizes.subheading }}
        >
          Account Settings
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 100 }} // Add padding to the bottom
        showsVerticalScrollIndicator={false}
      >
        {/* General Settings */}
        <SectionHeader title="General Settings" />
        <View className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm">
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            onPress={() => {
              // TODO: Navigate to notifications settings page
              router.push("/(root)/settings/notifications");
              console.log("Navigate to notifications settings");
            }}
          />
          <SettingsItem
            icon="person-outline"
            title="Personal Information"
            onPress={() => {
              // TODO: Navigate to personal information page
              router.push("/(root)/settings/personal-information");
              console.log("Navigate to personal information");
            }}
          />
          <SettingsItem
            icon="alert-circle-outline"
            title="Emergency Contact"
            rightText="15+"
            onPress={() => {
              // TODO: Navigate to emergency contacts page
              router.push("/(root)/settings/emergency-contacts");
              console.log("Navigate to emergency contacts");
            }}
          />
          <SettingsItem
            icon="language-outline"
            title="Language"
            rightText="English (EN)"
            onPress={() => {
              // TODO: Navigate to language settings page
              // router.push("/(root)/settings/language");
              console.log("Navigate to language settings");
            }}
          />
          <SettingsItem
            icon="moon-outline"
            title="Dark Mode"
            hasChevron={false}
            rightElement={
              <Switch
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={isDarkMode ? "#fff" : "#fff"}
                ios_backgroundColor="#e0e0e0"
                onValueChange={toggleDarkMode}
                value={isDarkMode}
              />
            }
          />
          <SettingsItem
            icon="people-outline"
            title="Invite Friends"
            onPress={() => {
              // TODO: Navigate to invite friends page
              // router.push("/(root)/settings/invite-friends");
              console.log("Navigate to invite friends");
            }}
          />
          <SettingsItem
            icon="chatbubble-ellipses-outline"
            title="Submit Feedback"
            noBorder
            onPress={() => {
              // TODO: Navigate to feedback submission page
              router.push("/(root)/settings/feedback");
              console.log("Navigate to feedback submission");
            }}
          />
        </View>

        {/* Security & Privacy */}
        <SectionHeader title="Security & Privacy" />
        <View className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm">
          <SettingsItem
            icon="shield-checkmark-outline"
            title="Security"
            onPress={() => {
              // TODO: Navigate to security settings page
              router.push("/(root)/settings/security");
              console.log("Navigate to security settings");
            }}
          />
          <SettingsItem
            icon="help-circle-outline"
            title="Help Center"
            noBorder
            onPress={() => {
              // TODO: Navigate to help center page
              router.push("/(root)/settings/help-center");
              console.log("Navigate to help center");
            }}
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" hasMoreOptions={false} />
        <View className="bg-[#fbe3d7] rounded-2xl overflow-hidden mb-6 shadow-sm">
          <SettingsItem
            icon="trash-outline"
            title="Close Account"
            noBorder
            textColor="#e67e51"
            iconColor="#e67e51"
            backgroundColor="#fbe3d7"
            onPress={() => {
              // TODO: Navigate to account closure confirmation page
              router.push("/(root)/settings/close-account");
              console.log("Navigate to close account");
            }}
          />
        </View>

        {/* Log Out */}
        <SectionHeader title="Log Out" />
        <View className="bg-white rounded-2xl overflow-hidden mb-10 shadow-sm">
          <SettingsItem
            icon="log-out-outline"
            title="Log Out"
            noBorder
            onPress={() => {
              // TODO: Implement logout functionality
              // handleLogout();
              console.log("Logging out user");
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
