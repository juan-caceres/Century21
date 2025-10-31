// app/sala.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList,KeyboardAvoidingView, ActivityIndicator, Alert, ScrollView, Keyboard } from "react-native";
import { useFonts } from "expo-font";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Calendario from "./componentes/calendario";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, getDoc, orderBy, onSnapshot } from "firebase/firestore";
import { Dimensions, Platform } from "react-native";
import BtnCerrarSesion from "./componentes/btnCerrarSesion";
import TimePicker from "./componentes/TimePicker";
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Notifications from "expo-notifications";
import { RootStackParamList } from "../app/types/navigation";
import { notifyReservaCreated, notifyReservaEdited, notifyReservaDeleted } from "./servicios/notificationService";
import FontAwesome from '@expo/vector-icons/FontAwesome';


type SalaScreenNavigationProp = StackNavigationProp<RootStackParamList, "Sala">;
type SalaScreenRouteProp = RouteProp<RootStackParamList, "Sala">;
type Props = { navigation: SalaScreenNavigationProp; route: SalaScreenRouteProp };

type Reserva = {
  id?: string;
  sala: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  creado?: any;
};

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 380;
const isMediumDevice = width >= 380 && width < 600;

export default function Sala({ navigation, route }: Props) {
  const { numero } = route.params;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");

  const [reservasSemana, setReservasSemana] = useState<Reserva[]>([]);
  const [reservasDia, setReservasDia] = useState<Reserva[]>([]);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [editingReservaId, setEditingReservaId] = useState<string | null>(null);

  const [salaInfo, setSalaInfo] = useState<any>(null);
  const [reservaParaEliminar, setReservaParaEliminar] = useState<Reserva | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{text: string; type: "success" | "error"} | null>(null);

  const [todasLasSalas, setTodasLasSalas] = useState<any[]>([]);
  const [indiceActual, setIndiceActual] = useState<number>(-1);
  const [rolUsuario, setRolUsuario] = useState<string>("user");

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

  // Cargar todas las salas para la navegación
  useEffect(() => {
    const cargarSalas = async () => {
      try {
        const salasRef = collection(db, "salas");
        const q = query(salasRef, orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        const salas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTodasLasSalas(salas);
        
        const idx = salas.findIndex(s => s.id === String(numero));
        setIndiceActual(idx);
      } catch (err) {
        console.log("Error al cargar salas:", err);
      }
    };
    
    cargarSalas();
  }, [numero]);

  // Cargar rol del usuario actual
  useEffect(() => {
    const cargarRol = async () => {
      const rol = await obtenerRolUsuarioActual();
      setRolUsuario(rol);
    };
    cargarRol();
  }, []);

  useEffect(() => {
    fetchSalaInfo();
    const unsubscribe = suscribirReservasSemana();
    return () => { unsubscribe(); }
  }, [numero]);

  useEffect(() => {
    if (!selectedDay) {
      setReservasDia([]);
      return;
    }
    const unsubscribe = suscribirReservasDia(selectedDay);
    return () => unsubscribe();
  }, [selectedDay]);

  //funcion para obtener username del usuario actual
  const obtenerUsernameActual = async (): Promise<string> => {
    try {
      const usuarioId = auth.currentUser?.uid;
      if (!usuarioId) return "Usuario";

      const userDoc = await getDoc(doc(db, "users", usuarioId));
      const userData = userDoc.data();
      return userData?.username || userData?.email || "Usuario";

    } catch (error) {
      console.log("Error al obtener username:", error);
      return "Usuario";
    }
  };

  //funcion para obtener rol del usuario actual
  const obtenerRolUsuarioActual = async (): Promise<string> => {
    try {
      const usuarioId = auth.currentUser?.uid;
      if (!usuarioId) return "user"; // por defecto

      const userDoc = await getDoc(doc(db, "users", usuarioId));
      const userData = userDoc.data();
      console.log("Rol detectado desde sala:", userData?.role);
      return userData?.role || "user"; // valores esperados: "user", "admin", "superuser"
    } catch (error) {
      console.log("Error al obtener rol:", error);
      return "user";
    }
  };


  const fetchSalaInfo = async () => {
    try {
      const docRef = doc(db, "salas", numero);
      const snap = await getDoc(docRef);
      if (snap.exists()) setSalaInfo(snap.data());
      else setSalaInfo(null);
    } catch (err) {
      console.log("No se pudo cargar metadata sala:", err);
    }
  };

  const timeToMinutes = (t: string) => {
    const [hh, mm] = t.split(":").map((x) => parseInt(x, 10));
    return hh * 60 + mm;
  };

  const validarFormatoHora = (t: string) =>
    /^\d{1,2}:\d{2}$/.test(t) &&
    (() => {
      const [h, m] = t.split(":").map((x) => parseInt(x, 10));
      return h >= 0 && h <= 23 && m >= 0 && m <= 59;
    })();

  const normalizeTime = (t: string) => {
    const [h, m] = t.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  const normalizeTimeSafe = (t: any) => {
    if (!t || typeof t !== "string") return "";
    const parts = t.split(":");
    if (parts.length < 2) return t;
    const [h, m] = parts;
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  const suscribirReservasSemana = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaMinima = hoy.toISOString().split('T')[0];
    
    const reservasRef = collection(db, "reservas");

    // Query que trae TODAS las reservas desde hoy en adelante
    const q = query(
      reservasRef,
      where("sala", "==", numero),
      where("fecha", ">=", fechaMinima),
      orderBy("fecha", "asc")
    );

    return onSnapshot(q, (snap) => {
      const todasLasReservas: Reserva[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          horaInicio: normalizeTimeSafe(data.horaInicio),
          horaFin: normalizeTimeSafe(data.horaFin),
        };
      });

      // Ordenar por fecha y hora
      todasLasReservas.sort((a, b) => {
        if (a.fecha !== b.fecha) {
          return a.fecha.localeCompare(b.fecha);
        }
        return timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio);
      });
      
      setReservasSemana(todasLasReservas);
    });
  };

  const suscribirReservasDia = (fecha: string) => {
    const reservasRef = collection(db, "reservas");
    const q = query(reservasRef, where("sala", "==", numero), where("fecha", "==", fecha));

    return onSnapshot(q, (snap) => {
      const arr: Reserva[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          horaInicio: normalizeTimeSafe(data.horaInicio),
          horaFin: normalizeTimeSafe(data.horaFin),
        };
      });

      arr.sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
      setReservasDia(arr);
    });
  };

  // Función para convertir reservas al formato del calendario
  const convertirReservasParaCalendario = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const reservasConvertidas = reservasSemana
      .filter(reserva => {
        const [anio, mes, dia] = reserva.fecha.split('-').map(Number);
        const fechaReserva = new Date(anio, mes - 1, dia);
        fechaReserva.setHours(0, 0, 0, 0);
        return fechaReserva >= hoy;
      })
      .map(reserva => {
        const [anio, mes, dia] = reserva.fecha.split('-').map(Number);
        const [hora, minuto] = reserva.horaInicio.split(':').map(Number);
        const [horaF, minutoF] = reserva.horaFin.split(':').map(Number);
        
        const fechaInicio = new Date(anio, mes - 1, dia, hora, minuto);
        const fechaFin = new Date(anio, mes - 1, dia, horaF, minutoF);

        return {
          id: reserva.id,
          titulo: reserva.motivo,
          inicio: fechaInicio,
          fin: fechaFin,
        };
      });
    
    return reservasConvertidas;
  };

  // Chequeo de que no haya reservas a la misma hora
  const existeSolapamientoEnFirestore = async (
    fecha: string,
    sala: string | number,
    inicio: string,
    fin: string,
    excepcionId?: string
  ) => {
    const reservasRef = collection(db, "reservas");
    const q = query(reservasRef, where("sala", "==", sala), where("fecha", "==", fecha));
    const snap = await getDocs(q);

    const sNew = timeToMinutes(normalizeTime(inicio));
    const eNew = timeToMinutes(normalizeTime(fin));

    for (const d of snap.docs) {
      if (excepcionId && d.id === excepcionId) continue;
      const data = d.data() as any;
      const sExist = timeToMinutes(normalizeTimeSafe(data.horaInicio));
      const eExist = timeToMinutes(normalizeTimeSafe(data.horaFin));
      if (sNew < eExist && sExist < eNew) return true;
    }
    return false;
  };

  //FUNCION PARA MOSTRAR MENSAJE DE EXITO O ERROR 
  const showMessage = (text: string, type: "success" | "error" = "success", duration = 2500) => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), duration);
  };

  //FUNCION PARA CREAR O ACTUALIZAR RESERVA
  const handleCreateOrUpdateReserva = async () => {
    if (!horaInicio || !horaFin || !motivo.trim()) {
      showMessage("Completa todos los campos antes de guardar.", "error");
      return;
    }
    if (!validarFormatoHora(horaInicio) || !validarFormatoHora(horaFin)) {
      showMessage("Formato de hora inválido (ej: 10:30).", "error");
      return;
    }
    const sNew = timeToMinutes(horaInicio);
    const eNew = timeToMinutes(horaFin);

    if (sNew < 9 * 60 || eNew > 19 * 60) {
      showMessage("Las reservas deben estar entre 09:00 y 19:00.", "error");
      return;
    }

    if (sNew >= eNew) {
      showMessage("La hora de inicio debe ser menor a la hora de fin.", "error");
      return;
    }
    if (!selectedDay) return;

    // Verificar si el horario ya pasó
    const [anio, mes, dia] = selectedDay.split('-').map(Number);
    const [hora, minuto] = horaInicio.split(':').map(Number);
    const fechaHoraReserva = new Date(anio, mes - 1, dia, hora, minuto);
    const ahora = new Date();

    if (fechaHoraReserva <= ahora) {
      showMessage("No se pueden crear reservas en horarios pasados.", "error");
      return;
    }

    const solapa = await existeSolapamientoEnFirestore(
      selectedDay, numero, horaInicio, horaFin, editingReservaId ?? undefined
    );
    if (solapa) {
      showMessage("El horario seleccionado ya está ocupado.", "error");
      return;
    }

    try {
      const usuarioEmail = auth.currentUser?.email ?? null;
      const usuarioId = auth.currentUser?.uid ?? null;
      //obtengo datos para la notificacion
      const userName = await obtenerUsernameActual();
      const salaName = salaInfo?.nombre || numero;

      if (!usuarioId || !usuarioEmail) return;

      if (editingReservaId) {
        await updateDoc(doc(db, "reservas", editingReservaId), {
          horaInicio: normalizeTime(horaInicio),
          horaFin: normalizeTime(horaFin),
          motivo: motivo.trim(),
          usuarioEmail,
          usuarioId,
        });
        showMessage("Reserva actualizada correctamente.", "success");

        //notificar a admins/superusers de la edicion de la reserva
        try {
          await notifyReservaEdited(userName, salaName, selectedDay, normalizeTime(horaInicio), normalizeTime(horaFin));
          console.log("✅ Notificación de edición enviada exitosamente");
        } catch (notiError) {
          console.log("Error enviando notificacion de reserva editada:", notiError);
        }

      } else {
  // Solo crear reserva - Firebase Functions automáticamente programa el email
  await addDoc(collection(db, "reservas"), {
    sala: numero,
    fecha: selectedDay,
    horaInicio: normalizeTime(horaInicio),
    horaFin: normalizeTime(horaFin),
    motivo: motivo.trim(),
    usuarioId,
    usuarioEmail,
    creado: serverTimestamp(),
  });
  
  showMessage("Reserva creada correctamente.", "success");
  
  // Programar notificación local
  try {
    const [anio, mes, dia] = selectedDay.split('-').map(Number);
    const [hora, minuto] = normalizeTime(horaInicio).split(':').map(Number);

    // 🔧 CORRECCIÓN: La hora ingresada es hora local de Argentina
    // Crear fecha en hora local primero
    const fechaReservaLocal = new Date(anio, mes - 1, dia, hora, minuto);
    
    // Calcular notificación 1 hora antes (en hora local)
    const fechaNotificacionLocal = new Date(fechaReservaLocal);
    fechaNotificacionLocal.setMinutes(fechaNotificacionLocal.getMinutes() - 60);

    console.log("Fecha reserva local:", fechaReservaLocal.toString());
    console.log("Fecha notificación local:", fechaNotificacionLocal.toString());
    console.log("Ahora:", new Date().toString());

    if (fechaNotificacionLocal > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Reserva en Sala ${salaInfo?.nombre || numero}`,
          body: `Tu reserva por "${motivo.trim()}" es a las ${normalizeTime(horaInicio)}.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            usuarioEmail,
            salaNumero: salaInfo?.nombre || numero,
            motivo: motivo.trim(),
            horaInicio: normalizeTime(horaInicio),
            fecha: selectedDay,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaNotificacionLocal,
        } as Notifications.DateTriggerInput,
      });

      console.log("✅ Notificación local programada para:", fechaNotificacionLocal.toLocaleString());
    } else {
      console.log("⚠️ La hora de notificación ya pasó. No se programó.");
    }
  } catch (notifErr) {
    console.log("❌ Error al programar notificación local:", notifErr);
  }
}

      setHoraInicio("");
      setHoraFin("");
      setMotivo("");
      setEditingReservaId(null);
      
      setModalVisible(false);

    } catch (err: any) {
      console.error("❌ Error guardar reserva:", err);
      showMessage("Error al guardar la reserva.", "error");
    }
  };

  const handleEliminarReserva = async (reserva: Reserva) => {
    if (!reserva.id) return;

    const puedeEliminar = reserva.usuarioId === auth.currentUser?.uid ||
                          rolUsuario === "admin" ||
                          rolUsuario === "superuser";  
    if (!puedeEliminar) {
      showMessage("No tienes permiso para cancelar esta reserva.", "error");
      return;
    }
    
    try {
      const userName = await obtenerUsernameActual();
      const salaName = salaInfo?.nombre || numero;
      
      await deleteDoc(doc(db, "reservas", reserva.id));
            
      showMessage("Reserva cancelada correctamente.", "success");

      console.log("enviando notificacion de reserva eliminada ...");
      try {
        await notifyReservaDeleted(userName, salaName, reserva.fecha, normalizeTime(reserva.horaInicio), normalizeTime(reserva.horaFin));
      } catch (notiError) {
        console.log("Error enviando notificacion de reserva eliminada:", notiError);
      }
      
    } catch (err) {
      console.error("Error al cancelar reserva:", err);
      showMessage("Error al cancelar la reserva.", "error");
    }
  };

  const goToSala = (direccion: 'prev' | 'next') => {
    if (todasLasSalas.length === 0 || indiceActual === -1) return;
    
    let nuevoIndice = indiceActual;
    if (direccion === 'prev') {
      nuevoIndice = indiceActual - 1;
    } else {
      nuevoIndice = indiceActual + 1;
    }
    
    if (nuevoIndice >= 0 && nuevoIndice < todasLasSalas.length) {
      const nuevaSala = todasLasSalas[nuevoIndice];
      const numero = nuevaSala.id;
      navigation.replace("Sala", { numero });
    }
  };

  const convertirAFormatoDDMMYYYY = (fechaISO: string): string => {
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia}-${mes}-${anio}`;
  };

  const handleSeleccionarHorario = async (fecha: Date) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaSeleccionada = new Date(fecha);
    fechaSeleccionada.setHours(0, 0, 0, 0);
    
    if (fechaSeleccionada < hoy) {
      Alert.alert("Fecha inválida", "No se pueden seleccionar días anteriores.");
      return;
    }

    if (fecha.getDay() === 0) {
      Alert.alert("Día no disponible", "Los domingos no están disponibles para reservas.");
      return;
    }

    const diaStr = fecha.toISOString().split('T')[0];
    setSelectedDay(diaStr);
    
    setHoraInicio("");
    setHoraFin("");
    setEditingReservaId(null);
    setMotivo("");
    
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.superiorSalas}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.navButton}>
            <Text style={styles.navButtonText}>
              <FontAwesome name="arrow-left" size={15} color="white" />
              Inicio
            </Text>
          </TouchableOpacity>

        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <TouchableOpacity
              onPress={() => goToSala('prev')}
              style={[styles.navButton, indiceActual <= 0 && styles.disabledButton]}
              disabled={indiceActual <= 0}>
              <Text style={styles.navButtonText}>◀</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.centerHeader}>
            <Text style={styles.headerTitle}>{salaInfo?.nombre ?? "Cargando..."}</Text>
            {salaInfo && (
              <View style={styles.salaDescripcionContainer}>
                <View style={styles.descripcionItem}>
                  <Ionicons name="people" size={14} color="#252526" style={{ marginRight: 4 }} />
                  <Text style={styles.salaDescripcion}>
                    {salaInfo.capacidad ?? "-"} personas
                  </Text>
                </View>
                <View style={styles.descripcionItem}>
                  <Ionicons 
                    name={salaInfo.tv ? "tv" : "tv-outline"} 
                    size={14} 
                    color="#252526" 
                    style={{ marginRight: 4 }} 
                  />
                  <Text style={styles.salaDescripcion}>
                    {salaInfo.tv ? "Con tele" : "Sin tele"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.rightHeader}>
            <TouchableOpacity
              onPress={() => goToSala('next')}
              style={[styles.navButton, indiceActual >= todasLasSalas.length - 1 && styles.disabledButton]}
              disabled={indiceActual >= todasLasSalas.length - 1}>
              <Text style={styles.navButtonText}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Calendario
          reservas={convertirReservasParaCalendario()}
          alSeleccionarHorario={handleSeleccionarHorario}
        />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
         
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reservas {selectedDay ? convertirAFormatoDDMMYYYY(selectedDay) : ''}</Text>

            {feedbackMessage && (
              <View style={[
                styles.feedbackContainer,
                { backgroundColor: feedbackMessage.type === "success" ? "#BEAF87" : "#ff6961" }
              ]}>
                <Text style={{ color: feedbackMessage.type === "success" ? "#ffffffff" : "#252526", textAlign: "center" }}>
                  {feedbackMessage.text}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.navButton, { paddingVertical: 4, paddingHorizontal: 8,
                  opacity: (() => {
                    if (!selectedDay) return 1;
                    const prev = new Date(selectedDay + 'T00:00:00');
                    prev.setDate(prev.getDate() - 1);
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    prev.setHours(0, 0, 0, 0);
                    return prev < hoy ? 0.3 : 1;
                  })()
                }]}
                onPress={() => {
                  if (!selectedDay) return;
                  
                  const prev = new Date(selectedDay + 'T00:00:00');
                  prev.setDate(prev.getDate() - 1);
                  
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  prev.setHours(0, 0, 0, 0);
                  
                  if (prev < hoy) {
                    showMessage("No se pueden seleccionar días anteriores a hoy.", "error");
                    return;
                  }
                  
                  if (prev.getDay() === 0) {
                    prev.setDate(prev.getDate() - 1);
                    prev.setHours(0, 0, 0, 0);
                    
                    if (prev < hoy) {
                      showMessage("No se pueden seleccionar días anteriores a hoy.", "error");
                      return;
                    }
                  }
                  
                  const prevStr = prev.toISOString().split("T")[0];
                  setSelectedDay(prevStr);
                  setEditingReservaId(null);
                  setHoraInicio("");
                  setHoraFin("");
                  setMotivo("");
                }}
              >
                <Text style={styles.navButtonText}>◀ Día anterior</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navButton, { paddingVertical: 4, paddingHorizontal: 8 }]}
                onPress={() => {
                  if (!selectedDay) return;
                  const next = new Date(selectedDay);
                  next.setDate(next.getDate() + 1);
                  
                  if (next.getDay() === 0) {
                    next.setDate(next.getDate() + 1);
                  }
                  
                  const nextStr = next.toISOString().split("T")[0];
                  setSelectedDay(nextStr);
                  setEditingReservaId(null);
                  setHoraInicio("");
                  setHoraFin("");
                  setMotivo("");
                }}
              >
                <Text style={styles.navButtonText}>Día siguiente ▶</Text>
              </TouchableOpacity>
            </View>

            {loadingReservas ? (
              <Text style={{ color: "#252526" }}>Cargando...</Text>
            ) : reservasDia.length === 0 ? (
              <Text style={{ color: "#929292ff" }}>No hay reservas para este día.</Text>
            ) : (
              <FlatList
                data={reservasDia}
                keyExtractor={(item) => item.id ?? `${item.horaInicio}-${item.horaFin}`}
                style={{ maxHeight: 140, marginBottom: 8 }}
                renderItem={({ item }) => (
                  <View style={[styles.reservaRow, { flexDirection: "row" }]}>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => {
                        if (item.usuarioId === auth.currentUser?.uid ||
                            rolUsuario === "admin" ||
                            rolUsuario === "superuser") {
                          setHoraInicio(item.horaInicio);
                          setHoraFin(item.horaFin);
                          setMotivo(item.motivo);
                          setEditingReservaId(item.id ?? null);
                        }
                      }}
                    >
                      <Text style={styles.reservaText}>
                        {item.horaInicio} - {item.horaFin}
                      </Text>
                      <Text style={styles.reservaMotivo}>{item.motivo}</Text>
                      <Text style={styles.reservaUsuario}>
                        {item.usuarioEmail ?? "Usuario"}
                      </Text>
                    </TouchableOpacity>

                    {(item.usuarioId === auth.currentUser?.uid ||
                      rolUsuario === "admin" ||
                      rolUsuario === "superuser") && (
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          flexShrink: 0,
                          marginLeft: 8,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: "#ff6961",
                        }}
                        onPress={() => setReservaParaEliminar(item)}
                      >
                        <Text style={styles.eliminarText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}

            <Modal visible={!!reservaParaEliminar} transparent animationType="fade">
              <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { alignItems: "center" }]}>
                  <Text style={[styles.modalTitle, { marginBottom: 12 }]}>
                    ¿Cancelar esta reserva?
                  </Text>
                  <Text style={{ color: "#fff", marginBottom: 16, textAlign: "center" }}>
                    {reservaParaEliminar?.horaInicio} - {reservaParaEliminar?.horaFin}{"\n"}
                    {reservaParaEliminar?.motivo}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { marginRight: 10 }]}
                      onPress={() => setReservaParaEliminar(null)}
                    >
                      <Text style={styles.cancelText}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={async () => {
                        if (reservaParaEliminar) {
                          await handleEliminarReserva(reservaParaEliminar);
                          setReservaParaEliminar(null);
                        }
                      }}
                    >
                      <Text style={styles.saveText}>Sí, cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
         
            </Modal>

              <View style={styles.formSection}>
                <Text style={{ color: "#929292ff", fontSize: isSmallDevice ? 11 : 12, marginBottom: 10 }}>
                  *tocar reserva para editar
                </Text>
                <Text style={styles.formSectionTitle}>
                  {editingReservaId ? "Editar Reserva" : "Nueva Reserva"}
                </Text>
                
                <TimePicker
                  label="Hora de inicio"
                  value={horaInicio}
                  onChange={setHoraInicio}
                  placeholder="Seleccionar hora de inicio"
                />
                
                <TimePicker
                  label="Hora de fin"
                  value={horaFin}
                  onChange={setHoraFin}
                  placeholder="Seleccionar hora de fin"
                />

                  {/* INPUT TEMPORAL PARA PRUEBAS EN DESKTOP - Borrar después */}
                {/* <Text style={styles.formLabel}>Hora de inicio</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM (ej: 14:30)"
                  placeholderTextColor="#888"
                  value={horaInicio}
                  onChangeText={setHoraInicio}
                  keyboardType="default"
                />*/}

                {/* INPUT TEMPORAL PARA PRUEBAS EN DESKTOP - Borrar después*/}
                {/*<Text style={styles.formLabel}>Hora de fin</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM (ej: 16:00)"
                  placeholderTextColor="#888"
                  value={horaFin}
                  onChangeText={setHoraFin}
                  keyboardType="default"
                /> */}

                <Text style={styles.formLabel}>Motivo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Motivo de la reserva"
                  placeholderTextColor="#888"
                  value={motivo}
                  maxLength={100}
                  onChangeText={setMotivo}
                  multiline={true}
                  numberOfLines={2}
                />

                <Text style={{ color: "#929292ff", fontSize: isSmallDevice ? 11 : 12, marginBottom: 10 }}>
                  *recibirá un email 60 minutos antes de la reserva
                </Text>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={() => {
                      Keyboard.dismiss();
                      handleCreateOrUpdateReserva()
                    }}
                  >
                    <Text style={styles.saveText}>
                      {editingReservaId ? "Actualizar" : "Guardar Reserva"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.cancelButton, { marginTop: 8 }]}
                    onPress={() => {
                      setModalVisible(false);
                      setHoraInicio("");
                      setHoraFin("");
                      setMotivo("");
                      setEditingReservaId(null);
                    }}
                  >
                    <Text style={styles.cancelText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            
          </View>
        </View>

    </KeyboardAvoidingView>
  </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffffff", padding: width > 600 ? 20 : isSmallDevice ? 8 : 12 },
  header: { height: isSmallDevice ? 70 : 80, paddingHorizontal: isSmallDevice ? 6 : 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#ffffffff", backgroundColor: "#ffffffff", marginBottom: isSmallDevice ? 4 : 8 },
  superiorSalas: { height: 40, paddingHorizontal: isSmallDevice ? 6 : 10, flexDirection: "row", alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#ffffffff", backgroundColor: "#ffffffff", marginTop: height > 700 ? 40 : 15, marginBottom: 8 },
  leftHeader: { flexDirection: "row", alignItems: "center" },
  rightHeader: { flexDirection: "row", alignItems: "center" },
  centerHeader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#252526", fontSize: isSmallDevice ? 16 : isMediumDevice ? 17 : 18, fontWeight: "700", textAlign: "center" },
  disabledButton: { opacity: 0.4 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingHorizontal: isSmallDevice ? 6 : 10 },
  content: { flex: 1, padding: isSmallDevice ? 4 : 8, alignItems: "center" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: "#1c1c1c", padding: isSmallDevice ? 16 : 20, borderRadius: 10, width: "90%", maxWidth: 500 },
  modalTitle: { color: "#BEAF87", fontSize: isSmallDevice ? 16 : 18, marginBottom: 10, textAlign: "center" },
  input: { backgroundColor: "#1e1e1e", borderColor: "#BEAF87", borderWidth: 1, borderRadius: 8, color: "#fff", padding: isSmallDevice ? 8 : 10, marginBottom: 10, fontSize: isSmallDevice ? 13 : 14 },
  saveButton: { backgroundColor: "#BEAF87", paddingVertical: isSmallDevice ? 8 : 10, paddingHorizontal: isSmallDevice ? 12 : 16, borderRadius: 8, alignItems: "center" },
  saveText: { color: "#252526", fontWeight: "bold", fontSize: isSmallDevice ? 13 : 14 },
  cancelButton: { backgroundColor: '#252526', paddingVertical: isSmallDevice ? 8 : 10, paddingHorizontal: isSmallDevice ? 12 : 16, borderRadius: 8, borderWidth: 1, borderColor: "#BEAF87" },
  cancelText: { color: "#BEAF87", textAlign: "center", fontSize: isSmallDevice ? 13 : 14 },
  reservaRow: { padding: isSmallDevice ? 6 : 8, marginBottom: 6, borderRadius: 6, backgroundColor: "#2e2e2e" },
  reservaText: { color: "#BEAF87", fontWeight: "bold", fontSize: isSmallDevice ? 13 : 14 },
  reservaMotivo: { color: "#fff", fontSize: isSmallDevice ? 12 : 13 },
  reservaUsuario: { color: "#ccc", fontSize: isSmallDevice ? 11 : 12 },
  eliminarText: { color: "#ff6961", fontWeight: "700", fontSize: isSmallDevice ? 12 : 13 },
  navButton: { backgroundColor: "#BEAF87", paddingVertical: isSmallDevice ? 6 : 8, paddingHorizontal: isSmallDevice ? 10 : 14, borderRadius: 8, marginHorizontal: isSmallDevice ? 4 : 6 },
  navButtonText: { color: "#ffffffff", fontWeight: "700", fontSize: isSmallDevice ? 12 : 14 },
  feedbackContainer: { padding: isSmallDevice ? 6 : 8, borderRadius: 6, marginBottom: 8 },
  formSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  formSectionTitle: { color: '#BEAF87', fontSize: isSmallDevice ? 14 : 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  formLabel: { color: '#BEAF87', fontSize: isSmallDevice ? 14 : 16, fontWeight: '600', marginBottom: 12, textAlign: 'left' },
  buttonContainer: { marginTop: 10 },
  salaDescripcionContainer: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  descripcionItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 6 },
  salaDescripcion: { color: "#252526", fontSize: isSmallDevice ? 12 : 14 },
});