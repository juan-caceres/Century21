import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type RegistroScreenNavigationProp = StackNavigationProp<RootStackParamList, "Registro">;
type Props = { navigation: RegistroScreenNavigationProp };

export default function Registro({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [errorEmail, setErrorEmail] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [errorConfirm, setErrorConfirm] = useState("");

  const validarCampos = () => {
    let valid = true;
    setErrorEmail(""); setErrorPassword(""); setErrorConfirm("");

    if (!email.includes("@")) {
      setErrorEmail("Correo inválido.");
      valid = false;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorPassword("Contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.");
      valid = false;
    }
    if (password !== confirm) {
      setErrorConfirm("Las contraseñas no coinciden.");
      valid = false;
    }
    return valid;
  };

  const handleRegister = async () => {
    if (!validarCampos()) return;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") setErrorEmail("Este correo ya está registrado.");
      else setErrorEmail("Error al crear la cuenta.");
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/century21-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Crear Cuenta</Text>

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

      <View style={[styles.inputContainer, errorPassword ? styles.inputError : null]}>
        <Icon name="lock-outline" size={20} color="#d4af37" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#aaa"
        />
      </View>
      {errorPassword ? <Text style={styles.errorText}>{errorPassword}</Text> : null}

      <View style={[styles.inputContainer, errorConfirm ? styles.inputError : null]}>
        <Icon name="lock-outline" size={20} color="#d4af37" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Confirmar Contraseña"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#aaa"
        />
      </View>
      {errorConfirm ? <Text style={styles.errorText}>{errorConfirm}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Registrarse</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Ya tengo cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { width: 180, height: 80, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#d4af37", marginBottom: 20 },
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
