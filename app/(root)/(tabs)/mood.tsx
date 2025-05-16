import { View, Text } from "react-native";
import React, { useEffect } from "react";

export default function Mood() {
  useEffect(() => {
    console.log("mood screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>Mood Screen</Text>
    </View>
  );
}
