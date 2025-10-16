//app/olvidePassword.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Modal, ActivityIndicator  } from "react-native";
import { useFonts } from "expo-font";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type OlvidePasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, "OlvidePassword">;
type Props = { navigation: OlvidePasswordScreenNavigationProp };

export default function OlvidePassword({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

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

  const handleReset = async () => {
    setErrorEmail("");

    if (!email.includes("@")) {
      setErrorEmail("Ingrese un correo válido.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setModalVisible(true);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setErrorEmail("No existe una cuenta con este correo.");
      } else if (error.code === "auth/invalid-email") {
        setErrorEmail("Correo inválido.");
      } else {
        console.log("Error completo:", error);
        setErrorEmail("Hubo un error inesperado. Intenta nuevamente.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/LogoGrey.png")} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.title, styles.fontTypold]}>Recuperar Contraseña</Text>
      <Text style={[styles.subtitle, styles.fontTypold]}>Ingresa tu correo para recibir el enlace</Text>

      <View style={[styles.inputContainer, errorEmail ? styles.inputError : null]}>
        <Icon name="email-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Correo"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {errorEmail ? <Text style={styles.errorText}>{errorEmail}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleReset} activeOpacity={0.7}>
        <Text style={[styles.buttonText, styles.fontTypold]}>Enviar enlace</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={[styles.link, styles.fontTypold]}>Volver al login</Text>
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, styles.fontTypold]}>¡Correo enviado!</Text>
            <Text style={[styles.modalText, styles.fontTypold]}>
              Te hemos enviado un enlace para restablecer tu contraseña.{"\n"}
              Revisa también la carpeta de spam o correo no deseado.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                navigation.reset({ index: 0, routes: [{ name: "Login" }] });
              }}
            >
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Estilos (siguiendo logo c21)
const styles = StyleSheet.create({
  fontTypold: { fontFamily: 'Typold' },
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { width: 220, height: 120, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#BEAF87", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#252526", marginBottom: 25 },
  inputContainer: {
    flexDirection: "row", alignItems: "center",
    width: "90%", borderWidth: 1, borderColor: "#BEAF87",
    backgroundColor: "#1a1a1a", borderRadius: 8, paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: { flex: 1, color: "#fff", height: 48, fontSize: 16 },
  inputError: { borderColor: "red" },
  errorText: { color: "red", alignSelf: "flex-start", marginLeft: "5%", marginBottom: 5 },
  button: { backgroundColor: "#BEAF87", padding: 15, borderRadius: 8, width: "90%", marginTop: 10 },
  buttonText: { color: "#252526", textAlign: "center", fontSize: 18, fontWeight: "bold" },
  link: { marginTop: 20, color: "#BEAF87", fontSize: 16, fontWeight: "600" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#1a1a1a", padding: 25, borderRadius: 12, width: "85%", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#BEAF87", marginBottom: 10 },
  modalText: { color: "#252526", fontSize: 16, textAlign: "center", marginBottom: 20 },
  modalButton: { backgroundColor: "#BEAF87", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  modalButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
});
