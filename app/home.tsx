//app/home.tsx
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, Dimensions, Button, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import React, { useEffect, useState } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, useAuth } from "../App";
import { db } from "../firebase";
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData, query, orderBy } from "firebase/firestore";
import BtnCerrarSesion from "./componentes/btnCerrarSesion";
import * as Notifications from "expo-notifications";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;
type Props = { navigation: HomeScreenNavigationProp };

export default function Home({ navigation }: Props) {
  const { role } = useAuth(); 
  console.log("Role actual:", role);
  console.log("Tipo de role:", typeof role);
  console.log("Es superuser?", role === "superuser");

  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const salasRef = collection(db, "salas");
    const q = query(salasRef, orderBy("createdAt", "asc")); // ordenar por fecha de creación ascendente

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSalas(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Carga de fuente personalizada
  const [fontsLoaded] = useFonts({
    Typold: require("../assets/Typold-Bold.ttf"),
  });
  
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#BEAF87" />
      </View>
    );
  }

  // Funcion para enviar notificacion local
  const sendNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Notificacion desde home",
        body: "Esta es una notificacion de prueba",
      },
      trigger: null, // null se dispara inmediatamente
    });
  };

  const getRoleText = () => {
    if (role === "admin") return "- usuario: administrador";
    if (role === "superuser") return "- usuario: superusuario";
    return null; // No mostrar texto para usuarios comunes
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../assets/LogoGrey.png")} style={styles.logo} resizeMode="contain" />

        <BtnCerrarSesion />
      </View>

      {/* Botones de gestión para superusuario y admin */}
      <View style={styles.adminButtons}>
        {role === "superuser" && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate("Usuarios")}
          >
            <Text style={styles.adminButtonText}>Gestionar Usuarios</Text>
          </TouchableOpacity>
        )}

        {(role === "admin" || role === "superuser") && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate("GestionSalas")}
          >
            <Text style={styles.adminButtonText}>Próximamente: Gestionar Salas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mostrar rol solo para admin y superusuario */}
      {getRoleText() && (
        <Text style={styles.roleText}>{getRoleText()}</Text>
      )}

      <Text style={styles.title}>Lista de Salas</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#BEAF87" />
      ) : (
        <FlatList
          data={salas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.salaButton]}
              onPress={() => navigation.navigate("Sala", { numero: item.id })} 
              activeOpacity={0.7}
            >
              <Text style={[styles.salaText, styles.fontTypold]}>{item.nombre}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Botón para lanzar notificación */}
      <Button title="Enviar Notificación" onPress={sendNotification} />
    </View>
  );
}

// Estilos (siguiendo colores del logo c21)
const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  fontTypold: { fontFamily: 'Typold' },
  container: { flex: 1, backgroundColor: "#ffffffff", padding: 20, alignItems: "stretch" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: height > 700 ? 50 : 20 },
  logo: { width: 120, height: 50 },
  adminButtons: { marginBottom: 15, gap: 10 },
  adminButton: { backgroundColor: "#d4af37", padding: 12, borderRadius: 8, alignItems: "center" },
  adminButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  roleText: { color: "#BEAF87", fontWeight: "bold", fontSize: 14, marginBottom: 15, textAlign: "center" },
  title: { fontSize: 22, fontWeight: "bold", color: "#BEAF87", marginBottom: 15 },
  salaButton: { padding: 15, backgroundColor: "#252526", borderRadius: 8, marginVertical: 8, borderWidth: 1, borderColor: "#BEAF87" },
  salaText: { color: "#aaa", fontSize: 18 },
});