import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "./app/login";
import Home from "./app/home";
import Registro from "./app/registro";
import Sala from "./app/sala";
import olvidePassword from "./app/olvidePassword";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import React, { useEffect, useState, createContext, useContext } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from 'expo-font';

export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  OlvidePassword: undefined;
  Home: undefined;
  Sala: { numero: number };
};

const Stack = createStackNavigator<RootStackParamList>();
const AuthContext = createContext<{ user: any }>({ user: null });
export const useAuth = () => useContext(AuthContext);



export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Typold: require('./assets/Typold-Bold.ttf'),
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
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
    <AuthContext.Provider value={{ user }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="Sala" component={Sala} />
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