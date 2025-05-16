import { View, Text } from "react-native";
import React, { useEffect } from "react";

export default function HelpCenter() {
  useEffect(() => {
    console.log("HelpCenter screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>HelpCenter Screen</Text>
    </View>
  );
}
