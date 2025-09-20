import React from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;
type Props = { navigation: HomeScreenNavigationProp };

export default function Home({ navigation }: Props) {
  const handleLogout = async () => {
    await signOut(auth);
    navigation.replace("Login");
  };

  const salas = Array.from({ length: 7 }, (_, i) => `Sala ${i + 1}`);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/century21-logo.png")} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logo: { width: 120, height: 50 },
  logoutButton: { backgroundColor: "#d4af37", padding: 8, borderRadius: 5 },
  logoutText: { color: "#000", fontWeight: "bold" },
  title: { fontSize: 22, fontWeight: "bold", color: "#d4af37", marginBottom: 15 },
  salaButton: {
    padding: 15, backgroundColor: "#1c1c1c", borderRadius: 8,
    marginVertical: 8, borderWidth: 1, borderColor: "#d4af37",
  },
  salaText: { color: "#fff", fontSize: 18 },
});
