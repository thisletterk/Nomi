"use client";

import { View, Text, Dimensions, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import MaskedView from "@react-native-masked-view/masked-view";

const { width, height } = Dimensions.get("window");

const GradientText = ({ text, style }: { text: string; style?: any }) => (
  <MaskedView
    maskElement={
      <Text style={[{ fontSize: 32, fontWeight: "bold" }, style]}>{text}</Text>
    }
  >
    <LinearGradient
      colors={["#3b82f6", "#ec4899", "#8b5cf6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text
        style={[
          { fontSize: 32, fontWeight: "bold", color: "transparent" },
          style,
        ]}
      >
        {text}
      </Text>
    </LinearGradient>
  </MaskedView>
);

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <LinearGradient
        colors={["#0f0f0f", "#1f2937", "#111827", "#0f0f0f"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 40,
            minHeight: height - 100, // Ensure minimum height for centering
          }}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Logo/Icon */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#3b82f6",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 40,
              shadowColor: "#3b82f6",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Ionicons name="heart" size={60} color="#fff" />
          </View>

          {/* Welcome Text */}
          <View style={{ alignItems: "center", marginBottom: 50 }}>
            <GradientText
              text="Welcome to Nomi"
              style={{ fontSize: 36, marginBottom: 16 }}
            />
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 18,
                textAlign: "center",
                lineHeight: 26,
                paddingHorizontal: 20,
              }}
            >
              Your personal AI companion for mental wellness and emotional
              support
            </Text>
          </View>

          {/* Features */}
          <View style={{ marginBottom: 50, width: "100%" }}>
            {[
              {
                icon: "chatbubble-ellipses",
                title: "AI Chat Support",
                desc: "Talk to Nomi anytime",
              },
              {
                icon: "heart",
                title: "Mood Tracking",
                desc: "Monitor your emotional journey",
              },
              {
                icon: "analytics",
                title: "Personal Insights",
                desc: "Understand your patterns",
              },
            ].map((feature, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#374151",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "#4b5563",
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "#3b82f6",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}
                >
                  <Ionicons name={feature.icon as any} size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    {feature.title}
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                    {feature.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View style={{ width: "100%", gap: 16 }}>
            <CustomButton
              title="Get Started"
              onPress={() => router.push("/(auth)/sign-up")}
              size="large"
            />
            <CustomButton
              title="I Already Have an Account"
              onPress={() => router.push("/(auth)/sign-in")}
              variant="outline"
              size="large"
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
