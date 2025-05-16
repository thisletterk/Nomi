import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";

export const config = {
  headerShown: false,
};

export default function PersonalInformation() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("2005-06-24");
  const [gender, setGender] = useState("Female");
  const [location, setLocation] = useState("Romford, London");
  const [weight, setWeight] = useState(90);

  const handleSaveSettings = () => {
    console.log("Saving personal information...");
    // TODO: Implement save functionality
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f8f8]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="px-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mt-4 mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#5e4433" />
          </TouchableOpacity>
          <Text className="text-[#5e4433] text-lg font-bold">
            Personal Information
          </Text>
          <View />
        </View>

        {/* Profile Picture */}
        <View className="items-center mb-6">
          <TouchableOpacity className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center">
            <Ionicons name="camera-outline" size={28} color="#5e4433" />
          </TouchableOpacity>
        </View>

        {/* Password */}
        <View className="mb-4">
          <Text className="text-[#5e4433] mb-2">Password</Text>
          <TextInput
            className="bg-white rounded-lg px-4 py-3 border border-gray-300"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
          />
        </View>

        {/* Date of Birth */}
        <View className="mb-4">
          <Text className="text-[#5e4433] mb-2">Date of Birth</Text>
          <TextInput
            className="bg-white rounded-lg px-4 py-3 border border-gray-300"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Gender */}
        <View className="mb-4">
          <Text className="text-[#5e4433] mb-2">Gender</Text>
          <View className="bg-white rounded-lg border border-gray-300">
            <Picker
              selectedValue={gender}
              onValueChange={(itemValue) => setGender(itemValue)}
            >
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Trans Female" value="Trans Female" />
              <Picker.Item label="Trans Male" value="Trans Male" />
              <Picker.Item label="Non-Binary" value="Non-Binary" />
            </Picker>
          </View>
        </View>

        {/* Location */}
        <View className="mb-4">
          <Text className="text-[#5e4433] mb-2">Location</Text>
          <TextInput
            className="bg-white rounded-lg px-4 py-3 border border-gray-300"
            value={location}
            onChangeText={setLocation}
            placeholder="Enter your location"
          />
        </View>

        {/* Weight */}
        <View className="mb-6">
          <Text className="text-[#5e4433] mb-2">Weight</Text>
          <View className="flex-row items-center">
            <Text className="text-[#5e4433] mr-2">{weight}kg</Text>
            <Slider
              style={{ flex: 1 }}
              minimumValue={87}
              maximumValue={100}
              step={1}
              value={weight}
              onValueChange={(value) => setWeight(value)}
              minimumTrackTintColor="#5e4433"
              maximumTrackTintColor="#e0e0e0"
              thumbTintColor="#5e4433"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className="bg-[#5e4433] py-4 rounded-lg items-center"
          onPress={handleSaveSettings}
        >
          <Text className="text-white font-bold">Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
