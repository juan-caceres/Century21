import React, { useState } from "react";
import { Text, StyleSheet, View, TextInput, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useFonts } from "expo-font";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";


import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, "Login">;
type Props = { navigation: LoginScreenNavigationProp };

export default function Login({ navigation }: Props) {
  //declaracion de estados
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [errorPassword, setErrorPassword] = useState("");


  // Carga de fuente personalizada
  const [fontsLoaded] = useFonts({
    Typold: require("../assets/Typold-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#BEAF87" />
      </View>
    );
  }


  //FUNCIONES

  const validarCampos = () => { //funcion para validar campos
    let valid = true;
    setErrorEmail("");
    setErrorPassword("");

    if (!email.includes("@")) {
      setErrorEmail("Correo inválido.");
      valid = false;
    }
    if (!password) {
      setErrorPassword("Ingrese su contraseña.");
      valid = false;
    }
    return valid;
  };

  const logueo = async () => { //funcion para loguear
    if (!validarCampos()) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") setErrorEmail("No existe una cuenta con este correo.");
      else if (error.code === "auth/wrong-password") setErrorPassword("Contraseña incorrecta.");
      else if (error.code === "auth/invalid-email") setErrorEmail("Correo no válido.");
      else {
        setErrorEmail("Error al iniciar sesión.");
      }
    }
  };


  

  return (
    <View style={styles.container}>
      <Image source={require("../assets/LogoGrey.png")} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.title, styles.fontTypold]}>Bienvenido</Text>
      <Text style={[styles.subtitle, styles.fontTypold]}>Inicia sesión para continuar</Text>

      <View style={[styles.inputContainer, errorEmail ? styles.inputError : null]}>
        <Icon name="email-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Correo"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, styles.fontTypold]}
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      {errorEmail ? <Text style={styles.errorText}>{errorEmail}</Text> : null}

      <View style={[styles.inputContainer, errorPassword ? styles.inputError : null]}>
        <Icon name="lock-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, styles.fontTypold]}
          placeholderTextColor="#aaa"
        />
      </View>
      {errorPassword ? <Text style={styles.errorText}>{errorPassword}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={logueo} activeOpacity={0.7}>
        <Text style={[styles.buttonText, styles.fontTypold]}>Iniciar Sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("OlvidePassword")}>
        <Text style={[styles.link, styles.fontTypold]}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Registro")}>
        <Text style={[styles.link, styles.fontTypold]}>Crear cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

// Estilos (siguiendo colores del logo c21)
const styles = StyleSheet.create({
  fontTypold: { fontFamily: 'Typold' },
  container: { flex: 1, backgroundColor: "#ffffffff", justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { width: 220, height: 120, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#BEAF87", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#fff", marginBottom: 25},
  inputContainer: {
    flexDirection: "row", alignItems: "center",
    width: "90%", borderWidth: 1, borderColor: "#BEAF87",
    backgroundColor: "#252526", borderRadius: 8, paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: { flex: 1, color: "#fff", height: 48, fontSize: 16 },
  inputError: { borderColor: "red" },
  errorText: { color: "red", alignSelf: "flex-start", marginLeft: "5%", marginBottom: 5 },
  button: { backgroundColor: "#BEAF87", padding: 15, borderRadius: 8, width: "90%", marginTop: 10 },
  buttonText: { color: "#252526", textAlign: "center", fontSize: 18, fontWeight: "bold" },
  link: { marginTop: 20, color: "#252526", fontSize: 16, fontWeight: "600"},
});
