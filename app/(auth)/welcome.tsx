import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import Swiper from "react-native-swiper";
import { useRef, useState } from "react";
import { onboarding } from "@/constants";
import { Image, View } from "react-native";
import CustomButton from "@/components/CustomButton";

const Onboarding = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <SafeAreaView
      className="flex h-full w-full"
      style={{ backgroundColor: onboarding[activeIndex]?.backgroundColor }}
    >
      <TouchableOpacity
        onPress={() => {
          router.replace("/(auth)/sign-up");
        }}
        className="w-full flex justify-end items-end p-4 z-10 absolute"
      >
        <Text className="text-black text-md font-JarkataBold text-white">
          Skip
        </Text>
      </TouchableOpacity>

      {/* swipe onboarding page */}
      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        showsButtons={false}
        onIndexChanged={(index) => setActiveIndex(index)}
      >
        {onboarding.map((item, index) => (
          <View key={index} className="h-full">
            {/* Top View covering 70% of the screen */}
            <View
              style={{ height: "70%" }}
              className="absolute top-0 left-0 right-0"
            >
              <Image
                source={item.image}
                className="absolute top-0 left-0 right-0 bottom-0 w-full h-full"
                resizeMode="cover" // Ensures the image covers the container
              />
            </View>
            {/* Bottom View with a fully rounded shape */}
            <View
              style={{
                height: "30%",
                borderTopLeftRadius: 100,
                borderTopRightRadius: 100,
                overflow: "hidden",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "#f3f3f3", // Add a background color
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 20, // Add padding to ensure the rounded corners are visible
              }}
            >
              <View
                style={{
                  height: 200,
                  width: 200,
                  borderRadius: 100,
                  backgroundColor: "#f7f4f2",
                  position: "absolute",
                  bottom: -100,
                  left: "50%",
                  transform: [{ translateX: -100 }],
                }}
              />
              <Text
                // style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
                className="text-2xl font-JarkataBold text-black mr-7 ml-7 -mt-16 indent-8"
              >
                {item.description}
              </Text>
              {/* <Text>{item.description}</Text> */}
            </View>
          </View>
        ))}
      </Swiper>
      {/* custom button here */}
      <CustomButton
        className="bg-[#4f3422] absolute bottom-2"
        title={activeIndex === onboarding.length - 1 ? "Get Started" : "Next"}
        onPress={() => {
          if (activeIndex === onboarding.length - 1) {
            router.replace("/(auth)/sign-up");
          } else {
            swiperRef.current?.scrollBy(1);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default Onboarding;
