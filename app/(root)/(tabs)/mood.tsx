import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import MoodMain from "@/app/(root)/mood/MoodMain";
import MoodStats from "@/app/(root)/mood/MoodStats";

const Tab = createMaterialTopTabNavigator();

export default function MoodTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarLabelStyle: {
          fontSize: 18,
          fontWeight: "bold",
          textTransform: "none",
        },
        tabBarIndicatorStyle: {
          backgroundColor: "#4D2C1D",
          height: 4,
          borderRadius: 2,
        },
        tabBarActiveTintColor: "#4D2C1D",
        tabBarInactiveTintColor: "#BCA27F",
        tabBarStyle: {
          backgroundColor: "#FFF",
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tab.Screen name="Mood" component={MoodMain} />
      <Tab.Screen name="Mood Stats" component={MoodStats} />
    </Tab.Navigator>
  );
}
