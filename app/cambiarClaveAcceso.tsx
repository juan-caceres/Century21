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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Estado para el "ojito"
  const [successModalVisible, setSuccessModalVisible] = useState(false); // Estado para la ventana de éxito

  const handleActualizarClave = async () => {
    if (!nuevaClave.trim()) {
      alert("Por favor ingresa una clave válida.");
      return;
    }

    try {
      setLoading(true);
      
      const docRef = doc(db, "seguridad", "acceso"); 
      
      await updateDoc(docRef, {
        accesoID: nuevaClave.trim()
      });

      // Mostramos la ventana de éxito en lugar de un alert nativo
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Error al actualizar la clave:", error);
      alert("No tienes permisos o ocurrió un error al actualizar la clave.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModalVisible(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cambiar Clave de Acceso</Text>
      <Text style={styles.subtitle}>
        Introduce la nueva clave que se requerirá para ingresar a la aplicación web.
      </Text>

      {/* Contenedor del Input con el ícono del "ojito" */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nueva clave de acceso"
          placeholderTextColor="#777"
          secureTextEntry={!showPassword} // Cambia según el estado del ojito
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
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>

      {/* Ventana Modal de Éxito */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={handleCloseSuccess}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={60} color="#BEAF87" style={{ marginBottom: 15 }} />
            <Text style={styles.modalTitle}>¡Éxito!</Text>
            <Text style={styles.modalText}>La clave de acceso ha sido actualizada correctamente.</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleCloseSuccess}>
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
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
    marginBottom: 20, 
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

  button: { backgroundColor: "#BEAF87", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 10 },
  buttonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  cancelButton: { padding: 15, alignItems: "center" },
  cancelText: { color: "#777", fontSize: 16 },

  // Estilos del Modal de éxito
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
    marginBottom: 10
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
    fontSize: 16
  }
});