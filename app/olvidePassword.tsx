import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
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

  const handleReset = async () => {
    setErrorEmail("");

    if (!email.includes("@")) {
      setErrorEmail("Ingrese un correo válido.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Éxito", "Se ha enviado un correo para restablecer la contraseña.");
      navigation.navigate("Login");
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setErrorEmail("No existe una cuenta con este correo.");
      } else {
        setErrorEmail("Error al enviar el correo. Intenta más tarde.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/century21-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Recuperar Contraseña</Text>
      <Text style={styles.subtitle}>Ingresa tu correo para recibir el enlace</Text>

      <View style={[styles.inputContainer, errorEmail ? styles.inputError : null]}>
        <Icon name="email-outline" size={20} color="#d4af37" style={{ marginRight: 8 }} />
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
        <Text style={styles.buttonText}>Enviar enlace</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Volver al login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { width: 180, height: 80, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#d4af37", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#fff", marginBottom: 25 },
  inputContainer: {
    flexDirection: "row", alignItems: "center",
    width: "90%", borderWidth: 1, borderColor: "#d4af37",
    backgroundColor: "#1a1a1a", borderRadius: 8, paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: { flex: 1, color: "#fff", height: 48, fontSize: 16 },
  inputError: { borderColor: "red" },
  errorText: { color: "red", alignSelf: "flex-start", marginLeft: "5%", marginBottom: 5 },
  button: { backgroundColor: "#d4af37", padding: 15, borderRadius: 8, width: "90%", marginTop: 10 },
  buttonText: { color: "#000", textAlign: "center", fontSize: 18, fontWeight: "bold" },
  link: { marginTop: 20, color: "#d4af37", fontSize: 16, fontWeight: "600" },
});
