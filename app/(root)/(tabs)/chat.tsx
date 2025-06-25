"use client";

import React from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { Ionicons, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";
import VoiceChatOverlay from "@/components/VoiceChatOverlay";
import { MoodAnalytics } from "@/lib/mood-analytics";

// Enhanced type definitions
interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: number;
  emotion?: "positive" | "neutral" | "concerned" | "supportive";
  isFollowUp?: boolean;
  isMemoryTouch?: boolean;
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

interface MoodTheme {
  primary: string[];
  secondary: string[];
  accent: string;
  textColor: string;
  bubbleColor: string;
}

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

// Mood-based themes for emotional responsiveness
const getMoodTheme = (moodSummary: string): MoodTheme => {
  const summary = moodSummary.toLowerCase();

  if (
    summary.includes("sad") ||
    summary.includes("down") ||
    summary.includes("overwhelmed")
  ) {
    return {
      primary: ["#1e3a8a", "#3730a3", "#312e81"], // Deep blues/purples
      secondary: ["#1f2937", "#374151"],
      accent: "#6366f1",
      textColor: "#e0e7ff",
      bubbleColor: "#312e81",
    };
  } else if (
    summary.includes("happy") ||
    summary.includes("great") ||
    summary.includes("excited")
  ) {
    return {
      primary: ["#ea580c", "#dc2626", "#be185d"], // Warm oranges/pinks
      secondary: ["#1f2937", "#374151"],
      accent: "#f59e0b",
      textColor: "#fef3c7",
      bubbleColor: "#dc2626",
    };
  } else if (
    summary.includes("anxious") ||
    summary.includes("stressed") ||
    summary.includes("worried")
  ) {
    return {
      primary: ["#065f46", "#047857", "#059669"], // Calming greens
      secondary: ["#1f2937", "#374151"],
      accent: "#10b981",
      textColor: "#d1fae5",
      bubbleColor: "#047857",
    };
  } else {
    return {
      primary: ["#0f0f0f", "#1f2937", "#111827"], // Default
      secondary: ["#374151", "#4b5563"],
      accent: "#3b82f6",
      textColor: "#e5e7eb",
      bubbleColor: "#374151",
    };
  }
};

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
  const [moodSummary, setMoodSummary] = useState<string>("");
  const [conversationStarters, setConversationStarters] = useState<
    ConversationStarter[]
  >([]);
  const [currentMoodTheme, setCurrentMoodTheme] = useState<MoodTheme>(
    getMoodTheme("")
  );
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [thinkingMessage, setThinkingMessage] = useState<string>(
    "Nomi is thinking..."
  );

  const flatListRef = useRef<FlatList<Message>>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Clear chat when leaving the screen
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log("🧠 Chat screen focused - loading mood summary...");
        loadMoodSummary();
        loadConversationStarters();
      }

      return () => {
        console.log("🧠 Chat screen unfocused - clearing messages...");
        setMessages([]);
        setShowStarters(true);
        setError(null);
      };
    }, [user])
  );

  useEffect(() => {
    if (user) {
      loadMoodSummary();
      loadConversationStarters();
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user && messages.length > 0) {
        console.log("🧠 Periodic mood summary refresh...");
        loadMoodSummary();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user, messages.length]);

  // Update theme when mood summary changes
  useEffect(() => {
    const newTheme = getMoodTheme(moodSummary);
    setCurrentMoodTheme(newTheme);
  }, [moodSummary]);

  const loadMoodSummary = async () => {
    if (!user) return;

    try {
      console.log("🧠 Loading mood summary for emotional awareness...");
      const summary = await MoodAnalytics.getSimpleMoodSummary(user.id, 5);
      setMoodSummary(summary);
      console.log("🧠 Mood summary loaded:", summary);
    } catch (error) {
      console.error("❌ Error loading mood summary:", error);
      setMoodSummary("");
    }
  };

  const loadConversationStarters = async () => {
    try {
      const starters: ConversationStarter[] = [
        {
          id: "feeling",
          text: "How are you feeling right now?",
          category: "mood",
          icon: "heart",
        },
        {
          id: "mind",
          text: "What's on your mind?",
          category: "general",
          icon: "chatbubble",
        },
        {
          id: "day",
          text: "Tell me about your day",
          category: "general",
          icon: "sunny",
        },
        {
          id: "listen",
          text: "I need someone to listen",
          category: "general",
          icon: "ear",
        },
        {
          id: "stressed",
          text: "I'm feeling stressed",
          category: "stress",
          icon: "alert-circle",
        },
        {
          id: "grateful",
          text: "What went well today?",
          category: "general",
          icon: "star",
        },
      ];

      setConversationStarters(starters);
      console.log("💭 Loaded conversation starters");
    } catch (error) {
      console.error("❌ Error loading conversation starters:", error);
    }
  };

  // Enhanced system prompt with emotional intelligence
  const generateSystemPrompt = (moodSummary: string, userName = "there") => ({
    role: "system" as const,
    content: `You are Nomi, a warm, emotionally intelligent companion who genuinely cares about ${userName}.

EMOTIONAL INTELLIGENCE:
- Show genuine empathy and emotional presence
- Listen deeply and respond to emotional undertones
- Remember and reference emotional patterns naturally
- Offer comfort during difficult times, celebrate during good times
- Use emotional language that resonates with their feelings
- Focus on building a caring, supportive relationship
- If appropriate, gently reference meaningful ${moodSummary} ${userName} has shared in the past to show that you remember and care. This builds trust and continuity in your companionship.


${moodSummary ? `MOOD AWARENESS:\n${moodSummary}\n\nUse this to show you remember and care about their emotional journey.` : ""}

CONVERSATION STYLE:
- Respond like a caring friend who truly knows them
- Use warm, natural language with appropriate emotional depth
- Ask thoughtful follow-up questions that show you're listening
- Share gentle insights when appropriate
- Use emojis sparingly but meaningfully

BOUNDARIES:
- You're a companion, not a therapist
- Encourage professional help for serious concerns
- Focus on emotional support and connection
- Avoid clinical language or diagnosis

Be present, caring, and emotionally attuned in every response.`,
  });

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  // Enhanced typing indicator with emotional intelligence
  const ThoughtfulTypingIndicator = () => {
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
          backgroundColor: currentMoodTheme.bubbleColor + "40",
          borderRadius: 16,
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor: currentMoodTheme.accent + "30",
        }}
      >
        <Text
          style={{
            color: currentMoodTheme.textColor,
            marginRight: 8,
            fontSize: 14,
          }}
        >
          {thinkingMessage}
        </Text>
        {dotOpacity.map((opacity, idx) => (
          <Animated.View
            key={idx}
            style={{
              opacity,
              width: 6,
              height: 6,
              backgroundColor: currentMoodTheme.accent,
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

  // Enhanced thinking messages based on context
  const getThinkingMessage = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    if (
      message.includes("sad") ||
      message.includes("down") ||
      message.includes("upset")
    ) {
      return "Nomi is finding gentle words for you...";
    } else if (
      message.includes("happy") ||
      message.includes("excited") ||
      message.includes("great")
    ) {
      return "Nomi is sharing in your joy...";
    } else if (
      message.includes("stressed") ||
      message.includes("anxious") ||
      message.includes("worried")
    ) {
      return "Nomi is thinking of ways to support you...";
    } else {
      return "Nomi is listening thoughtfully...";
    }
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

    // Set thoughtful thinking message
    setThinkingMessage(getThinkingMessage(textToSend));
    setLoading(true);

    // Add pause for emotional heavy messages (emotional intelligence)
    const isEmotionallyHeavy =
      textToSend.toLowerCase().includes("sad") ||
      textToSend.toLowerCase().includes("depressed") ||
      textToSend.toLowerCase().includes("anxious") ||
      textToSend.toLowerCase().includes("overwhelmed");

    if (isEmotionallyHeavy) {
      // Brief pause to simulate deep listening
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    try {
      await loadMoodSummary();

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            generateSystemPrompt(moodSummary, user?.firstName || "there"),
            ...newMessages.map((m) => ({
              role: m.sender === "user" ? "user" : "assistant",
              content: m.text,
            })),
          ],
          temperature: 0.8,
          max_tokens: 300,
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
        isMemoryTouch:
          botReply.toLowerCase().includes("you mentioned") ||
          botReply.toLowerCase().includes("remember"),
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

  // Enhanced message rendering with emotional intelligence
  const renderMessage: ListRenderItem<Message> = useCallback(
    ({ item }) => {
      const isUser = item.sender === "user";
      const emotionColors = {
        positive: [currentMoodTheme.accent, "#10b981"],
        supportive: ["#8b5cf6", "#7c3aed"],
        concerned: ["#f59e0b", "#d97706"],
        neutral: [currentMoodTheme.bubbleColor, currentMoodTheme.secondary[0]],
      };

      return (
        <Animated.View
          style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            marginVertical: 4,
            marginHorizontal: 16,
            maxWidth: "85%",
            opacity: fadeAnim,
          }}
        >
          {/* Memory touch indicator */}
          {item.isMemoryTouch && !isUser && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
                marginLeft: 8,
              }}
            >
              <Ionicons
                name="heart"
                size={12}
                color={currentMoodTheme.accent}
              />
              <Text
                style={{
                  color: currentMoodTheme.accent,
                  fontSize: 10,
                  marginLeft: 4,
                }}
              >
                remembering you
              </Text>
            </View>
          )}

          <View
            style={{
              backgroundColor: isUser
                ? "#2563eb"
                : currentMoodTheme.bubbleColor + "80",
              borderRadius: 20,
              padding: 16,
              borderBottomRightRadius: isUser ? 4 : 20,
              borderBottomLeftRadius: isUser ? 20 : 4,
              borderWidth: !isUser ? 1 : 0,
              borderColor: !isUser
                ? currentMoodTheme.accent + "30"
                : "transparent",
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
        </Animated.View>
      );
    },
    [currentMoodTheme, fadeAnim]
  );

  // Mood indicator component
  const MoodIndicator = () => {
    if (!moodSummary || moodSummary === "") return null;

    const getIndicatorText = (summary: string): string => {
      if (summary.includes("sad") || summary.includes("down")) {
        return "I notice you've been feeling a bit down lately 💙";
      } else if (summary.includes("happy") || summary.includes("great")) {
        return "You've been radiating positive energy lately ✨";
      } else if (summary.includes("stressed") || summary.includes("anxious")) {
        return "I sense you've been carrying some stress 🌿";
      } else {
        return "I'm here and aware of your emotional journey 💭";
      }
    };

    return (
      <View
        style={{
          backgroundColor: currentMoodTheme.accent + "20",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginHorizontal: 16,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: currentMoodTheme.accent + "30",
        }}
      >
        <Text
          style={{
            color: currentMoodTheme.accent,
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {getIndicatorText(moodSummary)}
        </Text>
      </View>
    );
  };

  const renderConversationStarters = () => (
    <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 16 }}>
      <Text
        style={{
          color: currentMoodTheme.textColor,
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
              backgroundColor: currentMoodTheme.bubbleColor + "60",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 12,
              margin: 6,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: currentMoodTheme.accent + "30",
              maxWidth: "90%",
            }}
          >
            <Ionicons
              name={starter.icon as any}
              size={16}
              color={currentMoodTheme.accent}
            />
            <Text
              style={{
                color: currentMoodTheme.textColor,
                marginLeft: 8,
                fontSize: 14,
                flexShrink: 1,
              }}
            >
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
              color: currentMoodTheme.textColor,
              fontSize: 18,
              textAlign: "center",
              marginTop: 12,
              lineHeight: 24,
            }}
          >
            I'm Nomi, and I'm here to listen.{"\n"}
            What's on your mind?
          </Text>
        </View>

        {showStarters && renderConversationStarters()}
      </View>
    ),
    [user?.firstName, showStarters, conversationStarters, currentMoodTheme]
  );

  const renderFooterComponent = useCallback(() => {
    if (!loading) return null;
    return <ThoughtfulTypingIndicator />;
  }, [loading, thinkingMessage, currentMoodTheme]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <LinearGradient
          colors={currentMoodTheme.primary as [string, string, ...string[]]}
          style={{ flex: 1 }}
        >
          {/* Enhanced Header with Emotional Presence */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: currentMoodTheme.accent + "30",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Animated.View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#10b981",
                  marginRight: 8,
                  transform: [{ scale: pulseAnim }],
                }}
              />
              <Text
                style={{
                  color: currentMoodTheme.textColor,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                Nomi
              </Text>
              <Text
                style={{
                  color: currentMoodTheme.textColor + "80",
                  fontSize: 12,
                  marginLeft: 8,
                }}
              >
                emotionally present
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setMessages([]);
                setShowStarters(true);
                setError(null);
                loadMoodSummary();
              }}
              style={{ padding: 8 }}
            >
              <MaterialIcons
                name="refresh"
                size={20}
                color={currentMoodTheme.textColor}
              />
            </TouchableOpacity>
          </View>

          {/* Mood Awareness Indicator */}
          <MoodIndicator />

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

          {/* Enhanced Input Area */}
          <View
            style={{
              backgroundColor: currentMoodTheme.secondary[0],
              padding: 16,
              flexDirection: "row",
              alignItems: "flex-end",
              borderTopWidth: 1,
              borderTopColor: currentMoodTheme.accent + "30",
            }}
          >
            <TouchableOpacity
              onPress={handleVoiceOnlyChat}
              style={{
                marginRight: 12,
                padding: 12,
                borderRadius: 24,
                backgroundColor: currentMoodTheme.bubbleColor,
                borderWidth: 1,
                borderColor: currentMoodTheme.accent + "30",
              }}
            >
              <FontAwesome
                name="microphone"
                size={20}
                color={currentMoodTheme.accent}
              />
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                backgroundColor: currentMoodTheme.secondary[1],
                borderRadius: 24,
                alignItems: "flex-end",
                paddingHorizontal: 16,
                paddingVertical: 4,
                maxHeight: 120,
                borderWidth: 1,
                borderColor: currentMoodTheme.accent + "20",
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Share what's on your mind..."
                placeholderTextColor={currentMoodTheme.textColor + "60"}
                style={{
                  flex: 1,
                  color: currentMoodTheme.textColor,
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
                  color={
                    input.trim()
                      ? currentMoodTheme.accent
                      : currentMoodTheme.textColor + "40"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* Voice Chat Overlay */}
      <VoiceChatOverlay
        visible={voiceChatVisible}
        onClose={() => setVoiceChatVisible(false)}
        systemPrompt={generateSystemPrompt(
          moodSummary,
          user?.firstName || "there"
        )}
      />
    </SafeAreaView>
  );
}
