import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { fontSizes } from "@/constants/fontSizes";

type DailyTipProps = {
  tip: string;
};

const DailyTip: React.FC<DailyTipProps> = ({ tip }) => (
  <View
    style={styles.sectionContainer}
    accessible={true}
    accessibilityLabel={`Daily tip: ${tip}`}
  >
    <Text
      style={styles.sectionHeader}
      accessibilityRole="header"
      accessible={true}
      accessibilityLabel="Daily Tip"
    >
      Daily Tip
    </Text>
    <Text style={styles.sectionBody} accessible={true} accessibilityLabel={tip}>
      {tip}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  sectionContainer: {
    padding: 20,
    backgroundColor: "#FFF4CC",
    borderRadius: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    color: "#4D2C1D",
    fontFamily: "JakartaBold",
    fontSize: fontSizes.subheading,
  },
  sectionBody: {
    color: "#4D2C1D",
    marginTop: 10,
    fontSize: fontSizes.body,
  },
});

export default DailyTip;
