import { Tabs } from "expo-router";
import {
  Image,
  ImageSourcePropType,
  View,
  TouchableOpacity,
  Animated,
} from "react-native";
import { icons } from "@/constants";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";

const TabIcon = ({
  source,
  focused,
}: {
  source: ImageSourcePropType;
  focused: boolean;
}) => (
  <View
    className={`items-center justify-center w-[50px] h-[50px] rounded-full ${focused ? "bg-white" : ""}`}
  >
    <Image
      source={source}
      style={{
        width: 24,
        height: 24,
        tintColor: focused ? "#4f3422" : "#999999",
      }}
      resizeMode="contain"
    />
  </View>
);

const Layout = () => {
  const router = useRouter();
  useEffect(() => {
    console.log("Tabs layout mounted");
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#f3f3f3",
          borderRadius: 50,
          height: 78,
          marginHorizontal: 20,
          marginBottom: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 5,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon source={icons.home} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="mood"
        options={{
          title: "Mood",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon source={icons.mood} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarStyle: { display: "none" },
          tabBarButton: (props) => (
            <CustomTabButton
              {...props}
              onPress={() => {
                router.push("/(root)/(tabs)/chat");
              }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="meds"
        options={{
          title: "Meds",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon source={icons.medication} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon source={icons.profile} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
};

interface CustomTabButtonProps extends BottomTabBarButtonProps {
  onPress?: () => void;
}

const CustomTabButton = ({ onPress }: CustomTabButtonProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        left: 0,
        right: 0,
        top: -30,
      }}
    >
      {/* Pulsating Glow */}
      <Animated.View
        style={{
          position: "absolute",
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: "#b6d47a",
          opacity: 0.5,
          zIndex: 0,
          transform: [{ scale: pulseAnim }],
        }}
      />
      <TouchableOpacity
        style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: "#9ab267",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
          zIndex: 1,
        }}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <Image
          source={icons.add}
          style={{
            width: 32,
            height: 32,
            tintColor: "white",
          }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default Layout;
