"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import {
  getMedications,
  type Medication,
  getTodaysDoses,
  recordDose,
  type DoseHistory,
} from "@/utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  registerForPushNotificationsAsync,
  checkForPastDueMedications,
} from "@/utils/notifications";
import NotificationButton from "@/components/NotificationButton";
import NotificationModal from "@/components/NotificationModal";
import { fontSizes } from "@/constants/fontSizes";

const { width } = Dimensions.get("window");

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
  {
    icon: "add-circle-outline" as const,
    label: "Add\nWellness Item",
    route: "/(root)/medications/add" as const,
    color: "#6B73FF",
    gradient: ["#9C88FF", "#6B73FF"] as [string, string],
  },
  {
    icon: "calendar-outline" as const,
    label: "Schedule\nView",
    route: "/(root)/medications/calendar" as const,
    color: "#FF6B9D",
    gradient: ["#FF8A80", "#FF6B9D"] as [string, string],
  },
  {
    icon: "time-outline" as const,
    label: "Progress\nJourney",
    route: "/(root)/medications/history" as const,
    color: "#4ECDC4",
    gradient: ["#81C784", "#4ECDC4"] as [string, string],
  },
  {
    icon: "heart-outline" as const,
    label: "Care\nReminders",
    route: "/(root)/medications/refills" as const,
    color: "#FFB74D",
    gradient: ["#FFCC02", "#FFB74D"] as [string, string],
  },
];

interface CircularProgressProps {
  progress: number;
  totalDoses: number;
  completedDoses: number;
}

function CircularProgress({
  progress,
  totalDoses,
  completedDoses,
}: CircularProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = width * 0.55;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressPercentage}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.progressDetails}>
          {completedDoses} of {totalDoses} completed
        </Text>
        <Text style={styles.progressLabel}>Today's Wellness</Text>
      </View>
      <Svg width={size} height={size} style={styles.progressRing}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

export default function Meds() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);

  const loadMedications = useCallback(async () => {
    try {
      const [allMedications, todaysDoses] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
      ]);

      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      // Filter medications for today
      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = Number.parseInt(med.duration.split(" ")[0]);

        // For ongoing medications or if within duration
        if (
          durationDays === -1 ||
          (today >= startDate &&
            today <=
              new Date(
                startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
              ))
        ) {
          return true;
        }
        return false;
      });

      setTodaysMedications(todayMeds);

      // Calculate completed doses
      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }

      console.log("✅ Notifications setup complete");

      // Check for past due medications
      await checkForPastDueMedications();
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  // Use useEffect for initial load
  useEffect(() => {
    loadMedications();
    setupNotifications();

    // Handle app state changes for notifications
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active") {
          loadMedications();
          await checkForPastDueMedications();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Use useFocusEffect for subsequent updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = () => {
        // Cleanup if needed
      };

      loadMedications();
      return () => unsubscribe();
    }, [loadMedications])
  );

  const handleTakeDose = async (medication: Medication) => {
    try {
      await recordDose(medication.id, true, new Date().toISOString());
      await loadMedications(); // Reload data after recording dose
    } catch (error) {
      console.error("Error recording dose:", error);
      Alert.alert("Oops!", "Something went wrong. Please try again.");
    }
  };

  const isDoseTaken = (medicationId: string) => {
    return doseHistory.some(
      (dose) => dose.medicationId === medicationId && dose.taken
    );
  };

  const progress =
    todaysMedications.length > 0
      ? completedDoses / todaysMedications.length
      : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning! ☀️";
    if (hour < 17) return "Good Afternoon! 🌤️";
    return "Good Evening! 🌙";
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.flex1}>
              <Text className="text-white text-2xl font-bold">
                {getGreeting()}
              </Text>
              <Text className="text-white text-xl font-bold">
                Let's take care of you today
              </Text>
            </View>
            {/* Notification button */}
            <NotificationButton
              onPress={() => setShowNotifications(true)}
              notificationCount={todaysMedications.length}
            />
          </View>
          <CircularProgress
            progress={progress}
            totalDoses={todaysMedications.length}
            completedDoses={completedDoses}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.content}>
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.actionButton}
                  onPress={() => router.push(action.route)}
                >
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionContent}>
                      <View style={styles.actionIcon}>
                        <Ionicons name={action.icon} size={26} color="white" />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Care Plan</Text>
              <TouchableOpacity
                onPress={() => router.push("/(root)/medications/calendar")}
              >
                <Text style={styles.seeAllButton}>View All</Text>
              </TouchableOpacity>
            </View>
            {todaysMedications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={48} color="#E1BEE7" />
                <Text style={styles.emptyStateText}>
                  No wellness items scheduled for today
                </Text>
                <Text style={styles.emptyStateSubText}>
                  You're all set! Enjoy your day 🌟
                </Text>
                <TouchableOpacity
                  style={styles.addMedicationButton}
                  onPress={() => router.push("/(root)/medications/add")}
                >
                  <Text style={styles.addMedicationButtonText}>
                    Add Wellness Item
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              todaysMedications.map((medication) => {
                const taken = isDoseTaken(medication.id);
                return (
                  <View key={medication.id} style={styles.doseCard}>
                    <View
                      style={[
                        styles.doseBadge,
                        { backgroundColor: `${medication.color}20` },
                      ]}
                    >
                      <Ionicons
                        name="heart"
                        size={22}
                        color={medication.color}
                      />
                    </View>
                    <View style={styles.doseInfo}>
                      <View>
                        <Text style={styles.medicineName}>
                          {medication.name}
                        </Text>
                        <Text style={styles.dosageInfo}>
                          {medication.dosage}
                        </Text>
                      </View>
                      <View style={styles.doseTime}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#8E8E93"
                        />
                        <Text style={styles.timeText}>
                          {medication.times[0]}
                        </Text>
                      </View>
                    </View>
                    {taken ? (
                      <View style={[styles.takenBadge]}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#34C759"
                        />
                        <Text style={styles.takenText}>Complete</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.takeDoseButton,
                          { backgroundColor: medication.color },
                        ]}
                        onPress={() => handleTakeDose(medication)}
                      >
                        <Text style={styles.takeDoseText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* NOTIFICATION MODAL */}
      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        medications={todaysMedications}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 25,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Add padding at bottom for safe scrolling
  },
  content: {
    paddingTop: 25,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginTop: 15,
  },
  actionButton: {
    width: (width - 55) / 2,
    height: 120,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionGradient: {
    flex: 1,
    padding: 18,
  },
  actionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 5,
  },
  seeAllButton: {
    color: "#667eea",
    fontWeight: "600",
    fontSize: 16,
  },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  doseBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  doseInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  medicineName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  dosageInfo: {
    fontSize: 15,
    color: "#8E8E93",
    marginBottom: 6,
  },
  doseTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    marginLeft: 6,
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "500",
  },
  takeDoseButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginLeft: 10,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 38,
    fontWeight: "800",
    color: "white",
  },
  progressLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    fontWeight: "500",
  },
  progressRing: {
    transform: [{ rotate: "-90deg" }],
  },
  flex1: {
    flex: 1,
  },
  notificationButton: {
    position: "relative",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 14,
    marginLeft: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#764ba2",
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  progressDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    marginBottom: 12,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#C7C7CC",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "white",
    borderRadius: 20,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#8E8E93",
    marginTop: 15,
    marginBottom: 8,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateSubText: {
    fontSize: 15,
    color: "#C7C7CC",
    marginBottom: 25,
    textAlign: "center",
  },
  addMedicationButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addMedicationButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginLeft: 10,
  },
  takenText: {
    color: "#34C759",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
});
