import React from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image,Alert } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {Dimensions} from "react-native";
import BtnCerrarSesion from "./componentes/btnCerrarSesion";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;
type Props = { navigation: HomeScreenNavigationProp };

export default function Home({ navigation }: Props) {
  

  const salas = Array.from({ length: 7 }, (_, i) => `Sala ${i + 1}`);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/LogoGrey.png")} style={styles.logo} resizeMode="contain" />
        <BtnCerrarSesion />
      </View>

      <Text style={styles.title}>Lista de Salas</Text>

      <FlatList
        data={salas}
        keyExtractor={(item) => item}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.salaButton}
            onPress={() => navigation.navigate("Sala", { numero: index + 1 })}
            activeOpacity={0.7}
          >
            <Text style={styles.salaText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// Estilos (siguiendo colores del logo c21)

const { width, height } = Dimensions.get("window"); //para maneajar responsive

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffffff", padding: 20 },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20, 
    marginTop: height > 700 ? 50 : 20, //ajustar margen superior en pantallas altas
    
  },
  logo: { width: 120, height: 50 },

  title: { fontSize: 22, fontWeight: "bold", color: "#BEAF87", marginBottom: 15 },
  salaButton: {
    padding: 15, backgroundColor: "#252526", borderRadius: 8,
    marginVertical: 8, borderWidth: 1, borderColor: "#BEAF87",
  },
  salaText: { color: "#aaa", fontSize: 18 },
});
