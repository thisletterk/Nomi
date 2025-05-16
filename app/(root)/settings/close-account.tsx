import { View, Text } from "react-native";
import React, { useEffect } from "react";

export default function CloseAccounts() {
  useEffect(() => {
    console.log("CloseAccounts screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>CloseAccounts Screen</Text>
    </View>
  );
}
