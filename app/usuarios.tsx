import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, DocumentData } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, useAuth } from "../App";

type UsuariosScreenNavigationProp = StackNavigationProp<RootStackParamList, "Usuarios">;
type Props = { navigation: UsuariosScreenNavigationProp };

type Usuario = {
  id: string;
  email: string;
  role: string;
};

const Usuarios: React.FC<Props> = () => {
  const { role } = useAuth(); 
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const fetchUsuarios = async () => {
    try {
      const querySnap = await getDocs(collection(db, "users"));
      const lista: Usuario[] = [];
      querySnap.forEach((docu) => {
        const data = docu.data() as DocumentData;
        lista.push({ id: docu.id, email: data.email, role: data.role });
      });
      setUsuarios(lista);
    } catch (e) {
      console.log("Error cargando usuarios:", e);
    }
  };

  const hacerAdmin = async (id: string) => {
    if (role !== "superuser") {
      Alert.alert("Acceso denegado", "Solo el superuser puede cambiar roles ❌");
      return;
    }
    try {
      await updateDoc(doc(db, "users", id), { role: "admin" });
      Alert.alert("Éxito", "Usuario promovido a Admin ✅");
      fetchUsuarios();
    } catch (e) {
      console.log("Error al actualizar rol:", e);
      Alert.alert("Error", "No se pudo actualizar el rol");
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Usuarios</Text>

      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.rol}>Rol: {item.role}</Text>

            {role === "superuser" && item.role === "user" && (
              <TouchableOpacity
                style={styles.btn}
                onPress={() => hacerAdmin(item.id)}
              >
                <Text style={styles.btnText}>Hacer Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#d4af37", marginBottom: 20 },
  card: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#d4af37",
  },
  email: { fontSize: 16, color: "#fff" },
  rol: { fontSize: 14, color: "#aaa", marginBottom: 10 },
  btn: { backgroundColor: "#d4af37", padding: 10, borderRadius: 8 },
  btnText: { color: "#000", fontWeight: "bold", textAlign: "center" },
});

export default Usuarios;
