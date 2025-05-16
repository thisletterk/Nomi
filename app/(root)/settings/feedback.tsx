import { View, Text } from "react-native";
import React, { useEffect } from "react";

export default function Feedback() {
  useEffect(() => {
    console.log("Feedback screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>Feedback Screen</Text>
    </View>
  );
}
