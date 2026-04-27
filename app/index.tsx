import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.replace("/login");
    }, 2500);
  }, []);

  return (
    <View style={styles.container}>

      <Animated.View entering={ZoomIn.duration(1000)}>
        <Text style={styles.logo}>🍔 Order App</Text>
      </Animated.View>

      <Animated.Text entering={FadeIn.delay(500)} style={styles.text}>
        Fast • Simple • Smart
      </Animated.Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontSize: 40,
    color: "#38bdf8",
    fontWeight: "bold",
  },
  text: {
    color: "#94a3b8",
    marginTop: 10,
  },
});