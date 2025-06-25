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

interface VoiceChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  systemPrompt?: any;
}

export default function VoiceChatOverlay({
  visible,
  onClose,
  systemPrompt,
}: VoiceChatOverlayProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Enhanced animations for natural feel
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.9)).current;
  const pulseRing1 = useRef(new Animated.Value(1)).current;
  const pulseRing2 = useRef(new Animated.Value(1)).current;
  const pulseRing3 = useRef(new Animated.Value(1)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;

  // Real-time waveform for natural conversation feel
  const waveHeights = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.2))
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

    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.log("Sound cleanup error:", error);
      }
      soundRef.current = null;
    }

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (error) {
        console.log("Recording cleanup error:", error);
      }
      recordingRef.current = null;
    }

    setIsListening(false);
    setIsProcessing(false);
    setIsPlaying(false);
    setSessionDuration(0);
    setCurrentTranscript("");
    setAiResponse("");
  };

  const initializeAudio = async () => {
    try {
      console.log("🎤 Initializing natural voice chat...");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Microphone Access",
          "I need microphone access so we can have a natural conversation!"
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Start listening immediately for natural flow
      setTimeout(() => {
        if (isActiveRef.current) {
          startListening();
        }
      }, 800);
    } catch (error) {
      console.error("❌ Audio initialization failed:", error);
      Alert.alert("Audio Error", "Unable to start our conversation");
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

      console.log("🎙️ Listening naturally...");
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
      });

      recordingRef.current = recording;
      setIsListening(true);
      setCurrentTranscript("");
      setAiResponse("");

      // Longer timeout for natural conversation pauses
      timeoutRef.current = setTimeout(() => {
        console.log("⏰ Natural pause detected, processing...");
        stopAndProcessRecording();
      }, 8000); // 8 seconds feels more natural
    } catch (error) {
      console.error("❌ Failed to start listening:", error);
      Alert.alert("Listening Error", "I'm having trouble hearing you");
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
      console.log("🛑 Processing what you said...");
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        await transcribeAudio(uri);
      } else {
        console.log("❌ Didn't catch that");
        setIsProcessing(false);
        // Shorter delay for natural flow
        setTimeout(() => {
          if (isActiveRef.current) startListening();
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Error processing what you said:", error);
      setIsProcessing(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 1000);
    } finally {
      recordingRef.current = null;
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
        Alert.alert("Configuration Error", "Can't connect right now");
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        type: "audio/m4a",
        name: "voice.m4a",
      } as any);
      formData.append("model", "whisper-1");
      formData.append("language", "en");
      formData.append("temperature", "0.2"); // More accurate transcription

      console.log("📤 Understanding what you said...");
      const transcriptionResponse = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 20000,
        }
      );

      const transcript = transcriptionResponse.data.text.trim();
      console.log("📝 You said:", transcript);
      setCurrentTranscript(transcript);

      if (!transcript || transcript.length < 2) {
        console.log("⚠️ Didn't catch that, let's continue...");
        setIsProcessing(false);
        setTimeout(() => {
          setCurrentTranscript("");
          if (isActiveRef.current) startListening();
        }, 800);
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
      setIsProcessing(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 1500);
    }
  };

  const getAIResponse = async (history: any[]) => {
    try {
      console.log("🧠 Thinking of response...");

      // Use the same natural system prompt from text chat
      const voiceSystemPrompt = systemPrompt || {
        role: "system",
        content: `You are a warm, emotionally intelligent friend having a natural voice conversation.

Keep responses:
- Conversational and natural (like talking to a close friend)
- Brief but meaningful (1-2 sentences for voice)
- Warm and supportive without being clinical
- Curious and engaging to keep conversation flowing

Avoid:
- Long explanations or lists
- Clinical or therapeutic language
- Overly formal responses

Respond as if you're having a casual, caring conversation with a friend.`,
      };

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [voiceSystemPrompt, ...history],
          temperature: 0.9,
          max_tokens: 100, // Reduced for faster responses
          stream: false, // Keep false for voice but optimize tokens
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 15000, // Reduced timeout
        }
      );

      const aiText = response.data.choices[0].message.content.trim();
      console.log("💬 Responding:", aiText);
      setAiResponse(aiText);
      setConversationHistory([
        ...history,
        { role: "assistant", content: aiText },
      ]);

      await speakText(aiText);
    } catch (error) {
      console.error("❌ AI response error:", error);
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

      console.log("🔊 Speaking naturally...");
      const ttsResponse = await axios.post(
        "https://api.openai.com/v1/audio/speech",
        {
          model: "tts-1", // Faster model instead of tts-1-hd
          input: text,
          voice: "nova",
          speed: 1.0, // Normal speed for clarity
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 15000, // Reduced timeout
        }
      );

      const fileUri = FileSystem.cacheDirectory + `speech-${Date.now()}.mp3`;
      const base64Audio = Buffer.from(ttsResponse.data).toString("base64");
      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log("✅ Finished speaking");
          setIsPlaying(false);
          setAiResponse("");
          // Quick transition back to listening for natural flow
          setTimeout(() => {
            if (isActiveRef.current) startListening();
          }, 800);
        }
      });

      console.log("▶️ Speaking...");
      await sound.playAsync();
    } catch (error) {
      console.error("❌ Speech error:", error);
      setIsPlaying(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 1000);
    }
  };

  // Natural, flowing animations
  const startIdleAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheScale, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(breatheScale, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startListeningAnimations = () => {
    // Gentle listening pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Natural waveform
    waveHeights.forEach((height, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 30),
          Animated.timing(height, {
            toValue: Math.random() * 0.8 + 0.4,
            duration: 150 + Math.random() * 200,
            useNativeDriver: false,
          }),
          Animated.timing(height, {
            toValue: 0.2,
            duration: 150 + Math.random() * 200,
            useNativeDriver: false,
          }),
        ])
      ).start();
    });

    // Soft expanding rings
    [pulseRing1, pulseRing2, pulseRing3].forEach((ring, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 600),
          Animated.timing(ring, {
            toValue: 1.6,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const startProcessingAnimations = () => {
    Animated.loop(
      Animated.timing(orbScale, {
        toValue: 1.1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  };

  const startSpeakingAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.25,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1.1,
          duration: 400,
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
        height: 60,
        marginBottom: 20,
        justifyContent: "center",
      }}
    >
      {waveHeights.map((height, index) => (
        <Animated.View
          key={index}
          style={{
            width: 3,
            height: height.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 45],
            }),
            backgroundColor: "#3b82f6",
            marginHorizontal: 1.5,
            borderRadius: 1.5,
            opacity: 0.9,
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
      {/* Soft pulse rings */}
      <Animated.View
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: 100,
          borderWidth: 1.5,
          borderColor: "rgba(59, 130, 246, 0.15)",
          transform: [{ scale: pulseRing1 }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 1.5,
          borderColor: "rgba(139, 92, 246, 0.2)",
          transform: [{ scale: pulseRing2 }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: 120,
          borderWidth: 1,
          borderColor: "rgba(236, 72, 153, 0.1)",
          transform: [{ scale: pulseRing3 }],
        }}
      />

      {/* Central orb */}
      <Animated.View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
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
            borderRadius: 60,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: isListening
              ? "#3b82f6"
              : isPlaying
                ? "#ec4899"
                : "#000",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 15,
            elevation: 8,
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
                    : "chatbubble-ellipses"
            }
            size={48}
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
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "600" }}>
                Chatting with Nomi
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 2 }}>
                {formatDuration(sessionDuration)}
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
            {/* Natural status text */}
            <Text
              style={{
                color: "#e5e7eb",
                fontSize: 18,
                textAlign: "center",
                marginBottom: 40,
                fontWeight: "400",
                lineHeight: 24,
              }}
            >
              {isListening
                ? "I'm listening... 👂"
                : isProcessing
                  ? "Thinking of the perfect response... 🤔"
                  : isPlaying
                    ? "💬"
                    : "Ready to chat! 😊"}
            </Text>

            {/* Waveform during listening */}
            {isListening && <AnimatedWaveform />}

            {/* Central Orb */}
            <CentralOrb />

            {/* Live transcript */}
            {currentTranscript && (
              <View style={{ marginTop: 40, paddingHorizontal: 20 }}>
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

            {/* Natural instructions */}
            <Text
              style={{
                color: "#6b7280",
                fontSize: 14,
                textAlign: "center",
                marginTop: 50,
                lineHeight: 20,
              }}
            >
              Just talk naturally - I'm here to listen and chat with you.
            </Text>
          </View>

          {/* Footer */}
          <View style={{ padding: 20, alignItems: "center" }}>
            {conversationHistory.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="chat" size={16} color="#9ca3af" />
                <Text style={{ color: "#9ca3af", fontSize: 12, marginLeft: 8 }}>
                  {Math.floor(conversationHistory.length / 2)} back and forth
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
