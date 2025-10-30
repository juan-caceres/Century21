//app/registro.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator,KeyboardAvoidingView, Platform , Alert } from "react-native";
import { useFonts } from "expo-font";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../app/types/navigation";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { registerForPushNotificationsAsync } from "./servicios/notifications";
import { signOut } from 'firebase/auth';
import { useAuth } from '../app/context/authContext';

type RegistroScreenNavigationProp = StackNavigationProp<RootStackParamList, "Registro">;
type Props = { navigation: RegistroScreenNavigationProp };

export default function Registro({ navigation }: Props) {
  
  const { setUser } = useAuth();
  // Estados para inputs
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [visiblePassword, setVisiblePassword] = useState("");
  const [visibleConfirmPassword, setVisibleConfirmPassword] = useState("");
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [prevLength, setPrevLength] = useState(0);

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

      if (user) {
            registerForPushNotificationsAsync(user.uid);
      }

      // Enviar correo de verificación
      await sendEmailVerification(user);
      
      Alert.alert(
        "✅ Cuenta creada",
        "Revisa tu correo para verificar tu cuenta.\n\n⚠️ IMPORTANTE: Tu email es permanente y no se puede cambiar.\n\n✅ Podrás cambiar tu Nombre de Usuario cuando quieras.",
        [
          {text: "Entendido"}
        ]
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

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // Ajustá según tu header
    >
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
            placeholder="Nombre de Usuario"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </View>
        <Text style={styles.helpText}>3-20 caracteres • Letras, números y guion bajo (_)</Text>
        {errorUsername ? <Text style={styles.errorText}>{errorUsername}</Text> : null}

        {/* Contraseña */}
        <View style={[styles.inputContainer, errorPassword ? styles.inputError : null]}>
          <Icon name="lock-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Contraseña"
            secureTextEntry={false}
            value={showPassword ? password : visiblePassword}
            onChangeText={(text) => {
              if (text.length < prevLength) {
                setPassword((prev) => prev.slice(0, -1));
              } else if (text.length === prevLength + 1) {
                const newChar = text[text.length - 1];
                setPassword((prev) => prev + newChar);
              } else {
                setPassword(text);
              }
          
              setPrevLength(text.length);
              if (showPassword) {
                if (hideTimeout) clearTimeout(hideTimeout);
                setVisiblePassword(text);
                return;
              }
              if (hideTimeout) clearTimeout(hideTimeout);
              if (text.length === 0) {
                setVisiblePassword("");
                return;
              }
          
              const hidden = "•".repeat(text.length - 1);
              const last = text[text.length - 1];
              setVisiblePassword(hidden + last);
          
              const timeout = setTimeout(() => {
                setVisiblePassword("•".repeat(text.length));
              }, 1000);
          
              setHideTimeout(timeout);
            }}
            style={[styles.input, styles.fontTypold]}
            placeholderTextColor="#aaa"
          />
          
          <TouchableOpacity
            onPress={() => {
              if (hideTimeout) clearTimeout(hideTimeout);
          
              const newValue = !showPassword;
              setShowPassword(newValue);
          
              if (newValue) {
                setVisiblePassword(password); // mostrar real
              } else {
                setVisiblePassword("•".repeat(password.length)); // ocultar todo
              }
            }}
          >
            <Icon
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#BEAF87"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>Debe contener, al menos, una Mayúscula, una Minúscula y un Número</Text>
        {errorPassword ? <Text style={styles.errorText}>{errorPassword}</Text> : null}

        {/* Confirmar contraseña */}
        <View style={[styles.inputContainer, errorConfirm ? styles.inputError : null]}>
          <Icon name="lock-outline" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Confirmar Contraseña"
            secureTextEntry={false}
            value={showConfirmPassword ? confirm : visibleConfirmPassword}
            onChangeText={(text) => {
              if (text.length < prevLength) {
                setConfirm((prev) => prev.slice(0, -1));
              } else if (text.length === prevLength + 1) {
                const newChar = text[text.length - 1];
                setConfirm((prev) => prev + newChar);
              } else {
                setConfirm(text);
              }
              
              setPrevLength(text.length);
              if (showConfirmPassword) {
                if (hideTimeout) clearTimeout(hideTimeout);
                  setVisibleConfirmPassword(text);
                  return;
                }
              
              if (hideTimeout) clearTimeout(hideTimeout);
              
              if (text.length === 0) {
                setVisibleConfirmPassword("");
                return;
              }
              
              const hidden = "•".repeat(text.length - 1);
              const last = text[text.length - 1];
              setVisibleConfirmPassword(hidden + last);
              
              const timeout = setTimeout(() => {
                setVisibleConfirmPassword("•".repeat(text.length));
              }, 1000);
              
              setHideTimeout(timeout);
            }}
            style={[styles.input, styles.fontTypold]}
            placeholderTextColor="#aaa"
            />
              
            <TouchableOpacity
              onPress={() => {
                if (hideTimeout) clearTimeout(hideTimeout);
                  const newValue = !showConfirmPassword;
                  setShowConfirmPassword(newValue);
                  if (newValue) {
                    setVisibleConfirmPassword(confirm); // mostrar real
                  } else {
                    setVisibleConfirmPassword("•".repeat(confirm.length)); // ocultar todo
                  }
            }}  
            >
            <Icon
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#BEAF87"
            />
          </TouchableOpacity>
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

    </KeyboardAvoidingView>
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
  helpText: { color: "#888", fontSize: 12, alignSelf: "flex-start", marginLeft: "5%", marginTop: -5, marginBottom: 10, },
  errorText: { color: "red", alignSelf: "flex-start", marginLeft: "5%", marginBottom: 5, fontSize: 13 },
  button: { backgroundColor: "#BEAF87", padding: 15, borderRadius: 8, width: "90%", marginTop: 10 },
  buttonText: { color: "#252526", textAlign: "center", fontSize: 18, fontWeight: "bold" },
  link: { marginTop: 20, color: "#252526", fontSize: 16, fontWeight: "600" },
});