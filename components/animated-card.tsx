"use client";

import type React from "react";

import { useRef, useEffect } from "react";
import { Animated, TouchableOpacity, type ViewStyle } from "react-native";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
  onPress?: () => void;
}

export default function AnimatedCard({
  children,
  delay = 0,
  style,
  onPress,
}: AnimatedCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  const AnimatedComponent = onPress
    ? Animated.createAnimatedComponent(TouchableOpacity)
    : Animated.View;

  return (
    <AnimatedComponent
      onPress={onPress}
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {children}
    </AnimatedComponent>
  );
}
