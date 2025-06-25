export interface MoodType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  value: number; // 1-5 scale
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: MoodType;
  intensity: number; // 1-5 scale
  note?: string;
  timestamp: number;
  date: string; // YYYY-MM-DD format
  tags?: string[];
}

export interface MoodStats {
  totalEntries: number;
  averageMood: number;
  moodDistribution: Record<string, number>;
  streak: number;
  period?: "day" | "week" | "month";
}

export const MOOD_TYPES: MoodType[] = [
  {
    id: "ecstatic",
    name: "Ecstatic",
    emoji: "🤩",
    color: "#ff6b6b",
    value: 5,
  },
  {
    id: "happy",
    name: "Happy",
    emoji: "😊",
    color: "#4ecdc4",
    value: 4,
  },
  {
    id: "content",
    name: "Content",
    emoji: "😌",
    color: "#45b7d1",
    value: 3,
  },
  {
    id: "sad",
    name: "Sad",
    emoji: "😢",
    color: "#96ceb4",
    value: 2,
  },
  {
    id: "depressed",
    name: "Depressed",
    emoji: "😞",
    color: "#feca57",
    value: 1,
  },
  {
    id: "anxious",
    name: "Anxious",
    emoji: "😰",
    color: "#ff9ff3",
    value: 2,
  },
  {
    id: "excited",
    name: "Excited",
    emoji: "🤗",
    color: "#54a0ff",
    value: 4,
  },
  {
    id: "calm",
    name: "Calm",
    emoji: "😇",
    color: "#5f27cd",
    value: 3,
  },
];
