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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import * as FileSystem from "expo-file-system";

const { width, height } = Dimensions.get("window");

// Updated system prompt for a warm, friendly, supportive companion
const DEFAULT_SYSTEM_PROMPT = {
  role: "system",
  content: `You are a warm, friendly, and supportive conversation companion. Your tone is relaxed and casual, like a thoughtful friend who’s always there to listen without judgment. Respond with kindness, empathy, and emotional intelligence.

You don’t need to diagnose or give medical advice — just listen, validate feelings, ask gentle follow-up questions, and help the user feel understood. Be curious, human-like, and safe. Keep your responses conversational and easy to relate to.

Avoid technical or robotic language. Speak in a natural, comforting, and respectful tone. Always prioritize the user’s emotional comfort and create a safe space for sharing anything they’d like.`,
};

interface VoiceChatOverlayProps {
  visible: boolean;
  onClose: () => void;
  systemPrompt?: any; // now optional, will use default if not provided
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

  // Use useRef to persist recording across renders
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  // Animation values for the beautiful central orb
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.8)).current;
  const outerRing1 = useRef(new Animated.Value(1)).current;
  const outerRing2 = useRef(new Animated.Value(1)).current;
  const outerRing3 = useRef(new Animated.Value(1)).current;

  // Particle animations
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  // Waveform animations
  const waveHeights = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    if (visible) {
      isActiveRef.current = true;
      initializeAudio();
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

  const cleanup = async () => {
    console.log("🧹 Cleaning up...");

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Stop and cleanup recording
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
  };

  const initializeAudio = async () => {
    try {
      console.log("🎤 Requesting microphone permissions...");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone access is required for voice chat"
        );
        return;
      }

      console.log("🔧 Setting audio mode...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start listening after a short delay
      setTimeout(() => {
        if (isActiveRef.current) {
          startListening();
        }
      }, 500);
    } catch (error) {
      console.error("❌ Audio initialization failed:", error);
      Alert.alert("Audio Error", "Failed to initialize audio system");
    }
  };

  const startListening = async () => {
    try {
      // Cleanup any existing recording first
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          console.log("Previous recording cleanup:", e);
        }
        recordingRef.current = null;
      }

      console.log("🎙️ Creating new recording...");
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

      console.log("✅ Recording started successfully");

      // Set timeout to auto-stop
      timeoutRef.current = setTimeout(() => {
        console.log("⏰ Auto-stopping recording after 8 seconds");
        stopAndProcessRecording();
      }, 8000);
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      Alert.alert(
        "Recording Error",
        `Failed to start recording: ${
          typeof error === "object" && error !== null && "message" in error
            ? (error as any).message
            : String(error)
        }`
      );
      setIsListening(false);
    }
  };

  const stopAndProcessRecording = async () => {
    if (!recordingRef.current) {
      console.log("❌ No recording to stop");
      return;
    }

    // Clear the timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsListening(false);
    setIsProcessing(true);

    try {
      console.log("🛑 Stopping recording...");
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      console.log("📁 Recording URI:", uri);

      if (uri) {
        await transcribeAudio(uri);
      } else {
        console.log("❌ No URI found");
        setIsProcessing(false);
        setTimeout(() => {
          if (isActiveRef.current) startListening();
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Error stopping recording:", error);
      setIsProcessing(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 2000);
    } finally {
      recordingRef.current = null;
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      console.log("🔄 Starting transcription...");

      // Check if API key exists
      if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
        console.error("❌ OpenAI API key not found!");
        Alert.alert("API Key Missing", "OpenAI API key is not configured");
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as any);
      formData.append("model", "whisper-1");

      console.log("📤 Sending to OpenAI Whisper...");
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

      const transcript = transcriptionResponse.data.text;
      console.log("📝 Transcript received:", transcript);
      setCurrentTranscript(transcript);

      if (!transcript || transcript.trim().length < 2) {
        console.log("⚠️ Transcript too short, restarting...");
        setIsProcessing(false);
        setTimeout(() => {
          setCurrentTranscript("");
          if (isActiveRef.current) startListening();
        }, 1000);
        return;
      }

      console.log("🤖 Getting AI response...");
      const newHistory = [
        ...conversationHistory,
        { role: "user", content: transcript },
      ];
      setConversationHistory(newHistory);
      await getAIResponse(newHistory);
    } catch (error) {
      console.error("❌ Transcription error:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response === "object" &&
        (error as any).response !== null
      ) {
        console.error("📄 Error response:", (error as any).response.data);
        console.error("📊 Error status:", (error as any).response.status);
      }
      Alert.alert(
        "Transcription Error",
        "Failed to transcribe audio. Please try again."
      );
      setIsProcessing(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 2000);
    }
  };

  const getAIResponse = async (history: any[]) => {
    try {
      console.log("🧠 Sending to ChatGPT...");
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [systemPrompt, ...history],
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
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response === "object"
      ) {
        console.error("📄 Error response:", (error as any).response.data);
      }
      Alert.alert("AI Error", "Failed to get AI response. Please try again.");
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

      console.log("🔊 Converting text to speech...");
      const ttsPayload = {
        model: "tts-1-hd",
        input: text,
        voice: "onyx",
        speed: 0.8,
      };

      const response = await axios.post(
        "https://api.openai.com/v1/audio/speech",
        ttsPayload,
        {
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer", // Use arraybuffer for binary audio
          timeout: 30000,
        }
      );

      console.log("🎵 Creating audio from response...");
      // Write the arraybuffer to a file using expo-file-system
      const fileUri = FileSystem.cacheDirectory + `tts-${Date.now()}.mp3`;
      // Convert arraybuffer to base64
      const base64Audio = Buffer.from(response.data).toString("base64");
      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log("✅ Audio playback finished");
          setIsPlaying(false);
          // Restart listening after AI finishes speaking
          setTimeout(() => {
            if (isActiveRef.current) startListening();
          }, 1000);
        }
      });

      console.log("▶️ Playing audio...");
      await sound.playAsync();
    } catch (error) {
      console.error("❌ Text-to-speech error:", error);
      Alert.alert(
        "Speech Error",
        "Failed to play AI response. Please try again."
      );
      setIsPlaying(false);
      setTimeout(() => {
        if (isActiveRef.current) startListening();
      }, 1000);
    }
  };

  // ...Animations and UI code remain unchanged...

  const startIdleAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(outerRing1, {
          toValue: 1.2,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(outerRing1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startListeningAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(outerRing1, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(outerRing1, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(outerRing2, {
          toValue: 1.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(outerRing2, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    waveHeights.forEach((height, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 100),
          Animated.timing(height, {
            toValue: Math.random() * 0.8 + 0.4,
            duration: 300 + Math.random() * 200,
            useNativeDriver: false,
          }),
          Animated.timing(height, {
            toValue: 0.2,
            duration: 300 + Math.random() * 200,
            useNativeDriver: false,
          }),
        ])
      ).start();
    });
  };

  const startProcessingAnimations = () => {
    particles.forEach((particle, index) => {
      Animated.loop(
        Animated.timing(particle.rotate, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const startSpeakingAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.4,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(outerRing3, {
        toValue: 2,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  };

  const AnimatedWaveform = () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 60,
        marginBottom: 20,
      }}
    >
      {waveHeights.map((height, index) => (
        <Animated.View
          key={index}
          style={{
            width: 3,
            height: height.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 50],
            }),
            backgroundColor: "#3b82f6",
            marginHorizontal: 1,
            borderRadius: 2,
            opacity: 0.8,
          }}
        />
      ))}
    </View>
  );

  const CentralOrb = () => (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Outer rings */}
      <Animated.View
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: 100,
          borderWidth: 2,
          borderColor: "rgba(59, 130, 246, 0.3)",
          transform: [{ scale: outerRing1 }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 2,
          borderColor: "rgba(236, 72, 153, 0.3)",
          transform: [{ scale: outerRing2 }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: 120,
          borderWidth: 1,
          borderColor: "rgba(59, 130, 246, 0.2)",
          transform: [{ scale: outerRing3 }],
        }}
      />

      {/* Particles */}
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#3b82f6",
            transform: [
              {
                translateX: particle.rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    0,
                    Math.cos(
                      (((index * 360) / particles.length) * Math.PI) / 180
                    ) * 80,
                  ],
                }),
              },
              {
                translateY: particle.rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    0,
                    Math.sin(
                      (((index * 360) / particles.length) * Math.PI) / 180
                    ) * 80,
                  ],
                }),
              },
              { scale: particle.scale },
            ],
            opacity: particle.opacity,
          }}
        />
      ))}

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
              ? ["#3b82f6", "#1d4ed8"]
              : isProcessing
                ? ["#f59e0b", "#d97706"]
                : isPlaying
                  ? ["#ec4899", "#be185d"]
                  : ["#6b7280", "#4b5563"]
          }
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 60,
            justifyContent: "center",
            alignItems: "center",
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
                    : "chatbubble"
            }
            size={48}
            color="#fff"
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
        <LinearGradient
          colors={["#0f0f0f", "#1f2937", "#0f0f0f"]}
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
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>
              Voice Chat
            </Text>
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
                color: "#9ca3af",
                fontSize: 18,
                textAlign: "center",
                marginBottom: 40,
              }}
            >
              {isListening
                ? "I'm listening..."
                : isProcessing
                  ? "Processing your message..."
                  : isPlaying
                    ? "Speaking..."
                    : "Ready to chat"}
            </Text>

            {/* Waveform during listening */}
            {isListening && <AnimatedWaveform />}

            {/* Central Orb */}
            <CentralOrb />

            {/* Current Transcript */}
            {currentTranscript && (
              <View style={{ marginTop: 40, paddingHorizontal: 20 }}>
                <Text
                  style={{
                    color: "#3b82f6",
                    fontSize: 16,
                    textAlign: "center",
                    fontStyle: "italic",
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
              }}
            >
              Just start speaking naturally - I'll listen and respond
            </Text>
          </View>

          {/* Conversation History Indicator */}
          {conversationHistory.length > 0 && (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                {Math.floor(conversationHistory.length / 2)} exchanges in this
                conversation
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}
