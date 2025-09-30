//app/gestionSalas.tsx
import { db } from "../firebase";
import React, {useEffect,useState} from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert,Button } from "react-native";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
    Home: undefined; // add other screens here if needed
};

export default function GestionSalas(){

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [salas, setSalas] = useState<any[]>([]);
    const [nombre, setNombre] = useState("");
    const [capacidad, setCapacidad] = useState("");
    const [tv, setTv] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Escuchar cambios en tiempo real
    useEffect (() => {
        const salasRef = collection(db, "salas");
        const q = query(salasRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q,(snapshot) => {
            const data = snapshot.docs.map((d) => ({id:d.id, ...d.data()}));
            setSalas(data);
            console.log("Salas snapshot:", data.map(d => d.id));
        });
        return unsubscribe; // importante para limpiar el listener
    },[]);

    // Agregar sala
    const agregarSala = async () => {
        if (!nombre || !capacidad) {
            Alert.alert("Error", "Por favor complete todos los campos.");
            return;
        }
        try {
            await addDoc(collection(db,"salas"),{
                nombre,
                capacidad: parseInt(capacidad),
                tv,
                createdAt: serverTimestamp(),
            });

            setNombre("");
            setCapacidad("");
            setTv(false);
        } catch (error) {
            Alert.alert("Error","No se pudo agregar la sala.");
        }
    };

    // Editar sala
    const editarSala = async () => {
        if (!editId) return;
        try {
            await updateDoc(doc(db,"salas",editId),{
                nombre,
                capacidad: parseInt(capacidad),
                tv,
            });
            setEditId(null);;
            setNombre("");
            setCapacidad("");
            setTv(false);
        } catch (error) {
            Alert.alert("Error","No se pudo editar la sala.");
        }
    };

    // Eliminar sala
    const eliminarSala = async (id: string) => {
        try {
            await deleteDoc(doc(db,"salas",id));
        } catch (error) {
            Alert.alert("Error","No se pudo eliminar la sala.");
        }
    };

    // Seleccionar sala para editar
    const seleccionarSala = (sala:any) => {
        setEditId(sala.id);
        setNombre(sala.nombre);
        setCapacidad(sala.capacidad.toString());
        setTv(sala.tv);
    };

    return (
        <View style ={styles.container}>
            
          
            <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.navButton}>
                <Text style={styles.navButtonText}><Ionicons name="home" size={16} color="#ffffffff" style={{marginRight: 3}} /> Inicio</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Gestión de Salas</Text>
           
            {/* Formulario */}
            <TextInput
                style={styles.input}
                placeholder="Nombre de sala"
                value = {nombre}
                onChangeText={setNombre}
            />
             <TextInput
                style={styles.input}
                placeholder="Capacidad"
                value={capacidad}
                onChangeText={setCapacidad}
                keyboardType="numeric"
            />

            <TouchableOpacity
                style={[styles.tvButton, tv && styles.tvButtonActive]}
                onPress={() => setTv(!tv)}
            >
                <Text style={styles.tvText}>{tv ? "Con TV" : "Sin TV"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.addButton}
                onPress={editId ? editarSala : agregarSala}
            >
                <Text style={styles.addButtonText}>
                {editId ? "Guardar Cambios" : "Agregar Sala"}
                </Text>
            </TouchableOpacity>

            {/* Lista de salas */}
            <FlatList
                data={salas}
                keyExtractor={(item, index) => item.id || index.toString()}
                renderItem={({ item }) => (
                <View style={styles.salaItem}>
                    <Text style={styles.salaText}>
                    {item.nombre} - Capacidad: {item.capacidad} - {item.tv ? "📺" : "❌"}
                    </Text>
                    <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => seleccionarSala(item)}
                    >
                        <Text style={styles.actionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => eliminarSala(item.id)}
                    >
                        <Text style={styles.actionText}>Eliminar</Text>
                    </TouchableOpacity>
                    </View>
                </View>
                )}
            />
        </View>
    );
}

// Estilos
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffffff", padding: 20 },
  title: { fontSize: 22, color: "#d4af37", marginBottom: 15, fontWeight: "bold" },
  input: { backgroundColor: "#333333ff", color: "#ffffffff", padding: 10, marginBottom: 10, borderRadius: 8, borderColor: "#d4af37", borderWidth: 1, },
  tvButton: { padding: 10, borderRadius: 8, backgroundColor: "#333", marginBottom: 10, alignItems: "center", },
  tvButtonActive: { backgroundColor: "#d4af37" },
  tvText: { color: "#fff" },
  addButton: { backgroundColor: "#d4af37", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 20, },
  addButtonText: { color: "#000000ff", fontWeight: "bold" },
  salaItem: { backgroundColor: "#1a1a1a", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#333", },
  navButton: { backgroundColor: "#d4af37", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginHorizontal: 6, alignSelf: 'flex-start', marginBottom: 10 },
  navButtonText: { color: "#ffffffff", fontWeight: "700", fontSize: 14 },
  salaText: { color: "#fff", marginBottom: 5 },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  editButton: { marginRight: 10, padding: 5, backgroundColor: "#d4af37", borderRadius: 5 },
  deleteButton: { padding: 5, backgroundColor: "red", borderRadius: 5 },
  actionText: { color: "#fff" },
});