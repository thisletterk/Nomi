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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import MaskedView from "@react-native-masked-view/masked-view";
import { fetchAPI } from "@/lib/fetch";

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

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;

    setGoogleLoading(true);
    try {
      const {
        createdSessionId,
        signIn,
        signUp,
        setActive: oauthSetActive,
      } = await startOAuthFlow();

      if (createdSessionId && oauthSetActive) {
        await oauthSetActive({ session: createdSessionId });

        // If this was a new user creation, create them in the database
        if (signUp && signUp.createdUserId) {
          console.log(
            "New user created via Google OAuth:",
            signUp.createdUserId
          );

          // Get user info from Clerk and create in database
          try {
            const response = await fetchAPI(`/(api)/user`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                firstname: signUp.firstName || "",
                lastname: signUp.lastName || "",
                username:
                  signUp.username || signUp.emailAddress?.split("@")[0] || "",
                email: signUp.emailAddress || "",
                clerkId: signUp.createdUserId,
              }),
            });
            console.log("OAuth user created in database:", response);
          } catch (dbError) {
            console.error("Failed to create OAuth user in DB:", dbError);
            // Don't block the flow
          }
        }

        router.replace("/(root)/(tabs)/home");
      }
    } catch (error: any) {
      console.error("Google sign up error:", error);
      Alert.alert(
        "Google Sign Up Failed",
        error?.message || "Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isLoaded) return;

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      // Always generate a username - either from user input or email
      const finalUsername = username.trim() || email.split("@")[0];

      // Update the username state so it's available for database creation
      if (!username.trim()) {
        setUsername(finalUsername);
      }

      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password: password,
        username: finalUsername,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (error: any) {
      console.error("Sign up error:", error);
      Alert.alert(
        "Sign Up Failed",
        error?.errors?.[0]?.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded) return;

    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      console.log("Complete signup response:", {
        status: completeSignUp.status,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });

        const userId = completeSignUp.createdUserId;
        await createUserInDatabase(userId);

        router.replace("/(root)/(tabs)/home");
      } else {
        console.log("Signup status:", completeSignUp.status);

        Alert.alert(
          "Verification Incomplete",
          "Please ensure all required information is provided. If the issue persists, try signing up again.",
          [
            {
              text: "Try Again",
              onPress: () => setPendingVerification(false),
            },
            {
              text: "Continue",
              onPress: () => {
                if (completeSignUp.createdSessionId) {
                  setActive({ session: completeSignUp.createdSessionId })
                    .then(() => {
                      if (completeSignUp.createdUserId) {
                        return createUserInDatabase(
                          completeSignUp.createdUserId
                        );
                      }
                    })
                    .then(() => {
                      router.replace("/(root)/(tabs)/home");
                    })
                    .catch((err) => {
                      console.error("Error in continue flow:", err);
                      Alert.alert("Error", "Please try signing up again.");
                    });
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      Alert.alert(
        "Verification Failed",
        error?.errors?.[0]?.message || "Please check your code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const createUserInDatabase = async (
    clerkUserId: string | null | undefined
  ) => {
    if (!clerkUserId) {
      console.error("No Clerk user ID provided");
      return;
    }

    try {
      const finalUsername = username.trim() || email.split("@")[0];

      const response = await fetchAPI(`/(api)/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstname: firstName.trim(),
          lastname: lastName.trim(),
          username: finalUsername,
          email: email.trim(),
          clerkId: clerkUserId,
        }),
      });

      console.log("User created in database:", response);
    } catch (dbError) {
      console.error("Failed to create user in DB:", dbError);
      Alert.alert(
        "Account Created",
        "Your account was created successfully, but there was an issue saving additional details. You can still continue.",
        [{ text: "Continue" }]
      );
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
        <LinearGradient
          colors={["#0f0f0f", "#1f2937", "#111827", "#0f0f0f"]}
          style={{ flex: 1 }}
        >
          <View
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
          >
            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#8b5cf6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="mail" size={40} color="#fff" />
              </View>
              <GradientText
                text="Check Your Email"
                style={{ fontSize: 24, marginBottom: 8 }}
              />
              <Text
                style={{ color: "#9ca3af", fontSize: 16, textAlign: "center" }}
              >
                We've sent a verification code to{"\n"}
                <Text style={{ color: "#3b82f6" }}>{email}</Text>
              </Text>
            </View>

            <View style={{ marginBottom: 30 }}>
              <Text
                style={{
                  color: "#e5e7eb",
                  fontSize: 16,
                  fontWeight: "500",
                  marginBottom: 8,
                }}
              >
                Verification Code
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
                <Ionicons name="key" size={20} color="#9ca3af" />
                <TextInput
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    flex: 1,
                    color: "#fff",
                    fontSize: 16,
                    paddingVertical: 16,
                    paddingLeft: 12,
                    textAlign: "center",
                    letterSpacing: 2,
                  }}
                />
              </View>
            </View>

            <CustomButton
              title="Verify Email"
              onPress={handleVerification}
              loading={loading}
              disabled={!verificationCode.trim()}
              size="large"
            />

            <TouchableOpacity
              style={{ alignSelf: "center", marginTop: 20 }}
              onPress={() => {
                signUp?.prepareEmailAddressVerification({
                  strategy: "email_code",
                });
              }}
            >
              <Text style={{ color: "#3b82f6", fontSize: 14 }}>
                Didn't receive the code? Resend
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignSelf: "center", marginTop: 20 }}
              onPress={() => setPendingVerification(false)}
            >
              <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                ← Back to Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 20,
              paddingVertical: 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#ec4899",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="person-add" size={40} color="#fff" />
              </View>
              <GradientText
                text="Create Account"
                style={{ fontSize: 28, marginBottom: 8 }}
              />
              <Text
                style={{ color: "#9ca3af", fontSize: 16, textAlign: "center" }}
              >
                Join Nomi and start your wellness journey
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleGoogleSignUp}
              disabled={googleLoading}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                marginBottom: 30,
                opacity: googleLoading ? 0.7 : 1,
              }}
            >
              <Ionicons
                name="logo-google"
                size={20}
                color="#4285f4"
                style={{ marginRight: 12 }}
              />
              <Text
                style={{ color: "#374151", fontSize: 16, fontWeight: "600" }}
              >
                {googleLoading
                  ? "Signing up with Google..."
                  : "Continue with Google"}
              </Text>
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 30,
              }}
            >
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#4b5563" }}
              />
              <Text
                style={{
                  color: "#9ca3af",
                  paddingHorizontal: 16,
                  fontSize: 14,
                }}
              >
                or
              </Text>
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#4b5563" }}
              />
            </View>

            <View style={{ marginBottom: 30 }}>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: 16,
                      fontWeight: "500",
                      marginBottom: 8,
                    }}
                  >
                    First Name
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
                    <Ionicons name="person" size={20} color="#9ca3af" />
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                      placeholderTextColor="#6b7280"
                      autoCapitalize="words"
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

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: 16,
                      fontWeight: "500",
                      marginBottom: 8,
                    }}
                  >
                    Last Name
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
                    <Ionicons name="person" size={20} color="#9ca3af" />
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last name"
                      placeholderTextColor="#6b7280"
                      autoCapitalize="words"
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
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  Username (Optional)
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
                  <Ionicons name="at" size={20} color="#9ca3af" />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    placeholderTextColor="#6b7280"
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
                    placeholder="Create a password"
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

              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontSize: 16,
                    fontWeight: "500",
                    marginBottom: 8,
                  }}
                >
                  Confirm Password
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
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#6b7280"
                    secureTextEntry={!showConfirmPassword}
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
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <CustomButton
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              disabled={
                !firstName.trim() ||
                !lastName.trim() ||
                !email.trim() ||
                !password.trim() ||
                !confirmPassword.trim()
              }
              size="large"
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 30,
              }}
            >
              <Text style={{ color: "#9ca3af", fontSize: 16 }}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
                <Text
                  style={{ color: "#3b82f6", fontSize: 16, fontWeight: "600" }}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
