import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { 
  View, 
  Text, 
  Button, 
  FlatList
} from "react-native";


const salas =Array.from({length:7},(_,i) => `Sala ${i + 1}`);

export default function Home() {

  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Lista de Sala</Text>
      <FlatList
        data={salas}
        keyExtractor={(item) => item}
        renderItem={({ item,index }) => (
          <View style={{ marginVertical: 8 }}>
            <Button
              title={item}
              onPress={() => router.push(`/sala/${index + 1}`)}
            />
          </View>
        )}
      />

    </View>
  );
}
