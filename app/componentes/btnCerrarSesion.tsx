import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Modal, Pressable, Animated } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigation, NavigationProp } from "@react-navigation/native";

type RootStackParamList = {
  login: undefined;
};

export default function BtnCerrarSesion() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.8);
    }
  }, [modalVisible]);

  const handleLogout = async () => {
    await signOut(auth);
    setModalVisible(false);
    navigation.navigate("login");
  };

  return (
    <View>
      {/* Botón que abre el modal */}
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Modal de confirmación */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.modalTitle}>Cerrar Sesión</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro que quieres cerrar sesión?
            </Text>

            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalBtn, styles.confirmBtn]} 
                onPress={handleLogout}
              >
                <Text style={styles.confirmText}>Sí, cerrar sesión</Text>
              </Pressable>

              <Pressable 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  logoutButton: { 
    backgroundColor: "#BEAF87", 
    padding: 8, 
    borderRadius: 5 
  },
  logoutText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },

  // Estilos del modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 25,
    borderWidth: 1,
    borderColor: "#BEAF87",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10, 
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#BEAF87",
    marginBottom: 10,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  confirmBtn: {
    backgroundColor: "#E53935", 
  },
  cancelBtn: {
    backgroundColor: "#ccc",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelText: {
    color: "#333",
    fontWeight: "bold",
  },
});
