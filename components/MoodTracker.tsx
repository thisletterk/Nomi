import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { fontSizes } from "@/constants/fontSizes";

type MoodItem = {
  id: string;
  mood: string;
  icon: string;
  color: string;
};

type MoodTrackerProps = {
  moodData: MoodItem[];
  selectedMoodId: string | null;
  onSelectMood: (id: string) => void;
  largeIcons?: boolean;
};

const MoodTracker: React.FC<MoodTrackerProps> = ({
  moodData,
  selectedMoodId,
  onSelectMood,
  largeIcons = true,
}) => (
  <View>
    <Text style={styles.sectionHeader}>How do you feel today?</Text>
    <FlatList
      data={moodData}
      renderItem={({ item }) => {
        const isSelected = item.id === selectedMoodId;
        return (
          <TouchableOpacity
            style={[styles.moodButton, largeIcons && { marginVertical: 12 }]}
            onPress={() => onSelectMood(item.id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Select mood: ${item.mood}${isSelected ? ", selected" : ""}`}
          >
            <View
              style={[
                styles.moodIconWrapper,
                largeIcons && { width: 80, height: 80 },
                { backgroundColor: item.color },
                isSelected && styles.selectedMood,
              ]}
            >
              <Text style={{ fontSize: largeIcons ? 36 : 28 }}>
                {item.icon}
              </Text>
              {isSelected && (
                <View style={styles.checkMark}>
                  <Text style={{ color: "#fff", fontSize: 18 }}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.moodLabel}>{item.mood}</Text>
          </TouchableOpacity>
        );
      }}
      keyExtractor={(item) => item.id}
      numColumns={4}
      columnWrapperStyle={{ justifyContent: "space-between" }}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Mood options"
      accessible={true}
    />
  </View>
);

const styles = StyleSheet.create({
  sectionHeader: {
    color: "#4D2C1D",
    fontFamily: "JakartaBold",
    fontSize: fontSizes.subheading + 2,
    marginBottom: 16,
    textAlign: "center",
  },
  moodButton: {
    alignItems: "center",
    flex: 1,
    marginVertical: 8,
  },
  moodIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    opacity: 0.9,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  selectedMood: {
    borderColor: "#FFAA4D",
    shadowColor: "#FFAA4D",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    opacity: 1,
  },
  checkMark: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#FFAA4D",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  moodLabel: {
    color: "#4D2C1D",
    fontFamily: "JakartaMedium",
    fontSize: 15,
    marginTop: 2,
    textAlign: "center",
  },
});

export default MoodTracker;
