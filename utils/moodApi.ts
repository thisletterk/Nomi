export async function logMood({
  userId,
  mood,
  label,
  color,
}: {
  userId: string;
  mood: string;
  label: string;
  color: string;
}) {
  const res = await fetch("/api/mood", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, mood, label, color }),
  });
  if (!res.ok) throw new Error("Failed to log mood");
  return res.json();
}

export async function fetchMoodHistory(userId: string) {
  const res = await fetch(`/api/mood?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch mood history");
  const { data } = await res.json();
  return data;
}
