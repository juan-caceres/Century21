//app/registro.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from "react-native";
import { useFonts } from "expo-font";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { registerForPushNotificationsAsync } from "./servicios/notifications";

type RegistroScreenNavigationProp = StackNavigationProp<RootStackParamList, "Registro">;
type Props = { navigation: RegistroScreenNavigationProp };

export default function Registro({ navigation }: Props) {
  // Estados para inputs
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Estados para mensajes de error
  const [errorEmail, setErrorEmail] = useState("");
  const [errorUsername, setErrorUsername] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [errorConfirm, setErrorConfirm] = useState("");
  
  // Carga de fuente personalizada
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

  // Función de validación de datos
  const validarCampos = async () => {
    let valid = true;
    setErrorEmail(""); 
    setErrorUsername("");
    setErrorPassword(""); 
    setErrorConfirm("");

    // Validar correo
    if (!email.includes("@")) {
      setErrorEmail("Correo inválido.");
      valid = false;
    }

    // Validar username
    if (username.trim().length < 3) {
      setErrorUsername("El Nombre de Usuario debe tener mínimo 3 caracteres.");
      valid = false;
    } else if (username.trim().length > 20) {
      setErrorUsername("El Nombre de Usuario debe tener máximo 20 caracteres.");
      valid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrorUsername("Solo letras, números y/o guion bajo (_).");
      valid = false;
    } else {
      // Verificar si el username ya existe en Firestore
      try {
        const q = query(collection(db, "users"), where("username", "==", username.trim()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setErrorUsername("Este Nombre de Usuario ya está en uso.");
          valid = false;
        }
      } catch (error) {
        console.log("Error validando Nombre de Usuario:", error);
        setErrorUsername("Error al validar Nombre de usuario.");
        valid = false;
      }
    }

    // Validar contraseña: mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorPassword("Contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.");
      valid = false;
    }

    // Validar confirmación de contraseña
    if (password !== confirm) {
      setErrorConfirm("Las contraseñas no coinciden.");
      valid = false;
    }

    return valid;
  };

  const handleRegister = async () => {
    const isValid = await validarCampos();
 
  
    if (!isValid) return;
    
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        username: username.trim(),
        role: "user",
        eliminado: false,
        notificationToken:'',
        createdAt: new Date(),
      });

      await registerForPushNotificationsAsync(user.uid);

      // Enviar correo de verificación
      await sendEmailVerification(user);
      
      Alert.alert(
        "✅ Cuenta creada",
        "Revisa tu correo para verificar tu cuenta.\n\n⚠️ IMPORTANTE: Tu email es permanente y no se puede cambiar.\n\n✅ Podrás cambiar tu Nombre de Usuario cuando quieras.",
        [{ text: "Entendido", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setErrorEmail("Este correo ya está registrado.");
      } else {
        setErrorEmail("Error al crear la cuenta.");
      }
    }
  };

  // Interfaz usuario
  return (
    <View style={styles.container}>
      <Image source={require("../assets/LogoGrey.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Crear Cuenta</Text>

      {/* Correo con advertencia */}
      <View style={styles.warningContainer}>
        <Icon name="alert-circle" size={16} color="#ff9800" style={{ marginRight: 6 }} />
        <Text style={styles.warningText}>
          El email es permanente, tené cuidado al ingresarlo (¡no se puede cambiar!)
        </Text>
      </View>

      <View style={[styles.inputContainer, errorEmail ? styles.inputError : null]}>
        <Icon name="email-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {errorEmail ? <Text style={styles.errorText}>{errorEmail}</Text> : null}

      {/* Username */}
      <View style={[styles.inputContainer, errorUsername ? styles.inputError : null]}>
        <Icon name="at" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Nombre de Usuario (3-20 caracteres)"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
      </View>
      {errorUsername ? <Text style={styles.errorText}>{errorUsername}</Text> : null}

      {/* Contraseña */}
      <View style={[styles.inputContainer, errorPassword ? styles.inputError : null]}>
        <Icon name="lock-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
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

      {/* Confirmar contraseña */}
      <View style={[styles.inputContainer, errorConfirm ? styles.inputError : null]}>
        <Icon name="lock-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
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

      {/* Botón registro */}
      <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Registrarse</Text>
      </TouchableOpacity>

      {/* Link a login */}
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Ya tengo cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fontTypold: { fontFamily: 'Typold' },
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { width: 220, height: 120, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#BEAF87", marginBottom: 10 },
  warningContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff3cd", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 15, width: "90%", borderWidth: 1, borderColor: "#ff9800", },
  warningText: { color: "#856404", fontSize: 13, fontWeight: "600", flex: 1, },
  inputContainer: { flexDirection: "row", alignItems: "center", width: "90%", borderWidth: 1, borderColor: "#BEAF87", backgroundColor: "#1a1a1a", borderRadius: 8, paddingHorizontal: 10, marginBottom: 10 },
  input: { flex: 1, color: "#fff", height: 48, fontSize: 16 },
  inputError: { borderColor: "red" },
  errorText: { color: "red", alignSelf: "flex-start", marginLeft: "5%", marginBottom: 5, fontSize: 13 },
  button: { backgroundColor: "#BEAF87", padding: 15, borderRadius: 8, width: "90%", marginTop: 10 },
  buttonText: { color: "#252526", textAlign: "center", fontSize: 18, fontWeight: "bold" },
  link: { marginTop: 20, color: "#252526", fontSize: 16, fontWeight: "600" },
});