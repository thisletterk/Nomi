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
import { Ionicons, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";
import VoiceChatOverlay from "@/components/VoiceChatOverlay";

// Enhanced type definitions
interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  emotion?: "positive" | "neutral" | "concerned" | "supportive";
  isFollowUp?: boolean;
}

interface GradientTextProps {
  text: string;
}

interface ConversationStarter {
  id: string;
  text: string;
  category: "mood" | "stress" | "general" | "goals";
  icon: string;
}

const conversationStarters: ConversationStarter[] = [
  {
    id: "1",
    text: "How are you feeling today?",
    category: "mood",
    icon: "heart",
  },
  {
    id: "2",
    text: "What's on your mind?",
    category: "general",
    icon: "chatbubble",
  },
  {
    id: "3",
    text: "Tell me about your day",
    category: "general",
    icon: "sunny",
  },
  {
    id: "4",
    text: "I'm feeling stressed",
    category: "stress",
    icon: "alert-circle",
  },
  {
    id: "5",
    text: "I want to talk about my goals",
    category: "goals",
    icon: "flag",
  },
  {
    id: "6",
    text: "I need someone to listen",
    category: "general",
    icon: "ear",
  },
];

const GradientText: React.FC<GradientTextProps> = ({ text }) => (
  <MaskedView
    maskElement={
      <Text style={{ fontSize: 28, fontWeight: "bold", textAlign: "center" }}>
        {text}
      </Text>
    }
  >
    <LinearGradient
      colors={["#3b82f6", "#ec4899", "#8b5cf6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text
        style={{
          fontSize: 28,
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
          title: "Voice Chat Permission",
          message:
            "Nomi would like to use your microphone for voice conversations.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "Allow",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
}

export default function NomiChatScreen() {
  const { user } = useUser();
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceChatVisible, setVoiceChatVisible] = useState<boolean>(false);
  const [showStarters, setShowStarters] = useState<boolean>(true);

  const flatListRef = useRef<FlatList<Message>>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Enhanced system prompt for better mental health conversations
  const systemPrompt = {
    role: "system" as const,
    content: `You are Nomi, a compassionate AI companion designed to provide emotional support and mental wellness guidance. Your approach is:

PERSONALITY:
- Warm, empathetic, and genuinely caring
- Non-judgmental and patient listener
- Curious about the user's experiences without being intrusive
- Encouraging and hopeful, but realistic
- Uses natural, conversational language like a trusted friend

CONVERSATION STYLE:
- Ask thoughtful follow-up questions to understand deeper
- Validate emotions and experiences ("That sounds really challenging")
- Offer gentle insights and coping strategies when appropriate
- Use reflective listening ("It sounds like you're feeling...")
- Share relatable perspectives without making it about you
- Keep responses conversational length (2-4 sentences typically)

MENTAL HEALTH APPROACH:
- Focus on emotional support, not diagnosis or medical advice
- Encourage professional help when needed
- Teach healthy coping mechanisms and mindfulness
- Help users identify patterns and triggers
- Celebrate small wins and progress
- Create a safe, non-judgmental space

BOUNDARIES:
- If someone mentions self-harm or crisis, gently encourage professional help
- Don't provide medical diagnoses or replace therapy
- Stay supportive but maintain appropriate boundaries

Remember: You're here to listen, support, and help users feel understood and less alone.`,
  };

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  const TypingIndicator = () => {
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
          paddingVertical: 12,
          backgroundColor: "#374151",
          borderRadius: 16,
          marginHorizontal: 16,
        }}
      >
        <Text style={{ color: "#9ca3af", marginRight: 8, fontSize: 14 }}>
          Nomi is thinking
        </Text>
        {dotOpacity.map((opacity, idx) => (
          <Animated.View
            key={idx}
            style={{
              opacity,
              width: 6,
              height: 6,
              backgroundColor: "#3b82f6",
              borderRadius: 3,
              marginHorizontal: 2,
            }}
          />
        ))}
      </View>
    );
  };

  const determineMessageEmotion = (text: string): Message["emotion"] => {
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes("great") ||
      lowerText.includes("happy") ||
      lowerText.includes("wonderful")
    ) {
      return "positive";
    }
    if (
      lowerText.includes("sorry") ||
      lowerText.includes("understand") ||
      lowerText.includes("here for you")
    ) {
      return "supportive";
    }
    if (
      lowerText.includes("concerned") ||
      lowerText.includes("important") ||
      lowerText.includes("help")
    ) {
      return "concerned";
    }
    return "neutral";
  };

  const sendMessage = async (messageText?: string): Promise<void> => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    setError(null);
    setShowStarters(false);

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
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
          model: "gpt-4o-mini", // Using more capable model for better conversations
          messages: [
            systemPrompt,
            ...newMessages.map((m) => ({
              role: m.sender === "user" ? "user" : "assistant",
              content: m.text,
            })),
          ],
          temperature: 0.8, // Slightly more creative responses
          max_tokens: 300, // Reasonable response length
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
        emotion: determineMessageEmotion(botReply),
      };

      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error("OpenAI Error:", error);
      setError(
        "I'm having trouble connecting right now. Please try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceOnlyChat = useCallback((): void => {
    setVoiceChatVisible(true);
  }, []);

  const handleStarterPress = (starter: ConversationStarter) => {
    sendMessage(starter.text);
  };

  const renderMessage: ListRenderItem<Message> = useCallback(({ item }) => {
    const isUser = item.sender === "user";
    const emotionColors = {
      positive: ["#10b981", "#059669"],
      supportive: ["#8b5cf6", "#7c3aed"],
      concerned: ["#f59e0b", "#d97706"],
      neutral: ["#374151", "#4b5563"],
    };

    return (
      <View
        style={{
          alignSelf: isUser ? "flex-end" : "flex-start",
          marginVertical: 4,
          marginHorizontal: 16,
          maxWidth: "85%",
        }}
      >
        <View
          style={{
            backgroundColor: isUser ? "#2563eb" : "#374151",
            borderRadius: 20,
            padding: 16,
            borderBottomRightRadius: isUser ? 4 : 20,
            borderBottomLeftRadius: isUser ? 20 : 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, lineHeight: 22 }}>
            {item.text}
          </Text>
        </View>

        {!isUser && item.emotion && (
          <View style={{ flexDirection: "row", marginTop: 4, marginLeft: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: emotionColors[item.emotion][0],
                opacity: 0.6,
              }}
            />
          </View>
        )}
      </View>
    );
  }, []);

  const renderConversationStarters = () => (
    <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 16 }}>
      <Text
        style={{
          color: "#9ca3af",
          fontSize: 16,
          textAlign: "center",
          marginBottom: 20,
          fontWeight: "500",
        }}
      >
        How can I support you today?
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {conversationStarters.map((starter) => (
          <TouchableOpacity
            key={starter.id}
            onPress={() => handleStarterPress(starter)}
            style={{
              backgroundColor: "#374151",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              margin: 6,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#4b5563",
            }}
          >
            <Ionicons name={starter.icon as any} size={16} color="#3b82f6" />
            <Text style={{ color: "#e5e7eb", marginLeft: 8, fontSize: 14 }}>
              {starter.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 60,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <GradientText text={`Hi ${user?.firstName || "there"} 👋`} />
          <Text
            style={{
              color: "#9ca3af",
              fontSize: 18,
              textAlign: "center",
              marginTop: 12,
              lineHeight: 24,
            }}
          >
            I'm Nomi, your personal wellness companion.{"\n"}
            I'm here to listen and support you.
          </Text>
        </View>

        {showStarters && renderConversationStarters()}
      </View>
    ),
    [user?.firstName, showStarters]
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
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#374151",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#10b981",
                  marginRight: 8,
                }}
              />
              <Text
                style={{ color: "#e5e7eb", fontSize: 16, fontWeight: "500" }}
              >
                Nomi is here
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setMessages([]);
                setShowStarters(true);
              }}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="refresh" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

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
              paddingBottom: 120,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
          />

          {/* Error Message */}
          {error && (
            <View
              style={{
                padding: 16,
                backgroundColor: "#dc2626",
                marginHorizontal: 16,
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              <Text
                style={{ color: "#fff", textAlign: "center", fontSize: 14 }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Input Area */}
          <View
            style={{
              backgroundColor: "#1f2937",
              padding: 16,
              flexDirection: "row",
              alignItems: "flex-end",
              borderTopWidth: 1,
              borderTopColor: "#374151",
            }}
          >
            <TouchableOpacity
              onPress={handleVoiceOnlyChat}
              style={{
                marginRight: 12,
                padding: 12,
                borderRadius: 24,
                backgroundColor: "#374151",
              }}
            >
              <FontAwesome name="microphone" size={20} color="#3b82f6" />
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                backgroundColor: "#111827",
                borderRadius: 24,
                alignItems: "flex-end",
                paddingHorizontal: 16,
                paddingVertical: 4,
                maxHeight: 120,
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Share what's on your mind..."
                placeholderTextColor="#6b7280"
                style={{
                  flex: 1,
                  color: "#fff",
                  paddingVertical: 12,
                  fontSize: 16,
                  lineHeight: 20,
                }}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <TouchableOpacity
                onPress={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{ paddingBottom: 12, paddingLeft: 8 }}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={input.trim() ? "#3b82f6" : "#6b7280"}
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
