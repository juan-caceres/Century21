import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import Calendario from "./componentes/calendario";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";

type SalaScreenNavigationProp = StackNavigationProp<RootStackParamList, "Sala">;
type SalaScreenRouteProp = RouteProp<RootStackParamList, "Sala">;
type Props = { navigation: SalaScreenNavigationProp; route: SalaScreenRouteProp };

type Reserva = {
  id?: string;
  sala: number;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
  motivo: string;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  creado?: any;
};

const MAX_SALAS = 7; // ajustar dependiendo de la cantidad de salas

export default function Sala({ navigation, route }: Props) {
  const { numero } = route.params;
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");

  const [reservasDia, setReservasDia] = useState<Reserva[]>([]);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [editingReservaId, setEditingReservaId] = useState<string | null>(null);

  const [salaInfo, setSalaInfo] = useState<any>(null);
  const [reservaParaEliminar, setReservaParaEliminar] = useState<Reserva | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{text: string; type: "success" | "error"} | null>(null);

  useEffect(() => {
    fetchSalaInfo();
  }, [numero]);

  useEffect(() => {
    if (selectedDay) fetchReservasForDay(selectedDay);
    else setReservasDia([]);
  }, [selectedDay]);

  const fetchSalaInfo = async () => {
    try {
      const docRef = doc(db, "salas", `${numero}`);
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

  const fetchReservasForDay = async (fecha: string) => {
    setLoadingReservas(true);
    try {
      const reservasRef = collection(db, "reservas");
      const q = query(reservasRef, where("sala", "==", numero), where("fecha", "==", fecha));
      const snap = await getDocs(q);

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
    } catch (err) {
      console.log("Error cargar reservas:", err);
    } finally {
      setLoadingReservas(false);
    }
  };

  //  Chequeo de que no haya reservas a la misma hora
  const existeSolapamientoEnFirestore = async (
    fecha: string,
    sala: number,
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
      const docRef = await addDoc(collection(db, "reservas"), {
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

    setHoraInicio(""); setHoraFin(""); setMotivo(""); setEditingReservaId(null);
    if (selectedDay) await fetchReservasForDay(selectedDay);

  } catch (err: any) {
    console.error("Error guardar reserva:", err);
  }
};

const handleEliminarReserva = async (reserva: Reserva) => {
  if (!reserva.id || reserva.usuarioId !== auth.currentUser?.uid) return;
  try {
    await deleteDoc(doc(db, "reservas", reserva.id));
    showMessage("Reserva cancelada correctamente.", "success");
    if (selectedDay) await fetchReservasForDay(selectedDay);
  } catch (err) {
    showMessage("Error al cancelar la reserva.", "error");
  }
};

const goToSala = (newNum: number) => {
  if (newNum < 1 || newNum > MAX_SALAS) return;
  navigation.replace("Sala", { numero: newNum });
};

return (
  <View style={styles.container}>
    {/* Header (botones y titulos)*/}
    <View style={styles.header}>
      <View style={styles.leftHeader}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.navButton}>
          <Text style={styles.navButtonText}>🏠 Pantalla Principal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => goToSala(numero - 1)}
          style={[styles.navButton, numero === 1 && styles.disabledButton]}
          disabled={numero === 1}>
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.centerHeader}>
        <Text style={styles.headerTitle}>{salaInfo?.nombre ?? `Sala ${numero}`}</Text>
        {salaInfo?.capacidad && <Text style={styles.salaMeta}>Capacidad: {salaInfo.capacidad}</Text>}
        {salaInfo?.tv && <Text style={styles.salaMeta}>Televisor: Sí</Text>}
      </View>
      <View style={styles.rightHeader}>
        <TouchableOpacity
          onPress={() => goToSala(numero + 1)}
          style={[styles.navButton, numero === MAX_SALAS && styles.disabledButton]}
          disabled={numero === MAX_SALAS}>
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Calendario */}
    <View style={styles.content}>
      <Text style={styles.title}>Estás en {salaInfo?.nombre ?? `Sala ${numero}`}</Text>
      <Calendario
        onDaySelected={async (date) => {
          setSelectedDay(date);
          await fetchReservasForDay(date);
          setModalVisible(true);
        }}
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
          const prevStr = prev.toISOString().split("T")[0];
          setSelectedDay(prevStr);
          setEditingReservaId(null);
          setHoraInicio("");
          setHoraFin("");
          setMotivo("");
          fetchReservasForDay(prevStr);
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
          const nextStr = next.toISOString().split("T")[0];
          setSelectedDay(nextStr);
          setEditingReservaId(null);
          setHoraInicio("");
          setHoraFin("");
          setMotivo("");
          fetchReservasForDay(nextStr);
        }}
      >
        <Text style={styles.navButtonText}>Día siguiente ▶</Text>
      </TouchableOpacity>
    </View>

          {/* Lista de reservas */}
          {loadingReservas ? (
            <Text style={{ color: "#252526" }}>Cargando...</Text>
          ) : reservasDia.length === 0 ? (
            <Text style={{ color: "#252526" }}>No hay reservas.</Text>
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

                  {/* Botón cancelar */}
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
                      <Text style={styles.eliminarText}>Cancelar Reserva</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}

          {/* Modal confirmación eliminar */}
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

          {/* Formulario para agregar reserva*/}
          <TextInput
            style={styles.input}
            placeholder="Hora inicio (ej: 10:30)"
            placeholderTextColor="#888"
            value={horaInicio}
            onChangeText={setHoraInicio}
          />
          <TextInput
            style={styles.input}
            placeholder="Hora fin (ej: 11:30)"
            placeholderTextColor="#888"
            value={horaFin}
            onChangeText={setHoraFin}
          />
          <TextInput
            style={styles.input}
            placeholder="Motivo"
            placeholderTextColor="#888"
            value={motivo}
            onChangeText={setMotivo}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleCreateOrUpdateReserva}>
            <Text style={styles.saveText}>{editingReservaId ? "Actualizar" : "Guardar"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { marginTop: 8 }]}
            onPress={() => {
              setModalVisible(false);
              setHoraInicio(""); setHoraFin(""); setMotivo(""); setEditingReservaId(null);
            }}>
            <Text style={styles.cancelText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </View>
)};

// Estilos (siguiendo los colores del logo c21)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffffff" },
  header: {
    height: 90, paddingHorizontal: 10, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: "#ffffffff", backgroundColor: "#ffffffff",
  },
  leftHeader: { flexDirection: "row", alignItems: "center" },
  rightHeader: { flexDirection: "row", alignItems: "center" },
  centerHeader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#BEAF87", fontSize: 18, fontWeight: "700" },
  salaMeta: { color: "#fff", fontSize: 11 },
  disabledButton: { opacity: 0.4 },
  logoutButton: { backgroundColor: "#BEAF87", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
  logoutText: { color: "#ffffffff", fontWeight: "700", fontSize: 14 },
  content: { flex: 1, padding: 20, alignItems: "center" },
  title: { color: "#252526", fontSize: 22, marginBottom: 12, fontWeight: "600" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: "#1c1c1c", padding: 20, borderRadius: 10, width: "90%" },
  modalTitle: { color: "#BEAF87", fontSize: 18, marginBottom: 10, textAlign: "center" },
  input: { backgroundColor: "#ffffffff", borderColor: "#BEAF87", borderWidth: 1, borderRadius: 8, color: "#fff", padding: 10, marginBottom: 12 },
  saveButton: { backgroundColor: "#BEAF87", padding: 12, borderRadius: 8, marginTop: 6 },
  saveText: { color: "#000", fontWeight: "700", textAlign: "center" },
  cancelButton: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#BEAF87" },
  cancelText: { color: "#BEAF87", textAlign: "center" },
  reservaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#2a2a2a" },
  reservaText: { color: "#fff", fontWeight: "700" },
  reservaMotivo: { color: "#ddd", fontSize: 12 },
  reservaUsuario: { color: "#aaa", fontSize: 11 },
  eliminarText: { color: "#ff6961", fontWeight: "700" },
  navButton: { backgroundColor: "#BEAF87", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginHorizontal: 6 },
  navButtonText: { color: "#ffffffff", fontWeight: "700", fontSize: 14 },
  feedbackContainer: { padding: 8, borderRadius: 6, marginBottom: 8,},
});
