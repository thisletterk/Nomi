"use client";

import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import {
  getMedications,
  type Medication,
  updateMedication,
} from "@/utils/storage";

export default function RefillTrackerScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);

  const loadMedications = useCallback(async () => {
    try {
      const allMedications = await getMedications();
      setMedications(allMedications);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [loadMedications])
  );

  const handleRefill = async (medication: Medication) => {
    try {
      const updatedMedication = {
        ...medication,
        currentSupply: medication.totalSupply,
        lastRefillDate: new Date().toISOString(),
      };

      await updateMedication(updatedMedication);
      await loadMedications();

      Alert.alert(
        "Great! 🎉",
        `${medication.name} supply has been updated to ${medication.totalSupply} units.`
      );
    } catch (error) {
      console.error("Error recording refill:", error);
      Alert.alert("Oops!", "Something went wrong. Please try again.");
    }
  };

  const getSupplyStatus = (medication: Medication) => {
    const percentage =
      (medication.currentSupply / medication.totalSupply) * 100;
    if (percentage <= medication.refillAt) {
      return {
        status: "Time to Restock",
        color: "#FF6B9D",
        backgroundColor: "#FFF0F5",
        emoji: "🔔",
      };
    } else if (percentage <= 50) {
      return {
        status: "Getting Low",
        color: "#FFB74D",
        backgroundColor: "#FFF8E1",
        emoji: "⚠️",
      };
    } else {
      return {
        status: "Well Stocked",
        color: "#4ECDC4",
        backgroundColor: "#E0F7FA",
        emoji: "✅",
      };
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#667eea" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Care Reminders</Text>
        </View>

        <ScrollView
          style={styles.medicationsContainer}
          showsVerticalScrollIndicator={false}
        >
          {medications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>💝</Text>
              <Text style={styles.emptyStateText}>No items to track yet</Text>
              <Text style={styles.emptyStateSubText}>
                Add wellness items to keep track of your supplies
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/(root)/medications/add")}
              >
                <Text style={styles.addButtonText}>Add Wellness Item</Text>
              </TouchableOpacity>
            </View>
          ) : (
            medications.map((medication) => {
              const supplyStatus = getSupplyStatus(medication);
              const supplyPercentage =
                (medication.currentSupply / medication.totalSupply) * 100;

              return (
                <View key={medication.id} style={styles.medicationCard}>
                  <View style={styles.medicationHeader}>
                    <View
                      style={[
                        styles.medicationColor,
                        { backgroundColor: medication.color },
                      ]}
                    />
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>
                        {medication.name}
                      </Text>
                      <Text style={styles.medicationDosage}>
                        {medication.dosage}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: supplyStatus.backgroundColor },
                      ]}
                    >
                      <Text style={styles.statusEmoji}>
                        {supplyStatus.emoji}
                      </Text>
                      <Text
                        style={[
                          styles.statusText,
                          { color: supplyStatus.color },
                        ]}
                      >
                        {supplyStatus.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.supplyContainer}>
                    <View style={styles.supplyInfo}>
                      <Text style={styles.supplyLabel}>Current Supply</Text>
                      <Text style={styles.supplyValue}>
                        {medication.currentSupply} units remaining
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${Math.max(supplyPercentage, 5)}%`,
                              backgroundColor: supplyStatus.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {Math.round(supplyPercentage)}% remaining
                      </Text>
                    </View>
                    <View style={styles.refillInfo}>
                      <Text style={styles.refillLabel}>
                        📍 Reminder set at {medication.refillAt}% remaining
                      </Text>
                      {medication.lastRefillDate && (
                        <Text style={styles.lastRefillDate}>
                          Last restocked:{" "}
                          {new Date(
                            medication.lastRefillDate
                          ).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.refillButton,
                      {
                        backgroundColor:
                          supplyPercentage < 100 ? medication.color : "#E5E5EA",
                      },
                    ]}
                    onPress={() => handleRefill(medication)}
                    disabled={supplyPercentage >= 100}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={supplyPercentage < 100 ? "white" : "#8E8E93"}
                    />
                    <Text
                      style={[
                        styles.refillButtonText,
                        { color: supplyPercentage < 100 ? "white" : "#8E8E93" },
                      ]}
                    >
                      Mark as Restocked
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginLeft: 15,
  },
  medicationsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  medicationCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  medicationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  medicationColor: {
    width: 12,
    height: 44,
    borderRadius: 6,
    marginRight: 16,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  supplyContainer: {
    marginBottom: 20,
  },
  supplyInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  supplyLabel: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "500",
  },
  supplyValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: "#F2F2F7",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 5,
  },
  progressText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 6,
    textAlign: "right",
    fontWeight: "500",
  },
  refillInfo: {
    marginTop: 12,
  },
  refillLabel: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
  lastRefillDate: {
    fontSize: 13,
    color: "#C7C7CC",
    marginTop: 4,
  },
  refillButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  refillButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "white",
    borderRadius: 20,
    marginTop: 20,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubText: {
    fontSize: 15,
    color: "#C7C7CC",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
