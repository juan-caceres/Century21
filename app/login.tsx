// app/login.tsx
import React, { useState } from "react";
import { Text, StyleSheet, View, TextInput, TouchableOpacity, Image, ActivityIndicator, Modal, } from "react-native";
import { useFonts } from "expo-font";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, useAuth } from "../App";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type LoginScreenNavigationProp = StackNavigationProp< RootStackParamList, "Login" >;
type Props = { navigation: LoginScreenNavigationProp };

export default function Login({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setBlockNavigation } = useAuth();

  const [fontsLoaded] = useFonts({
    Typold: require("../assets/Typold-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#BEAF87" />
      </View>
    );
  }

  const validarCampos = () => {
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

  const logueo = async () => {
    if (!validarCampos()) return;

    setLoading(true);
    setErrorEmail("");
    setErrorPassword("");

    try {
      console.log(" Intentando login con:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log(" Login exitoso en Auth, verificando Firestore...");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      console.log(" Documento existe:", userDoc.exists());

      if (!userDoc.exists()) {
        console.log(" Usuario no existe en Firestore - Bloqueando navegación...");
        
        setBlockNavigation(true);
        
        setTimeout(() => {
          setShowDeletedModal(true);
          setLoading(false);
        }, 100);
        
        return;
      }

      console.log(" Login completamente exitoso");
      
    } catch (error: any) {
      console.log(" Error en login:", error.code, error.message);
      
      if (error.code === "auth/user-not-found") {
        setErrorEmail("No existe una cuenta con este correo.");
      } else if (error.code === "auth/wrong-password") {
        setErrorPassword("Contraseña incorrecta.");
      } else if (error.code === "auth/invalid-email") {
        setErrorEmail("Correo no válido.");
      } else if (error.code === "auth/invalid-credential") {
        setErrorEmail("Credenciales inválidas.");
      } else {
        setErrorEmail("Error al iniciar sesión: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = async () => {
    console.log(" Cerrando modal y sesión...");
    setShowDeletedModal(false);
    
    try {
      if (auth.currentUser) {
        await auth.signOut();
        console.log(" Sesión cerrada desde modal");
      }
    } catch (err) {
      console.log(" Error cerrando sesión desde modal:", err);
    }
    
    setBlockNavigation(false);
    setEmail("");
    setPassword("");
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/LogoGrey.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, styles.fontTypold]}>Bienvenido</Text>
      <Text style={[styles.subtitle, styles.fontTypold]}>
        Inicia sesión para continuar
      </Text>

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

      <TouchableOpacity
        style={styles.button}
        onPress={logueo}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#252526" />
        ) : (
          <Text style={[styles.buttonText, styles.fontTypold]}>Iniciar Sesión</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("OlvidePassword")}>
        <Text style={[styles.link, styles.fontTypold]}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Registro")}>
        <Text style={[styles.link, styles.fontTypold]}>Crear cuenta</Text>
      </TouchableOpacity>

      {/* Modal de usuario eliminado */}
      <Modal 
        transparent 
        visible={showDeletedModal} 
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.fontTypold, styles.modalTitle]}>
              Tu usuario fue eliminado
            </Text>
            <Text style={[styles.fontTypold, styles.modalMessage]}>
              Tu cuenta ya no existe en nuestros registros. Contacta con el administrador para más información.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleModalClose}
            >
              <Text style={[styles.fontTypold, styles.modalButtonText]}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fontTypold: { fontFamily: "Typold" },
  container: { flex: 1, backgroundColor: "#ffffffff", justifyContent: "center", alignItems: "center", padding: 20 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { width: 220, height: 120, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#BEAF87", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#fff", marginBottom: 25 },
  inputContainer: { flexDirection: "row", alignItems: "center", width: "90%", borderWidth: 1, borderColor: "#BEAF87", backgroundColor: "#252526", borderRadius: 8, paddingHorizontal: 10, marginBottom: 10 },
  input: { flex: 1, color: "#fff", height: 48, fontSize: 16 },
  inputError: { borderColor: "red" },
  errorText: { color: "red", alignSelf: "flex-start", marginLeft: "5%", marginBottom: 5 },
  button: { backgroundColor: "#BEAF87", padding: 15, borderRadius: 8, width: "90%", marginTop: 10, justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#252526", textAlign: "center", fontSize: 18, fontWeight: "bold" },
  link: { marginTop: 20, color: "#252526", fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 12, width: "80%", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#BEAF87", marginBottom: 10 },
  modalMessage: { fontSize: 16, textAlign: "center", marginBottom: 20, color: "#252526" },
  modalButton: { backgroundColor: "#BEAF87", paddingVertical: 10, paddingHorizontal: 25, borderRadius: 8 },
  modalButtonText: { color: "#252526", fontSize: 16, fontWeight: "bold" },
});