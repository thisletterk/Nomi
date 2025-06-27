"use client";

import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getMedications,
  getDoseHistory,
  recordDose,
  type Medication,
  type DoseHistory,
} from "@/utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import type { JSX } from "react"; // Import JSX to fix the undeclared variable error

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [meds, history] = await Promise.all([
        getMedications(),
        getDoseHistory(),
      ]);
      setMedications(meds);
      setDoseHistory(history);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(selectedDate);

  const renderCalendar = () => {
    const calendar: JSX.Element[] = [];
    let week: JSX.Element[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      week.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= days; day++) {
      const date = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        day
      );
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate.toDateString() === date.toDateString();
      const hasDoses = doseHistory.some(
        (dose) =>
          new Date(dose.timestamp).toDateString() === date.toDateString()
      );

      week.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.today,
            isSelected && styles.selected,
            hasDoses && styles.hasEvents,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text
            style={[
              styles.dayText,
              isToday && styles.todayText,
              isSelected && styles.selectedText,
            ]}
          >
            {day}
          </Text>
          {hasDoses && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );

      if ((firstDay + day) % 7 === 0 || day === days) {
        calendar.push(
          <View key={day} style={styles.calendarWeek}>
            {week}
          </View>
        );
        week = [];
      }
    }

    return calendar;
  };

  const renderMedicationsForDate = () => {
    const dateStr = selectedDate.toDateString();
    const dayDoses = doseHistory.filter(
      (dose) => new Date(dose.timestamp).toDateString() === dateStr
    );

    return medications.map((medication) => {
      const taken = dayDoses.some(
        (dose) => dose.medicationId === medication.id && dose.taken
      );

      return (
        <View key={medication.id} style={styles.medicationCard}>
          <View
            style={[
              styles.medicationColor,
              { backgroundColor: medication.color },
            ]}
          />
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <Text style={styles.medicationDosage}>{medication.dosage}</Text>
            <Text style={styles.medicationTime}>{medication.times[0]}</Text>
          </View>
          {taken ? (
            <View style={styles.takenBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.takenText}>Complete</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.takeDoseButton,
                { backgroundColor: medication.color },
              ]}
              onPress={async () => {
                await recordDose(medication.id, true, new Date().toISOString());
                loadData();
              }}
            >
              <Text style={styles.takeDoseText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color="#667eea" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Schedule View</Text>
          </View>

          <View style={styles.calendarContainer}>
            <View style={styles.monthHeader}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedDate(
                    new Date(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth() - 1,
                      1
                    )
                  )
                }
                style={styles.monthNavButton}
              >
                <Ionicons name="chevron-back" size={24} color="#667eea" />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {selectedDate.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setSelectedDate(
                    new Date(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth() + 1,
                      1
                    )
                  )
                }
                style={styles.monthNavButton}
              >
                <Ionicons name="chevron-forward" size={24} color="#667eea" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayHeader}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {renderCalendar()}
          </View>

          <View style={styles.scheduleContainer}>
            <Text style={styles.scheduleTitle}>
              {selectedDate.toLocaleDateString("default", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <View style={styles.medicationsContainer}>
              {medications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateEmoji}>📅</Text>
                  <Text style={styles.emptyStateText}>
                    No wellness items for this day
                  </Text>
                  <Text style={styles.emptyStateSubText}>
                    Enjoy your free time!
                  </Text>
                </View>
              ) : (
                renderMedicationsForDate()
              )}
            </View>
          </View>
        </View>
      </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Add padding for safe scrolling
  },
  content: {
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
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    margin: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  monthText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    color: "#8E8E93",
    fontWeight: "600",
    fontSize: 14,
  },
  calendarWeek: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    position: "relative",
  },
  dayText: {
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  today: {
    backgroundColor: "#667eea20",
  },
  todayText: {
    color: "#667eea",
    fontWeight: "700",
  },
  selected: {
    backgroundColor: "#667eea",
  },
  selectedText: {
    color: "white",
    fontWeight: "700",
  },
  hasEvents: {
    position: "relative",
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF6B9D",
    position: "absolute",
    bottom: "10%",
  },
  scheduleContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 300, // Ensure minimum height for content
  },
  scheduleTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 18,
  },
  medicationsContainer: {
    // Remove flex: 1 to allow natural height
  },
  medicationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  medicationTime: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  takeDoseButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  takenText: {
    color: "#34C759",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#F2F2F7",
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
  },
});
