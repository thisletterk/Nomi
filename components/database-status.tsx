"use client";

import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { testConnection, isDatabaseAvailable } from "../lib/neon-client";

export default function DatabaseStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setTesting(true);
    const connected = await testConnection();
    setIsConnected(connected);
    setTesting(false);
  };

  if (!isDatabaseAvailable()) {
    return (
      <View
        style={{
          backgroundColor: "#ef4444",
          padding: 12,
          margin: 16,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons name="warning" size={20} color="#fff" />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            Database Not Configured
          </Text>
          <Text style={{ color: "#fff", fontSize: 12 }}>
            Please set EXPO_PUBLIC_DATABASE_URL in your .env file
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={checkConnection}
      style={{
        backgroundColor: isConnected ? "#10b981" : "#ef4444",
        padding: 12,
        margin: 16,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons
        name={
          testing
            ? "hourglass"
            : isConnected
              ? "checkmark-circle"
              : "close-circle"
        }
        size={20}
        color="#fff"
      />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {testing
            ? "Testing..."
            : isConnected
              ? "Database Connected"
              : "Database Error"}
        </Text>
        <Text style={{ color: "#fff", fontSize: 12 }}>
          Tap to test connection
        </Text>
      </View>
    </TouchableOpacity>
  );
}
