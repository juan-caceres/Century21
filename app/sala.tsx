import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import Calendario from "./componentes/calendario";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

type SalaScreenNavigationProp = StackNavigationProp<RootStackParamList, "Sala">;
type SalaScreenRouteProp = RouteProp<RootStackParamList, "Sala">;

type Props = { navigation: SalaScreenNavigationProp; route: SalaScreenRouteProp };

export default function Sala({ navigation, route }: Props) {
  const { numero } = route.params;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (err: any) {
      console.log("Error signOut:", err);
      Alert.alert("Error", "No se pudo cerrar sesión. Intenta de nuevo.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/century21-logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Sala {numero}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Estás en la Sala {numero}</Text>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Volver al Home</Text>
        </TouchableOpacity>

        <Calendario />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    height: 72, paddingHorizontal: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: "#141414", backgroundColor: "#000",
  },
  logo: { width: 120, height: 48 },
  headerTitle: {
    position: "absolute", left: 0, right: 0,
    textAlign: "center", color: "#d4af37", fontSize: 18, fontWeight: "700",
  },
  logoutButton: { backgroundColor: "#d4af37", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  logoutText: { color: "#000", fontWeight: "700", fontSize: 14 },
  content: { flex: 1, padding: 20, alignItems: "center" },
  title: { color: "#fff", fontSize: 22, marginBottom: 12, fontWeight: "600" },
  backButton: {
    backgroundColor: "#121212", borderWidth: 1, borderColor: "#d4af37",
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 14,
  },
  backText: { color: "#d4af37", fontWeight: "700" },
});
