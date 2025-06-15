import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";
import { useUser } from "@clerk/clerk-expo";

const { width } = Dimensions.get("window");
const chartWidth = width - 64;
const chartHeight = 120;
const segments = ["1 Day", "1 Week", "1 Month"];

function getLastNDays(n: number) {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
    });
  }
  return days;
}

function getLastNMonths(n: number) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
    });
  }
  return months;
}

// Helper to get mood value (for y-axis) - you can adjust this mapping
const moodValueMap: Record<string, number> = {
  Happy: 5,
  Overjoyed: 6,
  Neutral: 3,
  Depressed: 1,
  Sad: 2,
  "😊": 5,
  "😁": 6,
  "😐": 3,
  "😢": 2,
  "😔": 1,
};

function getMoodValue(label: string, emoji: string) {
  return moodValueMap[label] || moodValueMap[emoji] || 3;
}

// Fetch mood history from API
async function fetchMoodHistory(userId: string) {
  try {
    const res = await fetch(`/api/mood?userId=${userId}`);
    if (!res.ok) {
      const errorText = await res.text();
      console.error("API error:", errorText);
      throw new Error("Failed to fetch mood history");
    }
    const { data } = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching mood history:", error);
    return [];
  }
}

export default function MoodStats() {
  const [selectedSegment, setSelectedSegment] = useState(1);
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) {
      fetchMoodHistory(user.id).then(setMoodHistory);
    }
  }, [user]);

  // Prepare data for each segment
  const chartData = useMemo(() => {
    if (selectedSegment === 0) {
      // 1 Day: show moods for today (could be multiple entries)
      const today = new Date().toISOString().slice(0, 10);
      const todaysMoods = moodHistory.filter(
        (h) => h.created_at.slice(0, 10) === today
      );
      return todaysMoods.length
        ? todaysMoods.map((h: any, idx: number) => ({
            x: idx,
            label: h.label,
            mood: h.mood,
            color: h.color,
            value: getMoodValue(h.label, h.mood),
            time: new Date(h.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
        : [
            {
              x: 0,
              label: "No Entry",
              mood: "–",
              color: "#E9E3D7",
              value: 3,
              time: "",
            },
          ];
    } else if (selectedSegment === 1) {
      // 1 Week: show prominent mood for each day
      const last7Days = getLastNDays(7);
      return last7Days.map(({ date, day }, idx) => {
        const entries = moodHistory.filter(
          (h) => h.created_at.slice(0, 10) === date
        );
        // Pick the last mood of the day, or use a default
        const entry = entries.length ? entries[entries.length - 1] : null;
        return entry
          ? {
              x: idx,
              label: entry.label,
              mood: entry.mood,
              color: entry.color,
              value: getMoodValue(entry.label, entry.mood),
              day,
            }
          : {
              x: idx,
              label: "No Entry",
              mood: "–",
              color: "#E9E3D7",
              value: 3,
              day,
            };
      });
    } else {
      // 1 Month: show prominent mood for each week (or average)
      const last4Weeks = Array.from({ length: 4 }, (_, i) => i).map((i) => {
        const start = new Date();
        start.setDate(start.getDate() - 7 * (3 - i));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
      });
      return last4Weeks.map(({ start, end }, idx) => {
        const entries = moodHistory.filter((h) => {
          const d = new Date(h.created_at);
          return d >= start && d <= end;
        });
        if (entries.length) {
          // Use the most frequent mood label in the week
          const freq: Record<string, number> = {};
          entries.forEach((e) => {
            freq[e.label] = (freq[e.label] || 0) + 1;
          });
          const prominent = Object.entries(freq).sort(
            (a, b) => b[1] - a[1]
          )[0][0];
          const entry = entries.find((e) => e.label === prominent)!;
          return {
            x: idx,
            label: entry.label,
            mood: entry.mood,
            color: entry.color,
            value: getMoodValue(entry.label, entry.mood),
            week: `W${idx + 1}`,
          };
        }
        return {
          x: idx,
          label: "No Entry",
          mood: "–",
          color: "#E9E3D7",
          value: 3,
          week: `W${idx + 1}`,
        };
      });
    }
  }, [selectedSegment, moodHistory]);

  // SVG Path for smooth curve
  function getCurvePath(points: { x: number; value: number }[]) {
    if (points.length < 2) return "";
    const step = chartWidth / (points.length - 1);
    let d = `M 0 ${chartHeight - points[0].value * 18}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const x1 = (i - 1) * step;
      const y1 = chartHeight - prev.value * 18;
      const x2 = i * step;
      const y2 = chartHeight - curr.value * 18;
      const cpx = x1 + step / 2;
      d += ` C ${cpx} ${y1}, ${cpx} ${y2}, ${x2} ${y2}`;
    }
    return d;
  }

  // Prepare points for the curve
  const points = chartData.map((stat, idx) => ({
    x: idx,
    value: stat.value,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text style={styles.title}>Mood Stats</Text>
      <Text style={styles.subtitle}>See your mood through the day.</Text>
      <View style={styles.segmentRow}>
        {segments.map((seg, idx) => (
          <TouchableOpacity
            key={seg}
            style={[
              styles.segmentButton,
              idx === selectedSegment && styles.segmentButtonActive,
            ]}
            onPress={() => setSelectedSegment(idx)}
          >
            <Text
              style={[
                styles.segmentText,
                idx === selectedSegment && styles.segmentTextActive,
              ]}
            >
              {seg}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Mood Curve Chart */}
      <View style={styles.chartArea}>
        <Svg
          width={chartWidth}
          height={chartHeight}
          style={{ alignSelf: "center" }}
        >
          {/* Dotted grid lines */}
          {[1, 2, 3, 4, 5].map((i) => (
            <Path
              key={i}
              d={`M0 ${i * 20} H${chartWidth}`}
              stroke="#E9E3D7"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ))}
          {/* Mood curve */}
          <Path
            d={getCurvePath(points)}
            fill="none"
            stroke="#BCA27F"
            strokeWidth={3}
          />
          {/* Mood points */}
          {chartData.map((stat, idx) => {
            const denominator = chartData.length > 1 ? chartData.length - 1 : 1;
            const x = (idx * chartWidth) / denominator;
            const y = chartHeight - stat.value * 18;
            return (
              <Circle
                key={idx}
                cx={x}
                cy={y}
                r={14}
                fill="#FFF"
                stroke={stat.color}
                strokeWidth={3}
              />
            );
          })}
          {/* Mood emojis (SVG Text) */}
          {chartData.map((stat, idx) => {
            const denominator = chartData.length > 1 ? chartData.length - 1 : 1;
            const x = (idx * chartWidth) / denominator;
            const y = chartHeight - stat.value * 18;
            return (
              <SvgText
                key={idx}
                x={x}
                y={y - 18}
                fontSize={18}
                fill="#4D2C1D"
                fontWeight="bold"
                textAnchor="middle"
              >
                {stat.mood}
              </SvgText>
            );
          })}
        </Svg>
        {/* Days/Time row */}
        <View style={styles.daysRow}>
          {chartData.map((stat, idx) => (
            <Text key={idx} style={styles.dayText}>
              {selectedSegment === 0
                ? (stat as any).time?.toString() || "–"
                : selectedSegment === 1
                  ? (stat as any).day || "–"
                  : (stat as any).week || "–"}
            </Text>
          ))}
        </View>
      </View>
      {/* Mood History Row */}
      <View style={styles.historyRow}>
        {chartData.map((stat, idx) => (
          <View key={idx} style={styles.historyItem}>
            <Text style={styles.historyEmoji}>{stat.mood}</Text>
            <Text style={styles.historyDay}>
              {selectedSegment === 0
                ? "time" in stat && stat.time
                  ? stat.time
                  : "–"
                : selectedSegment === 1
                  ? "day" in stat && stat.day
                    ? stat.day
                    : "–"
                  : "week" in stat && stat.week
                    ? stat.week
                    : "–"}
            </Text>
          </View>
        ))}
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F5F2",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4D2C1D",
    marginBottom: 4,
  },
  subtitle: {
    color: "#BCA27F",
    fontSize: 15,
    marginBottom: 16,
  },
  segmentRow: {
    flexDirection: "row",
    marginBottom: 18,
    marginTop: 8,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#EFE8D9",
    marginRight: 8,
  },
  segmentButtonActive: {
    backgroundColor: "#4D2C1D",
  },
  segmentText: {
    color: "#BCA27F",
    fontWeight: "bold",
    fontSize: 14,
  },
  segmentTextActive: {
    color: "#FFF",
  },
  chartArea: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    minHeight: 140,
    position: "relative",
    alignItems: "center",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 8,
    width: chartWidth,
    alignSelf: "center",
  },
  dayText: {
    color: "#BCA27F",
    fontWeight: "bold",
    fontSize: 13,
    width: 32,
    textAlign: "center",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  historyItem: {
    alignItems: "center",
    marginRight: 12,
  },
  historyEmoji: {
    fontSize: 22,
  },
  historyDay: {
    color: "#BCA27F",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#B6E2A1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  addButtonText: {
    color: "#4D2C1D",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: -2,
  },
});
