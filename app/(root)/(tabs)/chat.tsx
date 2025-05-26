"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  PermissionsAndroid,
  type ListRenderItem,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import axios from "axios";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";
import VoiceChatOverlay from "@/components/VoiceChatOverlay";

// Type definitions
interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
}

interface GradientTextProps {
  text: string;
}

type TypingIndicatorProps = {};

const GradientText: React.FC<GradientTextProps> = ({ text }) => (
  <MaskedView
    maskElement={
      <Text style={{ fontSize: 32, fontWeight: "bold", textAlign: "center" }}>
        {text}
      </Text>
    }
  >
    <LinearGradient
      colors={["#3b82f6", "#ec4899"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text
        style={{
          fontSize: 32,
          fontWeight: "bold",
          color: "transparent",
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </LinearGradient>
  </MaskedView>
);

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone Permission",
          message: "This app needs access to your microphone for voice input.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  } else {
    return true;
  }
}

export default function NomiChatScreen() {
  const { user } = useUser();
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceChatVisible, setVoiceChatVisible] = useState<boolean>(false);

  const flatListRef = useRef<FlatList<Message>>(null);

  const systemPrompt = {
    role: "system" as const,
    content:
      "You are a warm, friendly, and supportive conversation companion. Your tone is relaxed and casual, like a thoughtful friend who's always there to listen without judgment. Respond with kindness, empathy, and emotional intelligence. You don't need to diagnose or give medical advice — just listen, validate feelings, ask gentle follow-up questions, and help the user feel understood. Be curious, human-like, and safe. Keep your responses conversational and easy to relate to. Avoid technical or robotic language. Speak in a natural, comforting, and respectful tone. Always prioritize the user's emotional comfort and create a safe space for sharing anything they'd like.",
  };

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const TypingIndicator: React.FC<TypingIndicatorProps> = () => {
    const dotOpacity = [
      useRef(new Animated.Value(0.3)).current,
      useRef(new Animated.Value(0.3)).current,
      useRef(new Animated.Value(0.3)).current,
    ];

    useEffect(() => {
      const animations = dotOpacity.map((dot, idx) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(idx * 300),
            Animated.timing(dot, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        )
      );
      animations.forEach((anim) => anim.start());
      return () => animations.forEach((anim) => anim.stop());
    }, []);

    return (
      <View
        style={{
          flexDirection: "row",
          marginTop: 8,
          alignSelf: "flex-start",
          paddingHorizontal: 16,
        }}
      >
        {dotOpacity.map((opacity, idx) => (
          <Animated.View
            key={idx}
            style={{
              opacity,
              width: 6,
              height: 6,
              backgroundColor: "#888",
              borderRadius: 3,
              marginHorizontal: 2,
            }}
          />
        ))}
      </View>
    );
  };

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;
    setError(null);

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            systemPrompt,
            ...newMessages.map((m) => ({
              role: m.sender === "user" ? "user" : "assistant",
              content: m.text,
            })),
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const botReply = response.data.choices[0].message.content.trim();
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: botReply,
        timestamp: Date.now(),
      };

      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error("OpenAI Error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  const handleVoiceOnlyChat = useCallback((): void => {
    setVoiceChatVisible(true);
  }, []);

  const renderMessage: ListRenderItem<Message> = useCallback(
    ({ item }) => (
      <View
        style={{
          alignSelf: item.sender === "user" ? "flex-end" : "flex-start",
          backgroundColor: item.sender === "user" ? "#2563eb" : "#374151",
          borderRadius: 16,
          marginVertical: 4,
          marginHorizontal: 16,
          padding: 12,
          maxWidth: "80%",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>{item.text}</Text>
      </View>
    ),
    []
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <GradientText text={`Hello, ${user?.firstName || "there"}`} />
      </View>
    ),
    [user?.firstName]
  );

  const renderFooterComponent = useCallback(() => {
    if (!loading) return null;
    return <TypingIndicator />;
  }, [loading]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={{ flex: 1 }}>
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            ListEmptyComponent={renderEmptyComponent}
            ListFooterComponent={renderFooterComponent}
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: messages.length === 0 ? 0 : 60,
              paddingBottom: 120,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            getItemLayout={(data, index) => ({
              length: 60, // Approximate item height
              offset: 60 * index,
              index,
            })}
          />

          {/* Error Message */}
          {error && (
            <View
              style={{
                padding: 16,
                backgroundColor: "#dc2626",
                marginHorizontal: 16,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center" }}>
                {error}
              </Text>
            </View>
          )}

          {/* Input Area */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "#1f2937",
              padding: 10,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={handleVoiceOnlyChat}
              style={{
                marginHorizontal: 6,
                padding: 8,
                borderRadius: 20,
                backgroundColor: "#374151",
              }}
            >
              <FontAwesome name="microphone" size={24} color="#3b82f6" />
            </TouchableOpacity>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                backgroundColor: "#111827",
                borderRadius: 30,
                alignItems: "center",
                paddingHorizontal: 12,
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                style={{ flex: 1, color: "#fff", paddingVertical: 10 }}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={loading || !input.trim()}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={input.trim() ? "#3b82f6" : "#9ca3af"}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Voice Chat Overlay */}
      <VoiceChatOverlay
        visible={voiceChatVisible}
        onClose={() => setVoiceChatVisible(false)}
        systemPrompt={systemPrompt}
      />
    </SafeAreaView>
  );
}
