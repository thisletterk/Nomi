"use client";

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { addMedication } from "@/utils/storage";
import { updateMedicationReminders } from "@/utils/notifications";

const { width } = Dimensions.get("window");

const FREQUENCIES = [
  {
    id: "1",
    label: "Once daily",
    icon: "sunny-outline" as const,
    times: ["09:00"],
    description: "Perfect for morning routines",
  },
  {
    id: "2",
    label: "Twice daily",
    icon: "refresh-outline" as const,
    times: ["09:00", "21:00"],
    description: "Morning and evening",
  },
  {
    id: "3",
    label: "Three times daily",
    icon: "time-outline" as const,
    times: ["09:00", "15:00", "21:00"],
    description: "Throughout the day",
  },
  {
    id: "4",
    label: "Four times daily",
    icon: "repeat-outline" as const,
    times: ["09:00", "13:00", "17:00", "21:00"],
    description: "Regular intervals",
  },
  {
    id: "5",
    label: "As needed",
    icon: "hand-left-outline" as const,
    times: [],
    description: "When you need it",
  },
];

const DURATIONS = [
  { id: "1", label: "1 week", value: 7, emoji: "🌱" },
  { id: "2", label: "2 weeks", value: 14, emoji: "🌿" },
  { id: "3", label: "1 month", value: 30, emoji: "🌳" },
  { id: "4", label: "3 months", value: 90, emoji: "🌲" },
  { id: "5", label: "Ongoing", value: -1, emoji: "♾️" },
];

export default function AddMedicationScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    startDate: new Date(),
    times: ["09:00"],
    notes: "",
    reminderEnabled: true,
    refillReminder: false,
    currentSupply: "",
    refillAt: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.name.trim()) {
      newErrors.name = "Please enter a name for your wellness item";
    }

    if (!form.dosage.trim()) {
      newErrors.dosage = "Please specify the amount or dosage";
    }

    if (!form.frequency) {
      newErrors.frequency = "Please select how often you'll take this";
    }

    if (!form.duration) {
      newErrors.duration = "Please select how long you'll need this";
    }

    if (form.refillReminder) {
      if (!form.currentSupply) {
        newErrors.currentSupply = "Please enter your current supply amount";
      }
      if (!form.refillAt) {
        newErrors.refillAt = "Please set when you'd like to be reminded";
      }
      if (Number(form.refillAt) >= Number(form.currentSupply)) {
        newErrors.refillAt = "Reminder should be set before you run out";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        Alert.alert(
          "Almost there!",
          "Please fill in the highlighted fields to continue"
        );
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      // Generate a warm, friendly color
      const colors = [
        "#6B73FF",
        "#FF6B9D",
        "#4ECDC4",
        "#FFB74D",
        "#9C88FF",
        "#FF8A80",
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const medicationData = {
        id: Math.random().toString(36).substr(2, 9),
        ...form,
        currentSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        totalSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        refillAt: form.refillAt ? Number(form.refillAt) : 0,
        startDate: form.startDate.toISOString(),
        color: randomColor,
      };

      console.log("💾 Saving medication:", medicationData.name);
      console.log("⏰ Reminder enabled:", medicationData.reminderEnabled);
      console.log("📦 Refill reminder:", medicationData.refillReminder);

      // Save medication to storage first
      await addMedication(medicationData);
      console.log("✅ Medication saved to storage");

      // Schedule reminders AFTER saving (and only if enabled)
      if (medicationData.reminderEnabled || medicationData.refillReminder) {
        console.log("📅 Scheduling reminders...");
        await updateMedicationReminders(medicationData);
        console.log("✅ Reminders scheduled");
      } else {
        console.log("⏭️ No reminders to schedule");
      }

      Alert.alert(
        "Great job! 🎉",
        `Your wellness item "${medicationData.name}" has been added successfully${
          medicationData.reminderEnabled ? " with reminders" : ""
        }`,
        [
          {
            text: "Continue",
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("❌ Save error:", error);
      Alert.alert(
        "Oops!",
        "Something went wrong. Please try again.",
        [{ text: "OK" }],
        { cancelable: false }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFrequencySelect = (freq: string) => {
    setSelectedFrequency(freq);
    const selectedFreq = FREQUENCIES.find((f) => f.label === freq);
    setForm((prev) => ({
      ...prev,
      frequency: freq,
      times: selectedFreq?.times || [],
    }));
    if (errors.frequency) {
      setErrors((prev) => ({ ...prev, frequency: "" }));
    }
  };

  const handleDurationSelect = (dur: string) => {
    setSelectedDuration(dur);
    setForm((prev) => ({ ...prev, duration: dur }));
    if (errors.duration) {
      setErrors((prev) => ({ ...prev, duration: "" }));
    }
  };

  const renderFrequencyOptions = () => {
    return (
      <View style={styles.optionsGrid}>
        {FREQUENCIES.map((freq) => (
          <TouchableOpacity
            key={freq.id}
            style={[
              styles.optionCard,
              selectedFrequency === freq.label && styles.selectedOptionCard,
            ]}
            onPress={() => {
              setSelectedFrequency(freq.label);
              setForm({ ...form, frequency: freq.label, times: freq.times });
            }}
          >
            <View
              style={[
                styles.optionIcon,
                selectedFrequency === freq.label && styles.selectedOptionIcon,
              ]}
            >
              <Ionicons
                name={freq.icon}
                size={24}
                color={selectedFrequency === freq.label ? "white" : "#667eea"}
              />
            </View>
            <Text
              style={[
                styles.optionLabel,
                selectedFrequency === freq.label && styles.selectedOptionLabel,
              ]}
            >
              {freq.label}
            </Text>
            <Text
              style={[
                styles.optionDescription,
                selectedFrequency === freq.label &&
                  styles.selectedOptionDescription,
              ]}
            >
              {freq.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDurationOptions = () => {
    return (
      <View style={styles.optionsGrid}>
        {DURATIONS.map((dur) => (
          <TouchableOpacity
            key={dur.id}
            style={[
              styles.optionCard,
              selectedDuration === dur.label && styles.selectedOptionCard,
            ]}
            onPress={() => {
              setSelectedDuration(dur.label);
              setForm({ ...form, duration: dur.label });
            }}
          >
            <Text style={[styles.durationEmoji]}>{dur.emoji}</Text>
            <Text
              style={[
                styles.optionLabel,
                selectedDuration === dur.label && styles.selectedOptionLabel,
              ]}
            >
              {dur.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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
          <Text style={styles.headerTitle}>Add Wellness Item</Text>
        </View>

        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContentContainer}
        >
          {/* Basic Information */}
          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.mainInput, errors.name && styles.inputError]}
                placeholder="What are you taking care of?"
                placeholderTextColor="#C7C7CC"
                value={form.name}
                onChangeText={(text) => {
                  setForm({ ...form, name: text });
                  if (errors.name) {
                    setErrors({ ...errors, name: "" });
                  }
                }}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.mainInput, errors.dosage && styles.inputError]}
                placeholder="Amount or dosage (e.g., 500mg, 1 tablet)"
                placeholderTextColor="#C7C7CC"
                value={form.dosage}
                onChangeText={(text) => {
                  setForm({ ...form, dosage: text });
                  if (errors.dosage) {
                    setErrors({ ...errors, dosage: "" });
                  }
                }}
              />
              {errors.dosage && (
                <Text style={styles.errorText}>{errors.dosage}</Text>
              )}
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              How often will you take this?
            </Text>
            {errors.frequency && (
              <Text style={styles.errorText}>{errors.frequency}</Text>
            )}
            {renderFrequencyOptions()}

            <Text style={styles.sectionTitle}>For how long?</Text>
            {errors.duration && (
              <Text style={styles.errorText}>{errors.duration}</Text>
            )}
            {renderDurationOptions()}

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.dateIconContainer}>
                <Ionicons name="calendar" size={20} color="#667eea" />
              </View>
              <Text style={styles.dateButtonText}>
                Starting {form.startDate.toLocaleDateString()}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={form.startDate}
                mode="date"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setForm({ ...form, startDate: date });
                }}
              />
            )}

            {form.frequency && form.frequency !== "As needed" && (
              <View style={styles.timesContainer}>
                <Text style={styles.timesTitle}>
                  When would you like reminders?
                </Text>
                {form.times.map((time, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.timeButton}
                    onPress={() => {
                      setShowTimePicker(true);
                    }}
                  >
                    <View style={styles.timeIconContainer}>
                      <Ionicons name="time-outline" size={20} color="#667eea" />
                    </View>
                    <Text style={styles.timeButtonText}>{time}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = form.times[0].split(":").map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  return date;
                })()}
                mode="time"
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const newTime = date.toLocaleTimeString("default", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    setForm((prev) => ({
                      ...prev,
                      times: prev.times.map((t, i) => (i === 0 ? newTime : t)),
                    }));
                  }
                }}
              />
            )}
          </View>

          {/* Reminders */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="notifications" size={20} color="#667eea" />
                  </View>
                  <View>
                    <Text style={styles.switchLabel}>Gentle Reminders</Text>
                    <Text style={styles.switchSubLabel}>
                      We'll send you friendly notifications
                    </Text>
                  </View>
                </View>
                <Switch
                  value={form.reminderEnabled}
                  onValueChange={(value) =>
                    setForm({ ...form, reminderEnabled: value })
                  }
                  trackColor={{ false: "#E5E5EA", true: "#667eea" }}
                  thumbColor="white"
                />
              </View>
            </View>
          </View>

          {/* Refill Tracking */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="heart" size={20} color="#FF6B9D" />
                  </View>
                  <View>
                    <Text style={styles.switchLabel}>Supply Tracking</Text>
                    <Text style={styles.switchSubLabel}>
                      Keep track of when you need more
                    </Text>
                  </View>
                </View>
                <Switch
                  value={form.refillReminder}
                  onValueChange={(value) => {
                    setForm({ ...form, refillReminder: value });
                    if (!value) {
                      setErrors({
                        ...errors,
                        currentSupply: "",
                        refillAt: "",
                      });
                    }
                  }}
                  trackColor={{ false: "#E5E5EA", true: "#FF6B9D" }}
                  thumbColor="white"
                />
              </View>
              {form.refillReminder && (
                <View style={styles.refillInputs}>
                  <View style={styles.inputRow}>
                    <View style={[styles.inputContainer, styles.flex1]}>
                      <TextInput
                        style={[
                          styles.input,
                          errors.currentSupply && styles.inputError,
                        ]}
                        placeholder="How many do you have?"
                        placeholderTextColor="#C7C7CC"
                        value={form.currentSupply}
                        onChangeText={(text) => {
                          setForm({ ...form, currentSupply: text });
                          if (errors.currentSupply) {
                            setErrors({ ...errors, currentSupply: "" });
                          }
                        }}
                        keyboardType="numeric"
                      />
                      {errors.currentSupply && (
                        <Text style={styles.errorText}>
                          {errors.currentSupply}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.inputContainer, styles.flex1]}>
                      <TextInput
                        style={[
                          styles.input,
                          errors.refillAt && styles.inputError,
                        ]}
                        placeholder="Remind me at"
                        placeholderTextColor="#C7C7CC"
                        value={form.refillAt}
                        onChangeText={(text) => {
                          setForm({ ...form, refillAt: text });
                          if (errors.refillAt) {
                            setErrors({ ...errors, refillAt: "" });
                          }
                        }}
                        keyboardType="numeric"
                      />
                      {errors.refillAt && (
                        <Text style={styles.errorText}>{errors.refillAt}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Any special notes or instructions? (optional)"
                placeholderTextColor="#C7C7CC"
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSubmitting && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? "Adding..." : "Add to My Wellness Plan"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
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
  formContainer: {
    flex: 1,
  },
  formContentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 18,
    marginTop: 10,
  },
  mainInput: {
    fontSize: 18,
    color: "#1C1C1E",
    padding: 18,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  optionCard: {
    width: (width - 76) / 2,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    margin: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  selectedOptionCard: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedOptionIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 4,
  },
  selectedOptionLabel: {
    color: "white",
  },
  optionDescription: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
  selectedOptionDescription: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  durationEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: "white",
    borderRadius: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  switchSubLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: "#1C1C1E",
  },
  textAreaContainer: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textArea: {
    height: 100,
    padding: 18,
    fontSize: 16,
    color: "#1C1C1E",
  },
  footer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  saveButton: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  cancelButtonText: {
    color: "#8E8E93",
    fontSize: 16,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 13,
    marginTop: 6,
    marginLeft: 16,
    fontWeight: "500",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  refillInputs: {
    marginTop: 18,
  },
  timesContainer: {
    marginTop: 25,
  },
  timesTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "500",
  },
});
