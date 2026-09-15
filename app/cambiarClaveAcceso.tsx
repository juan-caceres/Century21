import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // Ajusta tu ruta a firebase según corresponda
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../app/types/navigation";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "CambiarClaveAcceso">;
};

export default function CambiarClaveAcceso({ navigation }: Props) {
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para los modales
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  
  // Estado genérico y reutilizable para el modal de avisos (Éxito / Errores de validación)
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    onCloseAction?: () => void;
  }>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  const handleActualizarClave = async () => {
    if (!nuevaClave.trim() || !confirmarClave.trim()) {
      setModalConfig({
        visible: true,
        type: "error",
        title: "Campos incompletos",
        message: "Por favor completa ambos campos para continuar.",
      });
      return;
    }

    if (nuevaClave !== confirmarClave) {
      setModalConfig({
        visible: true,
        type: "error",
        title: "Las claves no coinciden",
        message: "Por favor verifica que ambas claves sean iguales.",
      });
      return;
    }

    try {
      setLoading(true);
      
      const docRef = doc(db, "seguridad", "acceso"); 
      
      await updateDoc(docRef, {
        accesoID: nuevaClave.trim()
      });

      // Mostrar modal reutilizable de éxito
      setModalConfig({
        visible: true,
        type: "success",
        title: "¡Éxito!",
        message: "La clave de acceso ha sido actualizada correctamente.",
        onCloseAction: () => navigation.goBack(),
      });
    } catch (error) {
      console.error("Error al actualizar la clave:", error);
      setModalConfig({
        visible: true,
        type: "error",
        title: "Error",
        message: "No tienes permisos o ocurrió un error al actualizar la clave.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarPress = () => {
    if (nuevaClave.trim().length > 0 || confirmarClave.trim().length > 0) {
      setCancelModalVisible(true);
    } else {
      navigation.goBack();
    }
  };

  const handleCloseModal = () => {
    const action = modalConfig.onCloseAction;
    setModalConfig((prev) => ({ ...prev, visible: false }));
    if (action) {
      action();
    }
  };

  return (
    <View style={styles.container}>
      
      <Text style={styles.title}>Cambiar Clave de Acceso <Ionicons name="key"size={20} color="#BEAF87" /></Text>
      <Text style={styles.subtitle}>
        Introduce la nueva clave dos veces para confirmar el cambio.
      </Text>

      {/* Primer campo: Nueva clave */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nueva clave de acceso"
          placeholderTextColor="#777"
          secureTextEntry={!showPassword}
          value={nuevaClave}
          onChangeText={setNuevaClave}
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons 
            name={showPassword ? "eye-off" : "eye"} 
            size={22} 
            color="#BEAF87" 
          />
        </TouchableOpacity>
      </View>

      {/* Segundo campo: Confirmar clave */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirmar nueva clave"
          placeholderTextColor="#777"
          secureTextEntry={!showConfirmPassword}
          value={confirmarClave}
          onChangeText={setConfirmarClave}
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons 
            name={showConfirmPassword ? "eye-off" : "eye"} 
            size={22} 
            color="#BEAF87" 
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleActualizarClave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>Guardar Nueva Clave</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={handleCancelarPress}
      >
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>

      {/* Ventana Modal Reutilizable (Éxito / Errores de validación) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name={modalConfig.type === "success" ? "checkmark-circle" : "alert-circle"} 
              size={60} 
              color="#f78686" 
              style={{ marginBottom: 15 }} 
            />
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalText}>{modalConfig.message}</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleCloseModal}>
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ventana Modal de Advertencia al Cancelar */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={60} color="#BEAF87" style={{ marginBottom: 15 }} />
            <Text style={styles.modalTitle}>¿Estás seguro?</Text>
            <Text style={styles.modalText}>Tienes datos escritos que se perderán si sales.</Text>
            
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButtonHalf, { backgroundColor: "#444" }]} 
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>Continuar editando</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButtonHalf, { backgroundColor: "#BEAF87" }]} 
                onPress={() => {
                  setCancelModalVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.modalButtonText}>Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#BEAF87", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 20 },
  
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#BEAF87", 
    borderRadius: 8, 
    marginBottom: 15, 
    backgroundColor: "#fff" 
  },
  input: { 
    flex: 1, 
    padding: 15, 
    color: "#000", 
    fontSize: 16 
  },
  eyeIcon: { 
    paddingHorizontal: 15 
  },

  button: { backgroundColor: "#BEAF87", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 10, marginTop: 5 },
  buttonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  cancelButton: { padding: 15, alignItems: "center" },
  cancelText: { color: "#777", fontSize: 16 },

  // Estilos de los Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "#252526",
    borderRadius: 12,
    padding: 25,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BEAF87",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#BEAF87",
    marginBottom: 10,
    textAlign: "center"
  },
  modalText: {
    fontSize: 15,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20
  },
  modalButton: {
    backgroundColor: "#BEAF87",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center"
  },
  modalButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center"
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
  },
  modalButtonHalf: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  }
});