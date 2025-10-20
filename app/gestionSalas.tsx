//app/gestionSalas.tsx
import { db } from "../firebase";
import React, {useEffect,useState} from "react";
import { View, Text, TextInput,Dimensions ,TouchableOpacity, FlatList, StyleSheet, Alert, Modal } from "react-native";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from '@react-navigation/stack';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type RootStackParamList = {
    Home: undefined;
};

export default function GestionSalas(){

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [salas, setSalas] = useState<any[]>([]);
    const [nombre, setNombre] = useState("");
    const [capacidad, setCapacidad] = useState("");
    const [tv, setTv] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'edit' | 'delete' | null>(null);
    const [salaSeleccionada, setSalaSeleccionada] = useState<any>(null);
    
    const [feedbackMessage, setFeedbackMessage] = useState<{text: string; type: "success" | "error"} | null>(null);

    const showMessage = (text: string, type: "success" | "error" = "success", duration = 2500) => {
        setFeedbackMessage({ text, type });
        setTimeout(() => setFeedbackMessage(null), duration);
    };

    // Escuchar cambios en tiempo real
    useEffect (() => {
        const salasRef = collection(db, "salas");
        const q = query(salasRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q,(snapshot) => {
            const data = snapshot.docs.map((d) => ({id:d.id, ...d.data()}));
            setSalas(data);
        });
        return unsubscribe;
    },[]);

    // Agregar sala
    const agregarSala = async () => {
        if (!nombre || !capacidad) {
            showMessage("Por favor complete todos los campos.", "error");
            return;
        }
        try {
            await addDoc(collection(db,"salas"),{
                nombre,
                capacidad: parseInt(capacidad),
                tv,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            showMessage("Sala agregada correctamente.", "success");
            setNombre("");
            setCapacidad("");
            setTv(false);
        } catch (error) {
            showMessage("No se pudo agregar la sala.", "error");
        }
    };

    // Abrir modal de edición
    const abrirModalEdicion = () => {
        if (!editId || !nombre || !capacidad) {
            showMessage("Por favor complete todos los campos.", "error");
            return;
        }
        const sala = salas.find(s => s.id === editId);
        setSalaSeleccionada(sala);
        setModalType('edit');
        setModalVisible(true);
    };

    // Editar sala (confirmado)
    const confirmarEdicion = async () => {
        if (!editId) return;
        try {
            await updateDoc(doc(db,"salas",editId),{
                nombre,
                capacidad: parseInt(capacidad),
                tv,
                updatedAt: serverTimestamp(),
            });
            showMessage("Sala editada correctamente.", "success");
            setEditId(null);
            setNombre("");
            setCapacidad("");
            setTv(false);
            setModalVisible(false);
        } catch (error) {
            showMessage("No se pudo editar la sala.", "error");
        }
    };

    // Abrir modal de eliminación
    const abrirModalEliminacion = (sala: any) => {
        setSalaSeleccionada(sala);
        setModalType('delete');
        setModalVisible(true);
    };

    // Eliminar sala (confirmado)
    const confirmarEliminacion = async () => {
        if (!salaSeleccionada) return;
        try {
            await deleteDoc(doc(db,"salas",salaSeleccionada.id));
            showMessage("Sala eliminada correctamente.", "success");
            setModalVisible(false);
        } catch (error) {
            showMessage("No se pudo eliminar la sala.", "error");
        }
    };

    // Cerrar modal
    const cerrarModal = () => {
        setModalVisible(false);
        setModalType(null);
        setSalaSeleccionada(null);
    };

    // Seleccionar sala para editar
    const seleccionarSala = (sala:any) => {
        setEditId(sala.id);
        setNombre(sala.nombre);
        setCapacidad(sala.capacidad.toString());
        setTv(sala.tv);
    };

    // Cancelar edición
    const cancelarEdicion = () => {
        setEditId(null);
        setNombre("");
        setCapacidad("");
        setTv(false);
    };

    return (
        <View style={styles.container}>
            
            {/* Header */}
                  <View style={styles.header}>
                    <TouchableOpacity 
                      style={styles.backButton}
                      onPress={() => navigation.navigate("Home")}
                    >
                      <Text style={styles.backButtonText}><FontAwesome name="arrow-left" size={15} color="white" /> Inicio</Text>
                    </TouchableOpacity>
            
                    
                    
                    <Text style={styles.title}>Gestión de Salas</Text>
                 
                    <View style={styles.placeholder} />
    
                  </View>
            

            {/* Mensaje de feedback */}
            {feedbackMessage && (
                <View style={[
                    styles.feedbackContainer,
                    { backgroundColor: feedbackMessage.type === "success" ? "#BEAF87" : "#ff6961" }
                ]}>
                    <Text style={styles.feedbackText}>{feedbackMessage.text}</Text>
                </View>
            )}
           
            {/* Formulario */}
            <TextInput
                style={styles.input}
                placeholder="Nombre de sala"
                placeholderTextColor="#888"
                value={nombre}
                onChangeText={setNombre}
            />
            <TextInput
                style={styles.input}
                placeholder="Capacidad"
                placeholderTextColor="#888"
                value={capacidad}
                onChangeText={setCapacidad}
                keyboardType="numeric"
            />

            <TouchableOpacity
                style={[styles.tvButton, tv && styles.tvButtonActive]}
                onPress={() => setTv(!tv)}
            >
                <Text style={styles.tvText}>{tv ? "Con TV 📺" : "Sin TV ❌"}</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={editId ? abrirModalEdicion : agregarSala}
                >
                    <Text style={styles.addButtonText}>
                        {editId ? "Guardar Cambios" : "Agregar Sala"}
                    </Text>
                </TouchableOpacity>

                {editId && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={cancelarEdicion}
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Lista de salas */}
            <FlatList
                data={salas}
                keyExtractor={(item, index) => item.id || index.toString()}
                renderItem={({ item }) => (
                    <View style={styles.salaItem}>
                        <View style={styles.salaInfo}>
                            <Text style={styles.salaText}>{item.nombre}</Text>
                            <Text style={styles.salaSubtext}>
                                Capacidad: {item.capacidad} • {item.tv ? "📺 Con TV" : "❌ Sin TV"}
                            </Text>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => seleccionarSala(item)}
                            >
                                <Text style={styles.actionText}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => abrirModalEliminacion(item)}
                            >
                                <Text style={styles.actionText}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* Modal de confirmación */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {modalType === 'edit' && (
                            <>
                                <Text style={styles.modalTitle}>Confirmar Edición</Text>
                                <Text style={styles.modalMessage}>
                                    ¿Guardar los cambios en la sala "{nombre}"?
                                </Text>
                                <View style={styles.modalDetails}>
                                    <Text style={styles.modalDetailText}>• Capacidad: {capacidad}</Text>
                                    <Text style={styles.modalDetailText}>• {tv ? "Con TV 📺" : "Sin TV ❌"}</Text>
                                </View>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.confirmButton]}
                                        onPress={confirmarEdicion}
                                    >
                                        <Text style={styles.modalButtonText}>Guardar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelModalButton]}
                                        onPress={cerrarModal}
                                    >
                                        <Text style={styles.cancelModalText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {modalType === 'delete' && salaSeleccionada && (
                            <>
                                <Text style={styles.modalTitle}>Eliminar Sala</Text>
                                <Text style={styles.modalMessage}>
                                    ¿Estás seguro que quieres eliminar "{salaSeleccionada.nombre}"?
                                </Text>
                                <Text style={styles.modalWarning}>
                                    Esta acción no se puede deshacer.
                                </Text>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.deleteModalButton]}
                                        onPress={confirmarEliminacion}
                                    >
                                        <Text style={styles.modalButtonText}>Eliminar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelModalButton]}
                                        onPress={cerrarModal}
                                    >
                                        <Text style={styles.cancelModalText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#ffffffff", padding: 20, paddingTop: height > 700 ? 70 : 40, },
    title: { fontSize: 24, fontWeight: "bold", color: "#BEAF87", textAlign: "left", flex: 1, marginLeft:18 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, },
    feedbackContainer: { padding: 10, borderRadius: 8, marginBottom: 15, alignItems: "center" },
    feedbackText: { color: "#000", fontWeight: "bold", textAlign: "center" },
    input: { backgroundColor: "#333333ff", color: "#ffffffff", padding: 10, marginBottom: 10, borderRadius: 8, borderColor: "#d4af37", borderWidth: 1, },
    tvButton: { padding: 10, borderRadius: 8, backgroundColor: "#333", marginBottom: 10, alignItems: "center", },
    tvButtonActive: { backgroundColor: "#BEAF87" },
    tvText: { color: "#fff", fontWeight: "600" },
    buttonRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    addButton: { flex: 1, backgroundColor: "#BEAF87", padding: 12, borderRadius: 8, alignItems: "center" },
    addButtonText: { color: "#000000ff", fontWeight: "bold" },
    cancelButton: { flex: 1, backgroundColor: "transparent", padding: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#d4af37" },
    cancelButtonText: { color: "#BEAF87", fontWeight: "bold" },
    salaItem: { backgroundColor: "#1a1a1a", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#333", },
    salaInfo: { marginBottom: 10 },
    placeholder: { width: 80, },
    backButton: { backgroundColor: "#BEAF87", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, },
    backButtonText: { color: "#ffffffff", fontWeight: "bold", fontSize: 14, },
    salaText: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
    salaSubtext: { color: "#aaa", fontSize: 14 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
    editButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#BEAF87", borderRadius: 5 },
    deleteButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#ff6961", borderRadius: 5 },
    actionText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
    modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
    modalContent: { backgroundColor: "#1c1c1c", padding: 25, borderRadius: 15, width: "85%", alignItems: "center" },
    modalTitle: { color: "#BEAF87", fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
    modalMessage: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 10, lineHeight: 22 },
    modalDetails: { marginBottom: 20, alignSelf: "flex-start", width: "100%" },
    modalDetailText: { color: "#fff", fontSize: 14, marginBottom: 4 },
    modalWarning: { color: "#ff6961", fontSize: 14, textAlign: "center", marginBottom: 20, fontStyle: "italic" },
    modalButtons: { flexDirection: "row", gap: 10, width: "100%" },
    modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
    confirmButton: { backgroundColor: "#BEAF87" },
    deleteModalButton: { backgroundColor: "#ff6961" },
    cancelModalButton: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#BEAF87" },
    modalButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
    cancelModalText: { color: "#BEAF87", fontWeight: "bold", fontSize: 16 },
});