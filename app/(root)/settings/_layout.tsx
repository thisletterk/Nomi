import { Stack } from "expo-router/stack";

const Layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "white" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
