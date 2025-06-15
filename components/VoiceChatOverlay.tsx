"use client";
import { Buffer } from "buffer";
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import * as FileSystem from "expo-file-system";

const { width, height } = Dimensions.get("window");

// Enhanced system prompt for voice conversations
const DEFAULT_SYSTEM_PROMPT = {
  role: "system",
  content: `You are Nomi, a compassionate voice companion for mental wellness. In voice conversations:

VOICE PERSONALITY:
- Speak naturally and conversationally, like a caring friend
- Use a warm, gentle tone that feels safe and non-judgmental
- Keep responses concise but meaningful (1-3 sentences typically)
- Use natural speech patterns with appropriate pauses
- Show genuine interest and empathy in your voice responses

CONVERSATION APPROACH:
- Listen actively and respond to the emotional undertone
- Ask one thoughtful follow-up question to keep dialogue flowing
- Validate feelings before offering any insights
- Use phrases like "I hear you saying..." or "That sounds..."
- Be present and engaged, not robotic or clinical

MENTAL HEALTH FOCUS:
- Create a safe space for emotional expression
- Encourage self-reflection through gentle questions
- Offer coping strategies when appropriate
- Recognize when someone needs professional support
- Celebrate small steps and progress

Keep responses natural and conversational for voice interaction.`,
};

interface VoiceChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  systemPrompt?: any;
}

export default function VoiceChatOverlay({
  visible,
  onClose,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
}: VoiceChatOverlayProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [sessionDuration, setSessionDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  // Enhanced animations
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.9)).current;
  const pulseRing1 = useRef(new Animated.Value(1)).current;
  const pulseRing2 = useRef(new Animated.Value(1)).current;
  const pulseRing3 = useRef(new Animated.Value(1)).current;

  // Breathing animation for relaxation
  const breatheScale = useRef(new Animated.Value(1)).current;

  // Waveform for listening state
  const waveHeights = useRef(
    Array.from({ length: 24 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (visible) {
      isActiveRef.current = true;
      initializeAudio();
      startSessionTimer();
    } else {
      isActiveRef.current = false;
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [visible]);

  useEffect(() => {
    if (isListening) {
      startListeningAnimations();
    } else if (isProcessing) {
      startProcessingAnimations();
    } else if (isPlaying) {
      startSpeakingAnimations();
    } else {
      startIdleAnimations();
    }
  }, [isListening, isProcessing, isPlaying]);

  const startSessionTimer = () => {
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);
  };

  const cleanup = async () => {
    console.log("🧹 Cleaning up voice chat...");

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (error) {
        console.log("Error cleaning up recording:", error);
      }
      recordingRef.current = null;
    }

    setIsListening(false);
    setIsProcessing(false);
    setIsPlaying(false);
    setSessionDuration(0);
  };

  const initializeAudio = async () => {
    try {
      console.log("🎤 Initializing voice chat...");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Microphone Access",
          "Voice chat needs microphone access to work properly."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      setTimeout(() => {
        if (isActiveRef.current) {
          startListening();
        }
      }, 1000);
    } catch (error) {
      console.error("❌ Audio initialization failed:", error);
      Alert.alert("Audio Error", "Unable to initialize voice chat");
    }
  };

  const startListening = async () => {
    try {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.log("Previous recording cleanup:", e);
        }
        recordingRef.current = null;
      }

      console.log("🎙️ Starting to listen...");
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
      });

      recordingRef.current = recording;
      setIsListening(true);
      setCurrentTranscript("");
      setAiResponse("");

      // Auto-stop after 10 seconds for better conversation flow
      timeoutRef.current = setTimeout(() => {
        console.log("⏰ Auto-stopping recording");
        stopAndProcessRecording();
      }, 10000);
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      Alert.alert("Recording Error", "Unable to start voice recording");
      setIsListening(false);
    }
  };

  const stopAndProcessRecording = async () => {
    if (!recordingRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsListening(false);
    setIsProcessing(true);

    try {
      console.log("🛑 Processing voice input...");
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        await transcribeAudio(uri);
      } else {
        console.log("❌ No audio recorded");
        setIsProcessing(false);
        setTimeout(() => {
          if (isActiveRef.current) startListening();
        }, 1500);
      }
    } catch (error) {
      console.error("❌ Error processing recording:", error);
      setIsProcessing(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 1500);
    } finally {
      recordingRef.current = null;
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
        Alert.alert("Configuration Error", "OpenAI API key not found");
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        type: "audio/m4a",
        name: "voice-input.m4a",
      } as any);
      formData.append("model", "whisper-1");
      formData.append("language", "en");

      console.log("📤 Transcribing audio...");
      const transcriptionResponse = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        }
      );

      const transcript = transcriptionResponse.data.text.trim();
      console.log("📝 Transcript:", transcript);
      setCurrentTranscript(transcript);

      if (!transcript || transcript.length < 3) {
        console.log("⚠️ Transcript too short, continuing...");
        setIsProcessing(false);
        setTimeout(() => {
          setCurrentTranscript("");
          if (isActiveRef.current) startListening();
        }, 1000);
        return;
      }

      const newHistory = [
        ...conversationHistory,
        { role: "user", content: transcript },
      ];
      setConversationHistory(newHistory);
      await getAIResponse(newHistory);
    } catch (error) {
      console.error("❌ Transcription error:", error);
      Alert.alert(
        "Voice Processing Error",
        "Unable to process your voice input"
      );
      setIsProcessing(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 2000);
    }
  };

  const getAIResponse = async (history: any[]) => {
    try {
      console.log("🧠 Getting AI response...");
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [systemPrompt, ...history],
          temperature: 0.8,
          max_tokens: 200, // Shorter responses for voice
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const aiText = response.data.choices[0].message.content.trim();
      console.log("💬 AI response:", aiText);
      setAiResponse(aiText);
      setConversationHistory([
        ...history,
        { role: "assistant", content: aiText },
      ]);

      await speakText(aiText);
    } catch (error) {
      console.error("❌ AI response error:", error);
      Alert.alert("AI Error", "Unable to generate response");
      setIsProcessing(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 1000);
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsProcessing(false);
      setIsPlaying(true);

      console.log("🔊 Converting to speech...");
      const ttsResponse = await axios.post(
        "https://api.openai.com/v1/audio/speech",
        {
          model: "tts-1-hd",
          input: text,
          voice: "nova", // Warmer, more empathetic voice
          speed: 0.9,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 30000,
        }
      );

      const fileUri = FileSystem.cacheDirectory + `speech-${Date.now()}.mp3`;
      const base64Audio = Buffer.from(ttsResponse.data).toString("base64");
      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log("✅ Speech finished");
          setIsPlaying(false);
          setTimeout(() => {
            if (isActiveRef.current) startListening();
          }, 1500);
        }
      });

      console.log("▶️ Playing speech...");
      await sound.playAsync();
    } catch (error) {
      console.error("❌ Text-to-speech error:", error);
      Alert.alert("Speech Error", "Unable to play AI response");
      setIsPlaying(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 1000);
    }
  };

  // Enhanced animations
  const startIdleAnimations = () => {
    // Gentle breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheScale, {
          toValue: 1.05,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheScale, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing1, {
          toValue: 1.1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseRing1, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startListeningAnimations = () => {
    // Active listening pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Waveform animation
    waveHeights.forEach((height, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 50),
          Animated.timing(height, {
            toValue: Math.random() * 0.7 + 0.5,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
          Animated.timing(height, {
            toValue: 0.3,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ])
      ).start();
    });

    // Expanding rings
    [pulseRing1, pulseRing2, pulseRing3].forEach((ring, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 400),
          Animated.timing(ring, {
            toValue: 1.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const startProcessingAnimations = () => {
    Animated.loop(
      Animated.timing(orbScale, {
        toValue: 1.15,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  const startSpeakingAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const AnimatedWaveform = () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 80,
        marginBottom: 30,
        justifyContent: "center",
      }}
    >
      {waveHeights.map((height, index) => (
        <Animated.View
          key={index}
          style={{
            width: 4,
            height: height.interpolate({
              inputRange: [0, 1],
              outputRange: [15, 60],
            }),
            backgroundColor: "#3b82f6",
            marginHorizontal: 2,
            borderRadius: 2,
            opacity: 0.8,
          }}
        />
      ))}
    </View>
  );

  const CentralOrb = () => (
    <Animated.View
      style={{
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: breatheScale }],
      }}
    >
      {/* Outer pulse rings */}
      <Animated.View
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: 110,
          borderWidth: 2,
          borderColor: "rgba(59, 130, 246, 0.2)",
          transform: [{ scale: pulseRing1 }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: 90,
          borderWidth: 2,
          borderColor: "rgba(139, 92, 246, 0.3)",
          transform: [{ scale: pulseRing2 }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: 130,
          borderWidth: 1,
          borderColor: "rgba(236, 72, 153, 0.2)",
          transform: [{ scale: pulseRing3 }],
        }}
      />

      {/* Central orb */}
      <Animated.View
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          transform: [{ scale: orbScale }],
          opacity: orbOpacity,
        }}
      >
        <LinearGradient
          colors={
            isListening
              ? ["#3b82f6", "#1d4ed8", "#1e40af"]
              : isProcessing
                ? ["#8b5cf6", "#7c3aed", "#6d28d9"]
                : isPlaying
                  ? ["#ec4899", "#be185d", "#9d174d"]
                  : ["#6b7280", "#4b5563", "#374151"]
          }
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 70,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: isListening
              ? "#3b82f6"
              : isPlaying
                ? "#ec4899"
                : "#000",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Ionicons
            name={
              isListening
                ? "mic"
                : isProcessing
                  ? "hourglass"
                  : isPlaying
                    ? "volume-high"
                    : "heart"
            }
            size={56}
            color="#fff"
          />
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
        <LinearGradient
          colors={["#0f0f0f", "#1f2937", "#111827", "#0f0f0f"]}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 60,
              paddingHorizontal: 20,
              paddingBottom: 20,
            }}
          >
            <View>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>
                Voice Chat with Nomi
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 4 }}>
                Session: {formatDuration(sessionDuration)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 20,
            }}
          >
            {/* Status Text */}
            <Text
              style={{
                color: "#e5e7eb",
                fontSize: 20,
                textAlign: "center",
                marginBottom: 50,
                fontWeight: "500",
              }}
            >
              {isListening
                ? "I'm listening... 👂"
                : isProcessing
                  ? "Understanding your words... 🤔"
                  : isPlaying
                    ? "Speaking with you... 💬"
                    : "Ready to listen and support you 💙"}
            </Text>

            {/* Waveform during listening */}
            {isListening && <AnimatedWaveform />}

            {/* Central Orb */}
            <CentralOrb />

            {/* Current Transcript */}
            {currentTranscript && (
              <View style={{ marginTop: 50, paddingHorizontal: 20 }}>
                <Text
                  style={{
                    color: "#3b82f6",
                    fontSize: 16,
                    textAlign: "center",
                    fontStyle: "italic",
                    lineHeight: 22,
                  }}
                >
                  "{currentTranscript}"
                </Text>
              </View>
            )}

            {/* AI Response */}
            {aiResponse && (
              <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                <Text
                  style={{
                    color: "#ec4899",
                    fontSize: 16,
                    textAlign: "center",
                    fontWeight: "500",
                    lineHeight: 22,
                  }}
                >
                  {aiResponse}
                </Text>
              </View>
            )}

            {/* Instructions */}
            <Text
              style={{
                color: "#6b7280",
                fontSize: 14,
                textAlign: "center",
                marginTop: 60,
                lineHeight: 20,
              }}
            >
              Speak naturally about anything on your mind.{"\n"}
              I'm here to listen without judgment.
            </Text>
          </View>

          {/* Footer with conversation stats */}
          <View style={{ padding: 20, alignItems: "center" }}>
            {conversationHistory.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="chat" size={16} color="#9ca3af" />
                <Text style={{ color: "#9ca3af", fontSize: 12, marginLeft: 8 }}>
                  {Math.floor(conversationHistory.length / 2)} exchanges in this
                  conversation
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
