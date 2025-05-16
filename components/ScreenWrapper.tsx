import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Responsive padding based on screen height
const getBottomPadding = () => {
  const screenHeight = Dimensions.get("window").height;

  if (screenHeight > 800) return 100;
  if (screenHeight > 700) return 80;
  return 60;
};

type ScreenWrapperProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: any;
  style?: any;
};

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scrollable = true,
  contentContainerStyle,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = getBottomPadding();

  const Wrapper = scrollable ? ScrollView : View;

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Wrapper
        style={{ flex: 1 }}
        contentContainerStyle={[
          { paddingBottom: bottomPadding + insets.bottom, flexGrow: 1 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Wrapper>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenWrapper;
