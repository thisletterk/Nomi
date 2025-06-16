export interface MoodEntry {
  id: string;
  userId: string;
  mood: MoodType;
  intensity: number; // 1-5 scale
  note?: string;
  timestamp: number;
  date: string; // YYYY-MM-DD format
}

export interface MoodType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  value: number; // 1-5 (very sad to very happy)
}

export interface MoodStats {
  averageMood: number;
  totalEntries: number;
  moodDistribution: { [key: string]: number };
  streak: number;
  period: "day" | "week" | "month";
}

// This will be loaded from the database now
export const MOOD_TYPES: MoodType[] = [
  { id: "very-sad", name: "Very Sad", emoji: "😢", color: "#ef4444", value: 1 },
  { id: "sad", name: "Sad", emoji: "😔", color: "#f97316", value: 2 },
  { id: "neutral", name: "Neutral", emoji: "😐", color: "#eab308", value: 3 },
  { id: "happy", name: "Happy", emoji: "😊", color: "#22c55e", value: 4 },
  {
    id: "very-happy",
    name: "Very Happy",
    emoji: "😄",
    color: "#10b981",
    value: 5,
  },
];
