import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "./app/login";
import Home from "./app/home";
import Registro from "./app/registro";
import Sala from "./app/sala";
import Usuarios from "./app/usuarios";
import olvidePassword from "./app/olvidePassword";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import React, { useEffect, useState, createContext, useContext } from "react";
import { ActivityIndicator, View } from "react-native";
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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      setUser(usuario);

      if (usuario) {
        // traer el rol desde Firestore
        const userDoc = await getDoc(doc(db, "users", usuario.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role?.toLowerCase() ?? null);
        } else {
          setRole(null);
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
      <ActivityIndicator size="large" color="#d4af37" />
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