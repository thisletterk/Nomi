import { Stack } from "expo-router/stack";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="medications" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
