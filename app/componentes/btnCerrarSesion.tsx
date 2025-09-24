
import React, { useState } from "react";
import { View, StyleSheet, Alert, TouchableOpacity, Text } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigation, NavigationProp } from "@react-navigation/native";

type RootStackParamList = {
  login: undefined;
  // add other routes here if needed
};

export default function btnCerrarSesion() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    const handleLogout = () => {
      Alert.alert(
        "Cerrar Sesión",
        "¿Estás seguro que quieres cerrar sesión?",
        [
          {
            text: "Sí, cerrar sesión",
            style: "destructive",
            onPress: async () => {
              await signOut(auth);
              navigation.navigate("login");
            }
          },
          {
            text: "Cancelar",
            style: "cancel"
          }
        ],
        { cancelable: true }
      );
    };

    return(
        <View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Cerrar Sesión</Text>
                  
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
 logoutButton: { backgroundColor: "#BEAF87", padding: 8, borderRadius: 5 },
  logoutText: { color: "#ffffffff", fontWeight: "bold" },
});