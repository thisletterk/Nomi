import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";

// Define MoodType for clarity and reuse
type MoodType = {
  mood: string;
  label: string;
  color: string;
};

type HomeHeaderProps = {
  currentDate: string;
  greeting: string;
  userFirstName?: string;
  avatarUrl?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
  selectedMood?: MoodType | null;
};

const HomeHeader: React.FC<HomeHeaderProps> = ({
  currentDate,
  greeting,
  userFirstName,
  avatarUrl,
  notificationCount = 0,
  onNotificationPress,
  selectedMood,
}) => (
  <View style={styles.headerContainer}>
    {/* Top row: date and notification */}
    <View style={styles.topRow}>
      <Text style={styles.dateText}>{currentDate}</Text>
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={onNotificationPress}
        activeOpacity={0.7}
      >
        <Image
          source={require("@/assets/icons/bell.png")}
          style={styles.bellIcon}
        />
        {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
    {/* Greeting, badges, avatar */}
    <View style={styles.profileRow}>
      {avatarUrl && <Image source={{ uri: avatarUrl }} style={styles.avatar} />}
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={styles.greetingText}>
          {greeting}
          {userFirstName ? `, ${userFirstName}!` : "!"}
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.proBadge}>★ Pro</Text>
          <Text style={styles.streakBadge}>🔥 80%</Text>
          {selectedMood && (
            <Text style={[styles.moodBadge, { color: selectedMood.color }]}>
              {selectedMood.mood} {selectedMood.label}
            </Text>
          )}
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#4D2C1D",
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateText: {
    color: "#BCA27F",
    fontSize: 14,
    fontFamily: "JakartaMedium",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellIcon: {
    width: 22,
    height: 22,
    tintColor: "#FFAA4D",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF6347",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#FFD700",
    backgroundColor: "#FFF",
  },
  greetingText: {
    color: "#FFF",
    fontSize: 24,
    fontFamily: "JakartaBold",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  proBadge: {
    color: "#FFD700",
    fontSize: 16,
    fontFamily: "JakartaBold",
    marginRight: 16,
  },
  streakBadge: {
    color: "#FFAA4D",
    fontSize: 16,
    fontFamily: "JakartaBold",
    marginRight: 16,
  },
  moodBadge: {
    color: "#FFD6E0",
    fontSize: 16,
    fontFamily: "JakartaBold",
  },
});

export default HomeHeader;
