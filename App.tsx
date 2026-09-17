//App.tsx
import { StatusBar } from "expo-status-bar";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, View, Modal, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as SystemUI from 'expo-system-ui';
import Login from "./app/login";
import Home from "./app/home";
import Registro from "./app/registro";
import Sala from "./app/sala";
import Usuarios from "./app/usuarios";
import olvidePassword from "./app/olvidePassword";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { useFonts } from 'expo-font';
import GestionSalas from "./app/gestionSalas";
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from "./app/types/navigation";
import { AuthProvider, useAuth } from "./app/context/authContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AccessScreen from './app/pantallaAcceso';
import UsuariosNuevos from "./app/usuariosNuevos";
import CambiarClaveAcceso from "./app/cambiarClaveAcceso";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";

const navigationRef = createNavigationContainerRef<RootStackParamList>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createStackNavigator<RootStackParamList>();

function AppContent() {
  const {
    user, role, blockNavigation, sessionPending, setSessionPending, loadingAuth,
    showDeletedModal, setShowDeletedModal,
    showDeactivatedModal, setShowDeactivatedModal,
    showPendingModal, setShowPendingModal,
    showRejectedModal, setShowRejectedModal,
    showSessionModal, setShowSessionModal,
  } = useAuth();

  const [fontsLoaded] = useFonts({ Typold: require('./assets/Typold-Bold.ttf') });
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const verificarAcceso = async () => {
      try {
        const access = await AsyncStorage.getItem('appAccessGranted');
        if (access === 'true') {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Error al leer AsyncStorage', error);
      } finally {
        setCheckingAccess(false);
      }
    };
    verificarAcceso();
  }, []);

  useEffect(() => {
    const setupSystemUI = async () => {
      try {
        await SystemUI.setBackgroundColorAsync('#ffffff');
      } catch (error) {
        console.log('⚠️ Error configurando background color:', error);
      }
    };
    setupSystemUI();
  }, []);

  useEffect(() => {
    console.log('📱 Configurando listeners de notificaciones...');

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const titulo = notification.request.content.title || "";
      const data = notification.request.content.data || {};

      if (titulo.startsWith("Reserva en Sala")) {
        (async () => {
          try {
            const userEmail = data.usuarioEmail || auth.currentUser?.email || "usuario@ejemplo.com";
            const salaNumero = data.salaNumero || "desconocida";
            const motivo = data.motivo || "Sin motivo especificado";
            const horaInicio = data.horaInicio || "hora no especificada";
            const fecha = data.fecha || "fecha no especificada";

            const BACKEND_URL = "https://century21-4et6.onrender.com/enviar-recordatorio";
            const response = await fetch(BACKEND_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usuarioEmail: userEmail, salaNumero, fecha, horaInicio, motivo }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
              console.error("❌ Error al enviar email:", result.error);
            }
          } catch (err) {
            console.error("❌ Error al enviar email:", err);
          }
        })();
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!data) return;

      if (data.type === 'reserva_created') {
        console.log('Navegar a detalles de reserva:', data.reservaId);
      } else if (data.type === 'reserva_edited') {
        console.log('Navegar a detalles de reserva editada:', data.reservaId);
      } else if (data.type === 'reserva_deleted') {
        console.log('Reserva eliminada:', data.reservaId);
      }
    });

    return () => {
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

  useEffect(() => {
    const shouldShowAuth = !user || blockNavigation || !role;
    if (shouldShowAuth && navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: hasAccess ? "Login" : "AccessScreen" }],
      });
    }
  }, [user, role, blockNavigation, hasAccess]);

  const handleAccountDeletedConfirm = async () => {
    setShowDeletedModal(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleKeepSession = () => {
    setShowSessionModal(false);
    setSessionPending(false);
  };

  const handleLogoutSession = async () => {
    setShowSessionModal(false);
    setSessionPending(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (checkingAccess) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#C2A34F" />
      </View>
    );
  }

  if (loadingAuth || !fontsLoaded) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <ActivityIndicator size="large" color="#BEAF87" />
    </View>
  );

  const shouldShowAuthScreens = !user || blockNavigation || !role;

  const initialRouteName = !shouldShowAuthScreens
    ? "Home"
    : hasAccess
      ? "Login"
      : "AccessScreen";

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRouteName}>

          {shouldShowAuthScreens ? (
            <>
              <Stack.Screen name="AccessScreen">
                {(props) => <AccessScreen {...props} onAccessGranted={() => setHasAccess(true)} />}
              </Stack.Screen>
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Registro" component={Registro} />
              <Stack.Screen name="OlvidePassword" component={olvidePassword} />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="GestionSalas" component={GestionSalas} />
              <Stack.Screen name="Usuarios" component={Usuarios} />
              <Stack.Screen name="UsuariosNuevos" component={UsuariosNuevos} />
              <Stack.Screen name="Sala" component={Sala} options={{ animation: 'scale_from_center' }} />
              <Stack.Screen name="CambiarClaveAcceso" component={CambiarClaveAcceso} options={{title: "Cambiar Clave de Acceso"}} />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style="dark" />
      </NavigationContainer>

      <Modal transparent visible={showDeletedModal} animationType="fade" onRequestClose={handleAccountDeletedConfirm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>Cuenta Eliminada</Text>
            <Text style={styles.modalMessage}>
              Tu cuenta ha sido eliminada permanentemente por un administrador. Serás redirigido al inicio de sesión.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleAccountDeletedConfirm} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showPendingModal} animationType="fade" onRequestClose={() => setShowPendingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>⏳</Text>
            </View>
            <Text style={styles.modalTitle}>Cuenta Pendiente</Text>
            <Text style={styles.modalMessage}>Tu cuenta todavía no fue aprobada por un administrador.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowPendingModal(false)} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showRejectedModal} animationType="fade" onRequestClose={() => setShowRejectedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🚫</Text>
            </View>
            <Text style={styles.modalTitle}>Solicitud Rechazada</Text>
            <Text style={styles.modalMessage}>
              Tu solicitud de registro fue rechazada. Contactá con el administrador si creés que es un error.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowRejectedModal(false)} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showDeactivatedModal} animationType="fade" onRequestClose={() => setShowDeactivatedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>🚫</Text>
            </View>
            <Text style={styles.modalTitle}>Cuenta Desactivada</Text>
            <Text style={styles.modalMessage}>
              Tu cuenta ha sido desactivada por un administrador. Contactá con el administrador si creés que esto es un error.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowDeactivatedModal(false)} activeOpacity={0.8}>
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showSessionModal} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>📱</Text>
            </View>
            <Text style={styles.modalTitle}>Mantener Sesión</Text>
            <Text style={styles.modalMessage}>
              ¿Deseas mantener tu sesión activa? Podrás acceder sin necesidad de volver a iniciar sesión.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleLogoutSession} activeOpacity={0.8}>
                <Text style={[styles.modalButtonText, { color: "#BEAF87" }]}>Cerrar Sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleKeepSession} activeOpacity={0.8}>
                <Text style={styles.modalButtonText}>Mantener</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.85)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#1c1c1c", padding: 30, borderRadius: 20, width: "85%", maxWidth: 400, alignItems: "center", borderWidth: 2, borderColor: "#BEAF87", shadowColor: "#BEAF87", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  iconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#ff6b6b", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  iconText: { fontSize: 40 },
  modalTitle: { color: "#BEAF87", fontSize: 24, fontWeight: "bold", marginBottom: 15, textAlign: "center", fontFamily: "Typold" },
  modalMessage: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 30, lineHeight: 24, paddingHorizontal: 10, fontFamily: "Typold" },
  buttonContainer: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { backgroundColor: "#BEAF87", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, flex: 1, alignItems: "center", shadowColor: "#BEAF87", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  confirmButton: { backgroundColor: "#BEAF87" },
  cancelButton: { backgroundColor: "#555", borderWidth: 1, borderColor: "#BEAF87" },
  modalButtonText: { color: "#252526", fontSize: 18, fontWeight: "bold", fontFamily: "Typold" },
});