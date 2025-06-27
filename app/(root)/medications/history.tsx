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
  getDoseHistory,
  getMedications,
  type DoseHistory,
  type Medication,
  clearAllData,
} from "@/utils/storage";

type EnrichedDoseHistory = DoseHistory & { medication?: Medication };

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<EnrichedDoseHistory[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "taken" | "missed"
  >("all");

  const loadHistory = useCallback(async () => {
    try {
      const [doseHistory, medications] = await Promise.all([
        getDoseHistory(),
        getMedications(),
      ]);

      // Combine history with medication details
      const enrichedHistory = doseHistory.map((dose) => ({
        ...dose,
        medication: medications.find((med) => med.id === dose.medicationId),
      }));

      setHistory(enrichedHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const groupHistoryByDate = () => {
    const grouped = history.reduce(
      (acc, dose) => {
        const date = new Date(dose.timestamp).toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(dose);
        return acc;
      },
      {} as Record<string, EnrichedDoseHistory[]>
    );

    return Object.entries(grouped).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  const filteredHistory = history.filter((dose) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "taken") return dose.taken;
    if (selectedFilter === "missed") return !dose.taken;
    return true;
  });

  const groupedHistory = groupHistoryByDate();

  const handleClearAllData = () => {
    Alert.alert(
      "Clear Your Journey? 🤔",
      "This will remove all your wellness data. Are you sure you want to start fresh?",
      [
        {
          text: "Keep My Data",
          style: "cancel",
        },
        {
          text: "Start Fresh",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await loadHistory();
              Alert.alert(
                "All Set! ✨",
                "Your wellness journey starts fresh from today"
              );
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert("Oops!", "Something went wrong. Please try again.");
            }
          },
        },
      ]
    );
  };

  const getFilterStats = () => {
    const total = history.length;
    const completed = history.filter((dose) => dose.taken).length;
    const missed = total - completed;

    return { total, completed, missed };
  };

  const stats = getFilterStats();

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
          <Text style={styles.headerTitle}>Progress Journey</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statEmoji}>🎉</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statEmoji}>📊</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {Math.round((stats.completed / Math.max(stats.total, 1)) * 100)}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
            <Text style={styles.statEmoji}>⭐</Text>
          </View>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "all" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("all")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "all" && styles.filterTextActive,
                ]}
              >
                All Activities
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "taken" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("taken")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "taken" && styles.filterTextActive,
                ]}
              >
                Completed ✨
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "missed" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("missed")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "missed" && styles.filterTextActive,
                ]}
              >
                Missed 💭
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          style={styles.historyContainer}
          showsVerticalScrollIndicator={false}
        >
          {groupedHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🌱</Text>
              <Text style={styles.emptyStateText}>
                Your journey starts here
              </Text>
              <Text style={styles.emptyStateSubText}>
                Complete your first wellness activity to see your progress
              </Text>
            </View>
          ) : (
            groupedHistory.map(([date, doses]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>
                  {new Date(date).toLocaleDateString("default", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                {doses.map((dose) => (
                  <View key={dose.id} style={styles.historyCard}>
                    <View
                      style={[
                        styles.medicationColor,
                        {
                          backgroundColor: dose.medication?.color || "#C7C7CC",
                        },
                      ]}
                    />
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>
                        {dose.medication?.name || "Unknown Item"}
                      </Text>
                      <Text style={styles.medicationDosage}>
                        {dose.medication?.dosage}
                      </Text>
                      <Text style={styles.timeText}>
                        {new Date(dose.timestamp).toLocaleTimeString(
                          "default",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    </View>
                    <View style={styles.statusContainer}>
                      {dose.taken ? (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: "#E8F5E9" },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#34C759"
                          />
                          <Text
                            style={[styles.statusText, { color: "#34C759" }]}
                          >
                            Done
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: "#FFF3E0" },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#FF9800"
                          />
                          <Text
                            style={[styles.statusText, { color: "#FF9800" }]}
                          >
                            Skipped
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}

          <View style={styles.clearDataContainer}>
            <TouchableOpacity
              style={styles.clearDataButton}
              onPress={handleClearAllData}
            >
              <Ionicons name="refresh-outline" size={20} color="#FF6B9D" />
              <Text style={styles.clearDataText}>Start Fresh</Text>
            </TouchableOpacity>
          </View>
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
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 20,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#F2F2F7",
    paddingTop: 10,
  },
  filtersScroll: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "white",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  filterButtonActive: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  filterText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
  },
  filterTextActive: {
    color: "white",
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#F2F2F7",
  },
  dateGroup: {
    marginBottom: 28,
  },
  dateHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 14,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  clearDataContainer: {
    padding: 20,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  clearDataButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F5",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFE4E1",
  },
  clearDataText: {
    color: "#FF6B9D",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
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
    lineHeight: 22,
  },
});
