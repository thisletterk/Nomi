import { useSignIn } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { icons, images } from "@/constants";

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
  });

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;

    try {
      const signInAttempt = await signIn.create({
        identifier:
          form.email.trim().toLowerCase() || form.username.trim().toLowerCase(),
        password: form.password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(root)/(tabs)/home");
      } else {
        // See https://clerk.com/docs/custom-flows/error-handling for more info on error handling
        console.log(JSON.stringify(signInAttempt, null, 2));
        Alert.alert("Error", "Log in failed. Please try again.");
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors[0].longMessage);
    }
  }, [isLoaded, form]);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 bg-white">
        <View className="rounded-full h-96 w-[485px] flex items-center justify-center bg-[#9ab268] overflow-hidden align-center justify-center -mt-60 -ml-14"></View>

        <View className="p-6">
          <Text className="text-4xl font-Jakarta-Bold mb-6 text-center">
            Welcome 👋
          </Text>

          <View className="p-5 ">
            <InputField
              label=""
              placeholder="Email or Username"
              icon={icons.email}
              textContentType="emailAddress"
              value={
                form.email.trim().toLowerCase() ||
                form.username.trim().toLowerCase()
              }
              onChangeText={(value) =>
                setForm({ ...form, email: value || form.username })
              }
            />
            <InputField
              label=""
              placeholder="Enter Password"
              icon={icons.lock}
              secureTextEntry={true}
              textContentType="password"
              value={form.password}
              onChangeText={(value) => setForm({ ...form, password: value })}
            />
            <CustomButton
              title="Sign In"
              onPress={onSignInPress}
              className="mt-6 bg-[#4f3422]"
            />
          </View>

          {/* <TouchableOpacity className="bg-brown-600 rounded-lg p-4 mb-6">
            <Text className="text-white text-center text-lg">Sign In</Text>
          </TouchableOpacity> */}

          {/* Add oauth here */}
          {/* <OAuth /> */}

          <View className="flex-row justify-center">
            <Text className="text-gray-600">Don't have an account? </Text>
            <Link href="/sign-up">
              <Text>Sign Up</Text>
            </Link>
          </View>
        </View>
        {/* verification modal */}
      </View>
    </ScrollView>
  );
};

export default SignIn;
