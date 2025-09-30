//app/sala.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList, ActivityIndicator, Alert } from "react-native";
import { useFonts } from "expo-font";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import Calendario from "./componentes/calendario";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, getDoc, orderBy,onSnapshot } from "firebase/firestore";
import { Dimensions } from "react-native";
import BtnCerrarSesion from "./componentes/btnCerrarSesion";
import TimePicker from "./componentes/TimePicker";

type SalaScreenNavigationProp = StackNavigationProp<RootStackParamList, "Sala">;
type SalaScreenRouteProp = RouteProp<RootStackParamList, "Sala">;
type Props = { navigation: SalaScreenNavigationProp; route: SalaScreenRouteProp };

type Reserva = {
  id?: string;
  sala: string; 
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  motivo: string;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  creado?: any;
};

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

  // Estados para navegación entre salas
  const [todasLasSalas, setTodasLasSalas] = useState<any[]>([]);
  const [indiceActual, setIndiceActual] = useState<number>(-1);

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
  
  // Cargar todas las salas para la navegación
  useEffect(() => {
    const cargarSalas = async () => {
      try {
        const salasRef = collection(db, "salas");
        const q = query(salasRef, orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        const salas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTodasLasSalas(salas);
        
        // Encontrar el índice de la sala actual
        const idx = salas.findIndex(s => s.id === numero);
        setIndiceActual(idx);
      } catch (err) {
        console.log("Error al cargar salas:", err);
      }
    };
    
    cargarSalas();
  }, [numero]);

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("Login");
    } catch (err: any) {
      console.log("Error cierre sesión:", err);
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

  const obtenerFechasSemana = () => {
    const hoy = new Date();
    const diaDeLaSemana = hoy.getDay();
    const diasParaRestar = diaDeLaSemana === 0 ? 6 : diaDeLaSemana - 1;
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - diasParaRestar);
    
    const fechas = [];
    for (let i = 0; i < 6; i++) { // Solo lunes a sábado
      const fecha = new Date(inicioSemana);
      fecha.setDate(inicioSemana.getDate() + i);
      fechas.push(fecha.toISOString().split('T')[0]);
    }
    return fechas;
  };

  const suscribirReservasSemana = () => {
    const fechasSemana = obtenerFechasSemana();
    const reservasRef = collection(db, "reservas");

    const q = query(
      reservasRef,
      where("sala", "==", numero),
      where("fecha", "in", fechasSemana)
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

      todasLasReservas.sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
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
    return reservasSemana.map(reserva => ({
      id: reserva.id,
      titulo: reserva.motivo,
      inicio: new Date(`${reserva.fecha}T${reserva.horaInicio}:00`),
      fin: new Date(`${reserva.fecha}T${reserva.horaFin}:00`),
    }));
  };

  // Chequeo de que no haya reservas a la misma hora
  const existeSolapamientoEnFirestore = async (
    fecha: string,
    sala: string,
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

  const showMessage = (text: string, type: "success" | "error" = "success", duration = 2500) => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), duration);
  };

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

    // límite de 9 a 19
    if (sNew < 9 * 60 || eNew > 19 * 60) {
      showMessage("Las reservas deben estar entre 09:00 y 19:00.", "error");
      return;
    }

    if (sNew >= eNew) {
      showMessage("La hora de inicio debe ser menor a la hora de fin.", "error");
      return;
    }
    if (!selectedDay) return;

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

      if (!usuarioId) return;

      if (editingReservaId) {
        await updateDoc(doc(db, "reservas", editingReservaId), {
          horaInicio: normalizeTime(horaInicio),
          horaFin: normalizeTime(horaFin),
          motivo: motivo.trim(),
          usuarioEmail,
          usuarioId,
        });
        showMessage("Reserva actualizada correctamente.", "success");
      } else {
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
      }

      setHoraInicio(""); 
      setHoraFin(""); 
      setMotivo(""); 
      setEditingReservaId(null);
     
      
      setModalVisible(false);

    } catch (err: any) {
      console.error("Error guardar reserva:", err);
    }
  };

  const handleEliminarReserva = async (reserva: Reserva) => {
    if (!reserva.id || reserva.usuarioId !== auth.currentUser?.uid) return;
    try {
      await deleteDoc(doc(db, "reservas", reserva.id));
      showMessage("Reserva cancelada correctamente.", "success");
      
     
    } catch (err) {
      showMessage("Error al cancelar la reserva.", "error");
    }
  };

  // Para navegar entre salas usando índices
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
      navigation.replace("Sala", { numero: nuevaSala.id });
    }
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

    const diaStr = fecha.toISOString().split("T")[0];
    setSelectedDay(diaStr);
    
  
    
    setHoraInicio("");
    setHoraFin("");
    
    setEditingReservaId(null);
    setMotivo("");
    
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header (botones y titulos)*/}
      <View style={styles.superiorSalas}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.navButton}>
            <Text style={styles.navButtonText}>🏠 Inicio</Text>
          </TouchableOpacity>

          <BtnCerrarSesion />
        </View>
      </View>

      {/* Calendario */}
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
            {/*{salaInfo?.capacidad && <Text style={styles.salaMeta}>Capacidad: {salaInfo.capacidad}</Text>}
            {salaInfo?.tv && <Text style={styles.salaMeta}>Televisor: Sí</Text>}*/}
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

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reserva - {selectedDay}</Text>

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
                style={[styles.navButton, { paddingVertical: 4, paddingHorizontal: 8 }]}
                onPress={() => {
                  if (!selectedDay) return;
                  const prev = new Date(selectedDay);
                  prev.setDate(prev.getDate() - 1);
                  
                  // Saltar domingo
                  if (prev.getDay() === 0) {
                    prev.setDate(prev.getDate() - 1);
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
                  
                  // Saltar domingo
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

            {/* Lista de reservas */}
            {loadingReservas ? (
              <Text style={{ color: "#252526" }}>Cargando...</Text>
            ) : reservasDia.length === 0 ? (
              <Text style={{ color: "#252526" }}>No hay reservas para este día.</Text>
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
                        if (item.usuarioId === auth.currentUser?.uid) {
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

                    {item.usuarioId === auth.currentUser?.uid && (
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
              
              <TextInput
                style={styles.input}
                placeholder="Motivo de la reserva"
                placeholderTextColor="#888"
                value={motivo}
                onChangeText={setMotivo}
                multiline={true}
                numberOfLines={2}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={handleCreateOrUpdateReserva}
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
      </Modal>
    </View>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffffff",
    padding: width > 600 ? 40 : 20, 
  },
  header: {
    height: 90, paddingHorizontal: 10, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: "#ffffffff", backgroundColor: "#ffffffff",
  },
  superiorSalas:{
    height: 40, paddingHorizontal: 10, flexDirection: "row",
    alignItems: "center", justifyContent:"center",
    borderBottomWidth: 1, borderBottomColor: "#ffffffff", backgroundColor: "#ffffffff",
    marginTop: height > 700 ? 50 : 20
  },
  leftHeader: { flexDirection: "row", alignItems: "center" },
  rightHeader: { flexDirection: "row", alignItems: "center" },
  centerHeader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#252526", fontSize: 18, fontWeight: "700" },
  salaMeta: { color: "#252526", fontSize: 11 },
  disabledButton: { opacity: 0.4 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between", 
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
  },
  content: { flex: 1, padding: 20, alignItems: "center" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: "#1c1c1c", padding: 20, borderRadius: 10, width: "90%" },
  modalTitle: { color: "#BEAF87", fontSize: 18, marginBottom: 10, textAlign: "center" },
  input: { backgroundColor: "#1e1e1e", borderColor: "#BEAF87", borderWidth: 1, borderRadius: 8, color: "#fff", padding: 10, marginBottom: 10 },
  saveButton: { backgroundColor: "#BEAF87", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: "center" },
  saveText: { color: "#252526", fontWeight: "bold" },
  cancelButton: { backgroundColor: '#252526', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#BEAF87" },
  cancelText: { color: "#BEAF87", textAlign: "center" },
  reservaRow: { padding: 8, marginBottom: 6, borderRadius: 6, backgroundColor: "#2e2e2e" },
  reservaText: { color: "#BEAF87", fontWeight: "bold" },
  reservaMotivo: { color: "#fff" },
  reservaUsuario: { color: "#ccc", fontSize: 12 },
  eliminarText: { color: "#ff6961", fontWeight: "700" },
  navButton: { backgroundColor: "#BEAF87", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginHorizontal: 6 },
  navButtonText: { color: "#ffffffff", fontWeight: "700", fontSize: 14 },
  feedbackContainer: { padding: 8, borderRadius: 6, marginBottom: 8 },
  formSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  formSectionTitle: { color: '#BEAF87', fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  buttonContainer: { marginTop: 10 },
});
