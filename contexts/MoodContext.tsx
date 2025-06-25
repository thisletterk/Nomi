"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { MoodStorage } from "@/lib/mood-storage";
import type { MoodEntry, MoodType } from "@/types/mood";

export type MoodHistoryEntry = MoodEntry;

const MoodContext = createContext<{
  selectedMood: MoodType | null;
  setSelectedMood: (mood: MoodType) => void;
  moodHistory: MoodHistoryEntry[];
  refreshMoodHistory: () => void;
  saveMoodEntry: (entry: MoodEntry) => Promise<void>;
}>({
  selectedMood: null,
  setSelectedMood: () => {},
  moodHistory: [],
  refreshMoodHistory: () => {},
  saveMoodEntry: async () => {},
});

export const useMood = () => useContext(MoodContext);

export const MoodProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUser();
  const [selectedMood, setSelectedMoodState] = useState<MoodType | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodHistoryEntry[]>([]);

  const refreshMoodHistory = async () => {
    if (!user?.id) return;
    try {
      const data = await MoodStorage.getAllMoodEntries(user.id);
      setMoodHistory(data);
    } catch (error) {
      console.error("Error refreshing mood history:", error);
    }
  };

  const saveMoodEntry = async (entry: MoodEntry) => {
    try {
      await MoodStorage.saveMoodEntry(entry);
      await refreshMoodHistory();
    } catch (error) {
      console.error("Error saving mood entry:", error);
      throw error;
    }
  };

  const setSelectedMood = async (mood: MoodType) => {
    setSelectedMoodState(mood);
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const moodEntry: MoodEntry = {
        id: `mood_${Date.now()}_${user.id}`,
        userId: user.id,
        mood,
        intensity: mood.value,
        timestamp: Date.now(),
        date: today,
      };

      await saveMoodEntry(moodEntry);
    } catch (error) {
      console.error("Error setting selected mood:", error);
    }
  };

  useEffect(() => {
    refreshMoodHistory();
  }, [user?.id]);

  return (
    <MoodContext.Provider
      value={{
        selectedMood,
        setSelectedMood,
        moodHistory,
        refreshMoodHistory,
        saveMoodEntry,
      }}
    >
      {children}
    </MoodContext.Provider>
  );
};
