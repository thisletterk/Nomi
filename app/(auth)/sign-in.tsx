"use client";

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import MaskedView from "@react-native-masked-view/masked-view";

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

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const completeSignIn = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (completeSignIn.status === "complete") {
        await setActive({ session: completeSignIn.createdSessionId });
        router.replace("/(root)/(tabs)/home");
      } else {
        Alert.alert("Error", "Sign in incomplete. Please try again.");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      Alert.alert(
        "Sign In Failed",
        error.errors?.[0]?.message ||
          "Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <LinearGradient
        colors={["#0f0f0f", "#1f2937", "#111827", "#0f0f0f"]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
          >
            {/* Header */}
            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#3b82f6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="heart" size={40} color="#fff" />
              </View>
              <GradientText
                text="Welcome Back"
                style={{ fontSize: 28, marginBottom: 8 }}
              />
              <Text
                style={{ color: "#9ca3af", fontSize: 16, textAlign: "center" }}
              >
                Sign in to continue your wellness journey
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginBottom: 30 }}>
              {/* Email Input */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  Email
                </Text>
                <View
                  style={{
                    backgroundColor: "#374151",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#4b5563",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                  }}
                >
                  <Ionicons name="mail" size={20} color="#9ca3af" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="#6b7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      color: "#fff",
                      fontSize: 16,
                      paddingVertical: 16,
                      paddingLeft: 12,
                    }}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  Password
                </Text>
                <View
                  style={{
                    backgroundColor: "#374151",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#4b5563",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                  }}
                >
                  <Ionicons name="lock-closed" size={20} color="#9ca3af" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      color: "#fff",
                      fontSize: 16,
                      paddingVertical: 16,
                      paddingLeft: 12,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={{ alignSelf: "flex-end", marginBottom: 30 }}
              >
                <Text style={{ color: "#3b82f6", fontSize: 14 }}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <CustomButton
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              disabled={!email.trim() || !password.trim()}
              size="large"
            />

            {/* Sign Up Link */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 30,
              }}
            >
              <Text style={{ color: "#9ca3af", fontSize: 16 }}>
                Don't have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
                <Text
                  style={{ color: "#3b82f6", fontSize: 16, fontWeight: "600" }}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
