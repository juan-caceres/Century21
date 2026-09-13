import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from "../firebase";


export default function AccessScreen() {
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  
  const navigation = useNavigation<any>();

  const verificarClave = async () => {
    if (!clave.trim()) {
      setMensajeError('Por favor, ingresa una clave.');
      return;
    }

    setCargando(true);
    setMensajeError('');

    try {
      // 1. Apuntamos al documento 'acceso' en la colección 'seguridad'
      const docRef = doc(db, 'seguridad', 'acceso');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const datos = docSnap.data();
        const claveCorrecta = datos.accesoID;

        // 2. Comparamos la clave ingresada con la de Firebase
        if (clave === claveCorrecta) {
          await AsyncStorage.setItem('appAccessGranted', 'true');
          // navigation.replace evita que el usuario vuelva a esta pantalla usando el botón "Atrás"
          navigation.replace('Login'); 
        } else {
          setMensajeError('Clave incorrecta. Intenta nuevamente.');
        }
      } else {
        setMensajeError('Error de configuración: No se encontró la clave en la base de datos.');
      }
    } catch (error) {
      console.error("Error al consultar Firebase:", error);
      setMensajeError('Hubo un problema de conexión. Verifica tu internet.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceso Restringido</Text>
      <Text style={styles.subtitle}>Ingrese la clave de Century 21 Alianza Urbana SA para continuar</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Clave de acceso"
        secureTextEntry={true} // Oculta los caracteres
        value={clave}
        onChangeText={(text) => {
          setClave(text);
          setMensajeError(''); // Limpia el error al escribir
        }}
        editable={!cargando}
      />

      {mensajeError ? <Text style={styles.error}>{mensajeError}</Text> : null}

      <TouchableOpacity 
        style={[styles.button, cargando && styles.buttonDisabled]} 
        onPress={verificarClave}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    color: '#aaa',
    maxWidth: 400,
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    backgroundColor: '#BEAF87', // Dorado típico de C21, ajústalo a tu paleta
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#e0c98f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#d32f2f',
    marginBottom: 15,
    textAlign: 'center',
  },
});