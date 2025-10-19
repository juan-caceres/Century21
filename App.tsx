//App.tsx
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState, createContext, useContext, useRef } from "react";
import { ActivityIndicator, View, Platform, Modal, Text, TouchableOpacity, StyleSheet } from "react-native";
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
import * as Notifications from 'expo-notifications';

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  OlvidePassword: undefined;
  Home: undefined;
  Sala: { numero: string };
  Usuarios: undefined;
  GestionSalas: undefined;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockNavigation, setBlockNavigation] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [fontsLoaded] = useFonts({Typold: require('./assets/Typold-Bold.ttf'),});
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  
  useEffect(() => {
  console.log('📱 Configurando listeners de notificaciones...');

  // 🔹 Listener cuando se recibe una notificación (app en foreground)
  notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
    const titulo = notification.request.content.title || "";
    const cuerpo = notification.request.content.body || "";
    const data = notification.request.content.data || {};
    console.log("📩 Notificación recibida:", titulo, cuerpo, data);

    // Enviar email si es de tipo "Reserva en Sala"
    if (titulo.startsWith("Reserva en Sala")) {
      (async () => {
        try {
          const userEmail = data.usuarioEmail || auth.currentUser?.email || "usuario@ejemplo.com";
          const salaNumero = data.salaNumero || "desconocida";
          const motivo = data.motivo || "Sin motivo especificado";
          const horaInicio = data.horaInicio || "hora no especificada";
          const fecha = data.fecha || "fecha no especificada";

          console.log("Intentando enviar email de recordatorio a:", userEmail);

          const BACKEND_URL = "https://century21.onrender.com/enviar-recordatorio";
          const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioEmail: userEmail, salaNumero, fecha, horaInicio, motivo }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            console.log("✅ Email de recordatorio enviado correctamente.");
          } else {
            console.error("❌ Error al enviar email:", result.error);
          }
        } catch (err) {
          console.error("❌ Error al enviar email:", err);
        }
      })();
    }
  });

  // 🔹 Listener cuando el usuario toca una notificación
  responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Usuario interactuó con la notificación:', response);
    const data = response.notification.request.content.data;

    if (data.type === 'reserva_created') {
      console.log('Navegar a detalles de reserva:', data.reservaId);
      // navigation.navigate('DetalleReserva', { id: data.reservaId });
    } else if (data.type === 'reserva_edited') {
      console.log('Navegar a detalles de reserva editada:', data.reservaId);
    } else if (data.type === 'reserva_deleted') {
      console.log('Reserva eliminada:', data.reservaId);
    }
  });

  // 🔹 Limpieza segura al desmontar
  return () => {
    console.log("🧹 Limpiando listeners de notificaciones...");
    if (notificationListener.current) {
      notificationListener.current.remove();
      notificationListener.current = null;
    }
    if (responseListener.current) {
      responseListener.current.remove();
      responseListener.current = null;
    }
  };
}, []);

  // Detección de usuario eliminado O desactivado
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
            const isEliminado = userData.eliminado ?? false;
            
            console.log("Usuario válido - Rol:", userRole, "- Eliminado:", isEliminado);
            
            // Si el usuario está eliminado, bloquear acceso
            if (isEliminado) {
              console.log("❌ Usuario desactivado - Bloqueando acceso...");
              setRole(null);
              setBlockNavigation(true);
              
              // Cerrar sesión automáticamente
              setTimeout(async () => {
                try {
                  await signOut(auth);
                  console.log("✅ Sesión cerrada - Usuario desactivado");
                } catch (err) {
                  console.error("❌ Error cerrando sesión:", err);
                }
              }, 100);
              
              setLoading(false);
              return;
            }
            
            setRole(userRole);
            setBlockNavigation(false);

            // Listener en tiempo real para detectar cambios en el documento
            unsubscribeFirestore = onSnapshot(
              userDocRef,
              async (docSnapshot) => {
                if (!docSnapshot.exists()) {
                  console.log("❌ USUARIO ELIMINADO COMPLETAMENTE - Cerrando sesión...");
                  setShowDeletedModal(true);
                } else {
                  const updatedData = docSnapshot.data();
                  const isNowEliminado = updatedData.eliminado ?? false;
                  
                  if (isNowEliminado) {
                    console.log("❌ USUARIO DESACTIVADO EN TIEMPO REAL - Cerrando sesión...");
                    setBlockNavigation(true);
                    
                    try {
                      await signOut(auth);
                      console.log("✅ Sesión cerrada - Usuario desactivado en tiempo real");
                    } catch (err) {
                      console.error("❌ Error cerrando sesión:", err);
                    }
                  }
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
    console.log("Usuario confirmó eliminación permanente, cerrando sesión...");
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

      {/* Modal de cuenta eliminada permanentemente */}
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
              Tu cuenta ha sido eliminada permanentemente por un administrador. Serás redirigido al inicio de sesión.
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
