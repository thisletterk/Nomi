"use client";

import React from "react";

import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getSqlClient, isDatabaseAvailable } from "../lib/neon-client";

export default function DatabaseInitializer() {
  const [initializing, setInitializing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const initializeDatabase = async () => {
    if (!isDatabaseAvailable()) {
      Alert.alert("Error", "Database not available");
      return;
    }

    setInitializing(true);
    try {
      const sql = getSqlClient();
      if (!sql) throw new Error("SQL client not available");

      // Create mood_types table
      await sql`
        CREATE TABLE IF NOT EXISTS mood_types (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          emoji VARCHAR(10) NOT NULL,
          color VARCHAR(20) NOT NULL,
          value INTEGER NOT NULL CHECK (value >= 1 AND value <= 5)
        )
      `;

      // Insert mood types
      await sql`
        INSERT INTO mood_types (id, name, emoji, color, value) VALUES
          ('very-sad', 'Very Sad', '😢', '#ef4444', 1),
          ('sad', 'Sad', '😔', '#f97316', 2),
          ('neutral', 'Neutral', '😐', '#eab308', 3),
          ('happy', 'Happy', '😊', '#22c55e', 4),
          ('very-happy', 'Very Happy', '😄', '#10b981', 5)
        ON CONFLICT (id) DO NOTHING
      `;

      // Create mood_entries table
      await sql`
        CREATE TABLE IF NOT EXISTS mood_entries (
          id VARCHAR(100) PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          mood_type_id VARCHAR(50) NOT NULL REFERENCES mood_types(id),
          intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
          note TEXT,
          date DATE NOT NULL,
          timestamp BIGINT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON mood_entries(timestamp)`;

      // Create trigger function
      await sql`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `;

      // Create trigger
      await sql`
        DROP TRIGGER IF EXISTS update_mood_entries_updated_at ON mood_entries;
        CREATE TRIGGER update_mood_entries_updated_at 
            BEFORE UPDATE ON mood_entries 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column()
      `;

      setInitialized(true);
      Alert.alert("Success! 🎉", "Database tables created successfully!");
    } catch (error) {
      console.error("Database initialization error:", error);
      Alert.alert("Error", `Failed to initialize database: ${error}`);
    } finally {
      setInitializing(false);
    }
  };

  const checkTables = async () => {
    if (!isDatabaseAvailable()) return;

    try {
      const sql = getSqlClient();
      if (!sql) return;

      // Check if tables exist
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('mood_types', 'mood_entries')
      `;

      if (result.length === 2) {
        setInitialized(true);
      }
    } catch (error) {
      console.error("Error checking tables:", error);
    }
  };

  // Check tables on mount
  React.useEffect(() => {
    checkTables();
  }, []);

  if (!isDatabaseAvailable()) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: initialized ? "#10b981" : "#f59e0b",
        padding: 12,
        margin: 16,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons
        name={
          initializing
            ? "hourglass"
            : initialized
              ? "checkmark-circle"
              : "construct"
        }
        size={20}
        color="#fff"
      />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {initializing
            ? "Setting up database..."
            : initialized
              ? "Database Ready"
              : "Database Setup Required"}
        </Text>
        <Text style={{ color: "#fff", fontSize: 12 }}>
          {initialized ? "All tables created" : "Tap to create required tables"}
        </Text>
      </View>
      {!initialized && !initializing && (
        <TouchableOpacity
          onPress={initializeDatabase}
          style={{
            backgroundColor: "#fff",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "#f59e0b", fontWeight: "bold", fontSize: 12 }}>
            Setup
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
