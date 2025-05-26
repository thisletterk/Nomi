import { Tabs } from "expo-router";
import {
  Image,
  ImageSourcePropType,
  View,
  TouchableOpacity,
} from "react-native";
import { icons } from "@/constants";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useEffect } from "react";

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
  // Inside your Layout component, add:
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
        // listeners={{
        //   tabPress: (e) => {
        //     // Prevent default behavior
        //     e.preventDefault();
        //     // Navigate to the chat screen
        //     router.push("/(root)/(tabs)/chat");
        //   },
        // }}
        options={{
          title: "Chat",
          headerShown: false,
          tabBarStyle: { display: "none" },
          tabBarButton: (props) => (
            <CustomTabButton
              {...props}
              onPress={() => {
                // Navigate to the chat screen with the correct path
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

// Extracted the custom button to a separate component for better organization
interface CustomTabButtonProps extends BottomTabBarButtonProps {
  onPress?: () => void;
}

const CustomTabButton = ({ onPress }: CustomTabButtonProps) => {
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
