import React, { useEffect } from "react";
import { View, Text, Button } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

export default function Sala() {
  const { numero } = useLocalSearchParams();
  const router = useRouter();


  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Estás en la Sala {numero}</Text>
      <Button title="Volver al Home" onPress={() => router.push("/home")} />


   
    </View>
  );
}
