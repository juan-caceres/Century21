/*import React, { useEffect } from "react";
import { View, Text, Button } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import Calendario from "../componentes/calendario";

export default function Sala() {
  const { numero } = useLocalSearchParams();
  const router = useRouter();


  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Estás en la Sala {numero}</Text>
      <Button title="Volver al Home" onPress={() => router.push("/home")}  />

      <Calendario />

   
    </View>
  );
}*/


import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Sala() {
  const { numero } = useLocalSearchParams();
  const router = useRouter();
  const [reservas, setReservas] = useState<any[]>([]);

  useEffect(() => {
    const cargarReservas = async () => {
      const data = await AsyncStorage.getItem("reservas");
      if (data) {
        const todas = JSON.parse(data);
        // filtrar solo las de esta sala
        setReservas(todas.filter((r: any) => r.sala === `Sala ${numero}`));
      }
    };
    cargarReservas();
  }, [numero]);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>
        Estás en la Sala {numero}
      </Text>

      <FlatList
        data={reservas}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => {
          const fecha = new Date(item.fecha);
          const diaSemana = fecha.toLocaleDateString("es-ES", { weekday: "long" });
          const hora = fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
          return (
            <Text>{`${diaSemana} - ${hora}`}</Text>
          );
        }}
        ListEmptyComponent={<Text>No hay reservas para esta sala</Text>}
      />

      <Button title="Volver al Home" onPress={() => router.push("/home")} />
    </View>
  );
}