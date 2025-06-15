import React, { createContext, useContext, useState, useEffect } from "react";
import { logMood, fetchMoodHistory } from "@/utils/moodApi";
import { useUser } from "@clerk/clerk-expo";

export type MoodType = {
  mood: string;
  label: string;
  color: string;
};

export type MoodHistoryEntry = {
  id: number;
  user_id: string;
  mood: string;
  label: string;
  color: string;
  created_at: string;
};

const MoodContext = createContext<{
  selectedMood: MoodType | null;
  setSelectedMood: (mood: MoodType) => void;
  moodHistory: MoodHistoryEntry[];
  refreshMoodHistory: () => void;
}>({
  selectedMood: null,
  setSelectedMood: () => {},
  moodHistory: [],
  refreshMoodHistory: () => {},
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
      const data = await fetchMoodHistory(user.id);
      setMoodHistory(data);
    } catch (e) {
      // handle error
    }
  };

  const setSelectedMood = async (mood: MoodType) => {
    setSelectedMoodState(mood);
    if (!user?.id) return;
    try {
      await logMood({ userId: user.id, ...mood });
      refreshMoodHistory();
    } catch (e) {
      // handle error
    }
  };

  useEffect(() => {
    refreshMoodHistory();
  }, [user?.id]);

  return (
    <MoodContext.Provider
      value={{ selectedMood, setSelectedMood, moodHistory, refreshMoodHistory }}
    >
      {children}
    </MoodContext.Provider>
  );
};
