import { View, Text } from "react-native";
import React, { useEffect } from "react";

export default function Security() {
  useEffect(() => {
    console.log("Security screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>Security Screen</Text>
    </View>
  );
}
