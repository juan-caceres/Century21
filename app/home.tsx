import React from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, Dimensions } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, useAuth } from "../App";
import BtnCerrarSesion from "./componentes/btnCerrarSesion";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;
type Props = { navigation: HomeScreenNavigationProp };

export default function Home({ navigation }: Props) {
  const { role } = useAuth(); 

  const salas = Array.from({ length: 7 }, (_, i) => `Sala ${i + 1}`);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/LogoGrey.png")} style={styles.logo} resizeMode="contain" />
        <BtnCerrarSesion />
      </View>

      {role === "superuser" && (
        <TouchableOpacity
          style={{
            backgroundColor: "#d4af37",
            padding: 12,
            borderRadius: 8,
            marginBottom: 15,
          }}
          onPress={() => navigation.navigate("Usuarios")}
        >
          <Text style={{ color: "#000", fontWeight: "bold", textAlign: "center" }}>
            Gestionar Usuarios
          </Text>
        </TouchableOpacity>
      )}

      {role === "admin" ? (
        <Text style={{ color: "black", fontWeight: "bold" }}>- usuario: administrador</Text>
      ) : role === "superuser" ? (
        <Text style={{ color: "black", fontWeight: "bold" }}>- usuario: superusuario</Text>
      ) : (
        <Text style={{ color: "black", fontWeight: "bold" }}>- usuario: empleado</Text>
      )}

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
const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffffff", padding: 20, alignItems: "stretch" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: height > 700 ? 50 : 20,
  },
  logo: { width: 120, height: 50 },
  title: { fontSize: 22, fontWeight: "bold", color: "#BEAF87", marginBottom: 15 },
  salaButton: {
    padding: 15,
    backgroundColor: "#252526",
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#BEAF87",
  },
  salaText: { color: "#aaa", fontSize: 18 },
});
