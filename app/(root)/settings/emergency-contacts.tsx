import { View, Text } from "react-native";
import React, { useEffect } from "react";

export default function EmergencyContacts() {
  useEffect(() => {
    console.log("EmergencyContacts screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>EmergencyContacts Screen</Text>
    </View>
  );
}
