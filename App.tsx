//App.tsx
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState, createContext, useContext, useRef } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import Login from "./app/login";
import Home from "./app/home";
import Registro from "./app/registro";
import Sala from "./app/sala";
import Usuarios from "./app/usuarios";
import olvidePassword from "./app/olvidePassword";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { useFonts } from 'expo-font';

import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  OlvidePassword: undefined;
  Home: undefined;
  Sala: { numero: number };
  Usuarios: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const AuthContext = createContext<{
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  role: string | null;
  setRole: React.Dispatch<React.SetStateAction<string | null>>;
}>({
  user: null,
  setUser: () => {},
  role: null,
  setRole: () => {},
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
  const [fontsLoaded] = useFonts({Typold: require('./assets/Typold-Bold.ttf'),});
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);


  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      setUser(usuario);

      if (usuario) {
        try {
          // traer el rol desde Firestore
          const userDoc = await getDoc(doc(db, "users", usuario.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role?.toLowerCase()?.trim() ?? "user";
            console.log("Datos del usuario desde Firestore:", userData);
            console.log("Rol procesado:", userRole);
            setRole(userRole);
          } else {
            console.log("Documento de usuario no existe en Firestore");
            setRole("user"); // rol por defecto si no existe el documento
          }
        } catch (error) {
          console.error("Error al obtener rol del usuario:", error);
          setRole("user");
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return unsub;
  }, []);


  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <ActivityIndicator size="large" color="#BEAF87" />
    </View>
  );


  return (
    <AuthContext.Provider value={{ user, setUser, role, setRole }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="Usuarios" component={Usuarios} />
              <Stack.Screen name="Sala" component={Sala} options={{animation:'fade_from_right',
                transitionSpec:{
                  open: {animation: 'timing', config: {duration: 300}},
                  close: {animation: 'timing', config: {duration: 200}},
                },
              }} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Registro" component={Registro} />
              <Stack.Screen name="OlvidePassword" component={olvidePassword} />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </AuthContext.Provider>

  );
}

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
      lightColor: "#FF231F7C",
    });
  }

  return token;
}
