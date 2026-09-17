//app/gestionSalas.tsx
import { db, storage} from "../firebase.web";
import React, {useEffect,useState, useRef} from "react";
import { View, Text, TextInput,Dimensions ,TouchableOpacity, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal, ScrollView, Keyboard, Image, ActivityIndicator } from "react-native";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from '@react-navigation/stack';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from "@expo/vector-icons";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

type RootStackParamList = {
    Home: undefined;
};

type PosicionImagen = 'banner' | 'fondo' | 'pie';

export default function GestionSalas(){

    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [salas, setSalas] = useState<any[]>([]);
    const [nombre, setNombre] = useState("");
    const [capacidad, setCapacidad] = useState("");
    const [tv, setTv] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    
    //Estados de Imagen
    const [imagenUrl, setImagenUrl] = useState<string | null>(null);
    const [posicionImagen, setPosicionImagen] = useState<PosicionImagen>('banner');
    const [uploading, setUploading] = useState(false);

    // Estados originales para comparar
    const [nombreOriginal, setNombreOriginal] = useState("");
    const [capacidadOriginal, setCapacidadOriginal] = useState("");
    const [tvOriginal, setTvOriginal] = useState(false);
    const [imagenUrlOriginal, setImagenUrlOriginal] = useState<string | null>(null);
    const [posicionOriginal, setPosicionOriginal] = useState<PosicionImagen>('banner');
    
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'edit' | 'delete' | 'cancelEdit' | null>(null);
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

    // 1. Selector de imágenes desde el dispositivo / PC
    const seleccionarImagen = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showMessage("Se requieren permisos para acceder a las fotos.", "error");
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.6,
        });

        if (!result.canceled && result.assets[0].uri) {
            await subirAFirebaseStorage(result.assets[0].uri);
        }
    };

    // 2. Subida universal a Firebase Storage
    const subirAFirebaseStorage = async (fileUri: string) => {
    setUploading(true);
    try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        
        // Convertimos el blob a un buffer de bytes para saltar la restricción CORS de fetch directo en web
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        const filename = `sala_${Date.now()}.jpg`;
        const storageRef = ref(storage, `salas/${filename}`);

        // Subimos los bytes directamente
        await uploadBytes(storageRef, bytes, { contentType: 'image/jpeg' });
        
        const downloadURL = await getDownloadURL(storageRef);

        setImagenUrl(downloadURL);
        showMessage("Imagen cargada con éxito.", "success");

    } catch (error: any) {
        console.error("Error al subir a Firebase Storage:", error);
        showMessage("Error al subir la imagen.", "error");
    } finally {
        setUploading(false);
    }
    };

    // 3. Quitar la imagen personalizada
    const eliminarImagen = () => {
        setImagenUrl(null);
        showMessage("Imagen removida. Se usará el logo por defecto.", "success");
    }

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
                imagenUrl: imagenUrl || null,
                posicionImagen: posicionImagen || 'banner',
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
        
        // Verificar si hay cambios
        const hayCambios = 
            nombre !== nombreOriginal || 
            capacidad !== capacidadOriginal || 
            tv !== tvOriginal ||
            imagenUrl !== imagenUrlOriginal ||
            posicionImagen !== posicionOriginal;
        
        if (!hayCambios) {
            showMessage("❌ No se realizaron cambios en la sala", "error");
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
                imagenUrl: imagenUrl || null,
                posicionImagen: posicionImagen || 'banner',
                updatedAt: serverTimestamp(),
            });
            showMessage("Sala editada correctamente.", "success");
            setEditId(null);
            setNombre("");
            setCapacidad("");
            setTv(false);
            // Limpiar valores originales
            setNombreOriginal("");
            setCapacidadOriginal("");
            setTvOriginal(false);
            setImagenUrlOriginal(null);
            setPosicionOriginal('banner');
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
        setImagenUrl(sala.imagenUrl || null);
        setPosicionImagen(sala.posicionImagen || 'banner');
        // Guardar valores originales
        setNombreOriginal(sala.nombre);
        setCapacidadOriginal(sala.capacidad.toString());
        setTvOriginal(sala.tv);
        setImagenUrlOriginal(sala.imagenUrl || null);
        setPosicionOriginal(sala.posicionImagen || 'banner');
        setTimeout(() => {
        // 1. Intenta scroll a través de la referencia del ScrollView de React Native
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
        
        // 2. Si es navegador (PC o Celular), fuerza también el scroll del DOM
        if (Platform.OS === 'web') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    }, 100);    
    };

    // Función para manejar el intento de cancelar
    const handleCancelarEdicion = () => {
        // Verificar si hay cambios
        const hayCambios = 
            nombre !== nombreOriginal || 
            capacidad !== capacidadOriginal || 
            tv !== tvOriginal ||
            imagenUrl !== imagenUrlOriginal ||
            posicionImagen !== posicionOriginal;
        
        if (hayCambios) {
            // Si hay cambios, mostrar modal de confirmación
            setModalType('cancelEdit');
            setModalVisible(true);
        } else {
            // Si no hay cambios, cancelar directamente
            cancelarEdicion();
        }
    };

    // Confirmar cancelación (descarta cambios)
    const confirmarCancelacion = () => {
        cancelarEdicion();
        setModalVisible(false);
    };

    // Rechazar cancelación (vuelve a la edición)
    const rechazarCancelacion = () => {
        setModalVisible(false);
        setModalType(null);
    };

    // Cancelar edición
    const cancelarEdicion = () => {
        setEditId(null);
        setNombre("");
        setCapacidad("");
        setTv(false);
        setImagenUrl(null);
        setPosicionImagen('banner');
        // Limpiar valores originales
        setNombreOriginal("");
        setCapacidadOriginal("");
        setTvOriginal(false);
        setImagenUrlOriginal(null);
        setPosicionOriginal('banner');
    };

    const scrollViewRef = useRef<ScrollView>(null);

    return (             
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>

            <ScrollView 
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
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

            <View style={styles.imageSection}>
                <Text style={styles.imageLabel}>Imagen de la Sala:</Text>
                <View style={styles.imagePreviewContainer}>
                    <Image 
                        source={imagenUrl ? { uri: imagenUrl } : require("../assets/LogoGrey.png")} 
                        style={styles.previewImage}
                        resizeMode="cover"
                    />
                    {uploading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#BEAF87" />
                        </View>
                    )}
                </View>
                <View style={styles.imageActionsRow}>
                    <TouchableOpacity style={styles.imageBtn} onPress={seleccionarImagen} disabled={uploading}>
                        <Text style={styles.imageBtnText}>📷 {imagenUrl ? "Cambiar Imagen" : "Cargar Imagen"}</Text>
                    </TouchableOpacity>
                    {imagenUrl && (
                        <TouchableOpacity style={[styles.imageBtn, styles.deleteImgBtn]} onPress={eliminarImagen} disabled={uploading}>
                            <Text style={styles.deleteImgBtnText}>🗑️ Usar Logo Default</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        Keyboard.dismiss();
                        editId ? abrirModalEdicion() : agregarSala();
                    }}
                >
                    <Text style={styles.addButtonText}>
                        {editId ? "Guardar Cambios" : "Agregar Sala"}
                    </Text>
                </TouchableOpacity>

                {editId && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancelarEdicion}
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Lista de salas */}
            {salas.map((item, index) => (
                <View key={item.id || index.toString()} 
                style={styles.salaItem}>
                    <Image 
                            source={item.imagenUrl ? { uri: item.imagenUrl } : require("../assets/LogoGrey.png")} 
                            style={styles.itemListThumb} 
                            resizeMode="cover" 
                        />
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
                ))}
            
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

                        {/* Modal de confirmación de cancelación */}
                        {modalType === 'cancelEdit' && (
                            <>
                               <View style={styles.iconContainer}>
            <Ionicons name="warning" size={48} color="#BEAF87" />
        </View>
        <Text style={styles.modalTitle}>¿Cancelar edición?</Text>
        <Text style={styles.modalMessage}>
            Si cancelas ahora, <Text style={{ fontWeight: 'bold', color: '#BEAF87' }}>se perderán los cambios</Text> que realizaste en la sala.
        </Text>
        <Text style={[styles.modalMessage, { marginBottom: 20 }]}>
            ¿Estás seguro de que deseas cancelar?
        </Text>
        
        {/* Usamos el mismo contenedor y clases de botones de Confirmar Edición */}
        <View style={styles.modalButtons}>
            <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmarCancelacion}
            >
                <Text style={styles.modalButtonText}>Sí, cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={rechazarCancelacion}
            >
                <Text style={styles.cancelModalText}>Continuar editando</Text>
            </TouchableOpacity>
        </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>   
          </View>       
        </ScrollView>
    </KeyboardAvoidingView>
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

    // UI de Imágenes y Posicionamiento
    imageSection: { marginBottom: 15, padding: 12, backgroundColor: "#252526", borderRadius: 8, borderWidth: 1, borderColor: "#333" },
    imageLabel: { color: "#BEAF87", fontWeight: "bold", marginBottom: 8 },
    imagePreviewContainer: { width: "100%", height: 140, borderRadius: 6, overflow: "hidden", backgroundColor: "#1c1c1c", justifyContent: "center", alignItems: "center" },
    previewImage: { width: "100%", height: "100%" },
    loadingOverlay: { position: "absolute", backgroundColor: "rgba(0,0,0,0.6)", width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
    imageActionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    imageBtn: { flex: 1, backgroundColor: "#333", padding: 10, borderRadius: 6, alignItems: "center", borderWidth: 1, borderColor: "#BEAF87" },
    imageBtnText: { color: "#BEAF87", fontSize: 13, fontWeight: "600" },
    deleteImgBtn: { borderColor: "#ff6961" },
    deleteImgBtnText: { color: "#ff6961", fontSize: 13, fontWeight: "600" },

    positionSelectorContainer: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#333" },
    positionLabel: { color: "#aaa", fontSize: 13, marginBottom: 8 },
    positionButtonsRow: { flexDirection: "row", gap: 8 },
    posBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: "#1c1c1c", borderWidth: 1, borderColor: "#555", alignItems: "center" },
    posBtnActive: { backgroundColor: "#BEAF87", borderColor: "#BEAF87" },
    posBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
    posBtnTextActive: { color: "#000" },

    buttonRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    addButton: { flex: 1, backgroundColor: "#BEAF87", padding: 12, borderRadius: 8, alignItems: "center" },
    addButtonText: { color: "#000000ff", fontWeight: "bold" },
    cancelButton: { flex: 1, backgroundColor: "transparent", padding: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#d4af37" },
    cancelButtonText: { color: "#BEAF87", fontWeight: "bold" },
    salaItem: { backgroundColor: "#1a1a1a", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#333", },
    salaItemContent: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
    itemListThumb: { width: 50, height: 50, borderRadius: 6, backgroundColor: "#333" },
    salaInfo: { flex: 1 },
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
    iconContainer: { marginBottom: 15 },
});