import { View, Text } from "react-native";
import React, { useEffect } from "react";

export default function Chat() {
  useEffect(() => {
    console.log("chat screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>Chat Screen</Text>
    </View>
  );
}
