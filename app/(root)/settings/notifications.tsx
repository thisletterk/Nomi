import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Notifications() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [supportNotification, setSupportNotification] = useState(false);
  const [alertNotification, setAlertNotification] = useState(false);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [offers, setOffers] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  const [resources, setResources] = useState(true);
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#f8f8f8]">
      <StatusBar barStyle="dark-content" />
      <ScrollView className="px-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mt-4 mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#5e4433" />
          </TouchableOpacity>
          <Text className="text-[#5e4433] text-lg font-bold">Notification</Text>
          <View />
        </View>

        {/* Chatbot Section */}
        <View className="mb-6">
          <Text className="text-[#5e4433] font-bold mb-2">Chatbot</Text>
          <View className="bg-white rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#5e4433]">Push Notifications</Text>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={pushNotifications ? "#ffffff" : "#ffffff"}
              />
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[#5e4433]">Support Notification</Text>
              <Switch
                value={supportNotification}
                onValueChange={setSupportNotification}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={supportNotification ? "#ffffff" : "#ffffff"}
              />
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-[#5e4433]">Alert Notification</Text>
              <Switch
                value={alertNotification}
                onValueChange={setAlertNotification}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={alertNotification ? "#ffffff" : "#ffffff"}
              />
            </View>
          </View>
        </View>

        {/* Sound and Vibration Section */}
        <View className="mb-6">
          <Text className="text-[#5e4433] font-bold mb-2">Sound</Text>
          <View className="bg-white rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-[#5e4433]">
                When Sound Notifications are on, your phone will always check
                for sounds.
              </Text>
              <Switch
                value={sound}
                onValueChange={setSound}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={sound ? "#ffffff" : "#ffffff"}
              />
            </View>
          </View>
          <Text className="text-[#5e4433] font-bold mb-2">Vibration</Text>
          <View className="bg-white rounded-lg p-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-[#5e4433]">
                When Vibration Notifications are on, your phone will vibrate.
              </Text>
              <Switch
                value={vibration}
                onValueChange={setVibration}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={vibration ? "#ffffff" : "#ffffff"}
              />
            </View>
          </View>
        </View>

        {/* Misc Section */}
        <View className="mb-6">
          <Text className="text-[#5e4433] font-bold mb-2">Misc</Text>
          <View className="bg-white rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-[#5e4433]">Offers</Text>
              <Text className="text-[#5e4433]">50% OFF</Text>
              <Switch
                value={offers}
                onValueChange={setOffers}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={offers ? "#ffffff" : "#ffffff"}
              />
            </View>
          </View>
          <View className="bg-white rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-[#5e4433]">App Updates</Text>
              <Switch
                value={appUpdates}
                onValueChange={setAppUpdates}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={appUpdates ? "#ffffff" : "#ffffff"}
              />
            </View>
          </View>
          <View className="bg-white rounded-lg p-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-[#5e4433]">
                Browse our collection of resources to tailor your mental health.
              </Text>
              <Switch
                value={resources}
                onValueChange={setResources}
                trackColor={{ false: "#e0e0e0", true: "#9ab267" }}
                thumbColor={resources ? "#ffffff" : "#ffffff"}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
