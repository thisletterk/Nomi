import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMood } from "@/contexts/MoodContext";

const { width } = Dimensions.get("window");

function getLast7Days() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
    });
  }
  return days;
}

export default function MoodMain() {
  const { selectedMood, moodHistory } = useMood();

  // Build weekStats from moodHistory
  const last7Days = getLast7Days();
  const weekStats = last7Days.map(({ date, day }) => {
    const entry = moodHistory.find((h) => h.created_at.slice(0, 10) === date);
    return entry
      ? {
          day,
          mood: entry.mood,
          color: entry.color,
          label: entry.label,
          value: 4, // You can adjust this if you have intensity
        }
      : {
          day,
          mood: "–",
          color: "#E9E3D7",
          label: "No Entry",
          value: 1,
        };
  });

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: selectedMood?.color || "#FFF" },
      ]}
      edges={["bottom", "left", "right"]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: selectedMood?.color || "#FFF" },
        ]}
      >
        {/* Abstract background shapes */}
        <View style={styles.bgShape1} />
        <View style={styles.bgShape2} />
        <View style={styles.bgShape3} />

        {/* Top section: Large emoji and label */}
        <View style={styles.topSection}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emoji}>{selectedMood?.mood || "🙂"}</Text>
          </View>
          <Text style={styles.label}>
            {selectedMood?.label || "How do you feel?"}
          </Text>
        </View>

        {/* Bottom card: Mood Statistics */}
        <View style={styles.statsCard}>
          {/* Floating round stats button */}
          <View style={styles.statsButton}>
            <Text style={styles.statsButtonText}>{"\u2195"}</Text>
          </View>
          <Text style={styles.statsTitle}>Mood Statistics</Text>
          <View style={styles.barChartRow}>
            {weekStats.map((stat, idx) => (
              <View key={idx} style={styles.barItem}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: stat.value * 18 + 12,
                      backgroundColor: stat.color,
                      borderColor: stat.color,
                    },
                  ]}
                >
                  <Text style={styles.barEmoji}>{stat.mood}</Text>
                </View>
                <Text style={styles.barDay}>{stat.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: 32,
  },
  bgShape1: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFECB3",
    opacity: 0.5,
    zIndex: 0,
  },
  bgShape2: {
    position: "absolute",
    top: 60,
    right: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFF9C4",
    opacity: 0.5,
    zIndex: 0,
  },
  bgShape3: {
    position: "absolute",
    top: 180,
    left: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFDE7",
    opacity: 0.5,
    zIndex: 0,
  },
  topSection: {
    alignItems: "center",
    marginTop: 64,
    marginBottom: 12,
    width: "100%",
    zIndex: 1,
  },
  emojiCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emoji: {
    fontSize: 72,
  },
  label: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4D2C1D",
    textAlign: "center",
    marginBottom: 8,
  },
  statsCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: width,
    paddingTop: 48,
    paddingBottom: Platform.OS === "ios" ? 48 : 32,
    paddingHorizontal: 24,
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    zIndex: 2,
    minHeight: 260,
  },
  statsButton: {
    position: "absolute",
    top: -32,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4D2C1D",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statsButtonText: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4D2C1D",
    marginBottom: 18,
    alignSelf: "flex-start",
    marginTop: 16,
  },
  barChartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "flex-end",
    marginTop: 8,
  },
  barItem: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 6,
    position: "relative",
    borderWidth: 2,
  },
  barEmoji: {
    position: "absolute",
    top: -28,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 20,
  },
  barDay: {
    fontSize: 13,
    color: "#BCA27F",
    fontWeight: "bold",
    marginTop: 2,
  },
});
