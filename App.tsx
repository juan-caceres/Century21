//App.tsx
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState, createContext, useContext, useRef } from "react";
import { ActivityIndicator, View, Platform, Modal, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Login from "./app/login";
import Home from "./app/home";
import Registro from "./app/registro";
import Sala from "./app/sala";
import Usuarios from "./app/usuarios";
import olvidePassword from "./app/olvidePassword";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useFonts } from 'expo-font';
import { getDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import GestionSalas from "./app/gestionSalas";

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  OlvidePassword: undefined;
  Home: undefined;
  Sala: { numero: string };
  Usuarios: undefined;
  GestionSalas: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const AuthContext = createContext<{
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  role: string | null;
  setRole: React.Dispatch<React.SetStateAction<string | null>>;
  blockNavigation: boolean;
  setBlockNavigation: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  user: null,
  setUser: () => {},
  role: null,
  setRole: () => {},
  blockNavigation: false,
  setBlockNavigation: () => {},
});
export const useAuth = () => useContext(AuthContext);

// Configuración de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockNavigation, setBlockNavigation] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [fontsLoaded] = useFonts({Typold: require('./assets/Typold-Bold.ttf'),});
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Detección de usuario eliminado
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (usuario) => {
      console.log("Auth state cambió:", usuario ? "Usuario logueado" : "Sin usuario");
      
      // Limpiar listener anterior de Firestore si existe
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      setUser(usuario);

      if (usuario) {
        try {
          // Verificar si el usuario existe en Firestore
          const userDocRef = doc(db, "users", usuario.uid);
          const userDoc = await getDoc(userDocRef);
          
          console.log("📄 Documento existe:", userDoc.exists());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role?.toLowerCase()?.trim() ?? "user";
            console.log("Usuario válido - Rol:", userRole);
            setRole(userRole);
            setBlockNavigation(false);

            // Detectar si el usuario es eliminado
            unsubscribeFirestore = onSnapshot(
              userDocRef,
              async (docSnapshot) => {
                if (!docSnapshot.exists()) {
                  console.log("USUARIO ELIMINADO - Cerrando sesión...");
                  
                  // Mostrar modal personalizado
                  setShowDeletedModal(true);
                }
              },
              (error) => {
                console.error("Error en listener de Firestore:", error);
              }
            );
          } else {
            console.log("Usuario no existe en Firestore - BLOQUEANDO NAVEGACIÓN");
            setRole(null);
            setBlockNavigation(true);
          }
        } catch (error) {
          console.error("Error al obtener rol del usuario:", error);
          setRole("user");
        }
      } else {
        setRole(null);
        setBlockNavigation(false);
      }

      setLoading(false);
    });

    return () => {
      unsub();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  const handleAccountDeletedConfirm = async () => {
    console.log("Usuario confirmó eliminación, cerrando sesión...");
    setShowDeletedModal(false);
    
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      setBlockNavigation(false);
      console.log("Sesión cerrada correctamente");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (loading || !fontsLoaded) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <ActivityIndicator size="large" color="#BEAF87" />
    </View>
  );

  const shouldShowAuthScreens = !user || blockNavigation || !role;

  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole, blockNavigation, setBlockNavigation }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {shouldShowAuthScreens ? (
            // Pantallas de autenticación
            <>
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Registro" component={Registro} />
              <Stack.Screen name="OlvidePassword" component={olvidePassword} />
            </>
          ) : (
            // Pantallas principales (solo si usuario válido)
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="GestionSalas" component={GestionSalas} />
              <Stack.Screen name="Usuarios" component={Usuarios} />
              <Stack.Screen name="Sala" component={Sala} options={{
                animation:'fade_from_right',
                transitionSpec:{
                  open: {animation: 'timing', config: {duration: 300}},
                  close: {animation: 'timing', config: {duration: 200}},
                },
              }} />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>

      {/* Modal de cuenta eliminada */}
      <Modal 
        transparent 
        visible={showDeletedModal} 
        animationType="fade"
        onRequestClose={handleAccountDeletedConfirm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>
            <Text style={[styles.modalTitle, { fontFamily: fontsLoaded ? 'Typold' : undefined }]}>
              Cuenta Eliminada
            </Text>
            <Text style={[styles.modalMessage, { fontFamily: fontsLoaded ? 'Typold' : undefined }]}>
              Tu cuenta ha sido eliminada por un administrador. Serás redirigido al inicio de sesión.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleAccountDeletedConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalButtonText, { fontFamily: fontsLoaded ? 'Typold' : undefined }]}>
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.85)", justifyContent: "center", alignItems: "center",},
  modalContent: { backgroundColor: "#1c1c1c", padding: 30, borderRadius: 20, width: "85%", maxWidth: 400, alignItems: "center", borderWidth: 2, borderColor: "#BEAF87", shadowColor: "#BEAF87", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,},
  iconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#ff6b6b", justifyContent: "center", alignItems: "center", marginBottom: 20,},
  iconText: { fontSize: 40,},
  modalTitle: { color: "#BEAF87", fontSize: 24, fontWeight: "bold", marginBottom: 15, textAlign: "center",},
  modalMessage: { color: "#fff" ,fontSize: 16, textAlign: "center", marginBottom: 30, lineHeight: 24, paddingHorizontal: 10,},
  modalButton: { backgroundColor: "#BEAF87", paddingVertical: 14, paddingHorizontal: 40, borderRadius: 10, width: "100%", alignItems: "center", shadowColor: "#BEAF87", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, },
  modalButtonText: { color: "#252526", fontSize: 18, fontWeight: "bold",},
});

// Función para permisos y token push
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    alert("Debes usar un dispositivo físico para notificaciones push");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("No se obtuvieron permisos para notificaciones!");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Expo Push Token:", token);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#b838367c",
    });
  }

  return token;
}