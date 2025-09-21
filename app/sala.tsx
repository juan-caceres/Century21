// app/sala.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Modal,
  TextInput, FlatList
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import Calendario from "./componentes/calendario";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection, addDoc, query, where, getDocs,
  serverTimestamp, deleteDoc, doc, updateDoc, getDoc
} from "firebase/firestore";

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

const MAX_SALAS = 7; // ajustar si cambian la cantidad de salas

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
      Alert.alert("Error", "No se pudo cerrar sesión.");
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
      Alert.alert("Error", "No se pudieron cargar las reservas.");
    } finally {
      setLoadingReservas(false);
    }
  };

  // 🔹 Chequea solapamiento en Firestore en tiempo real
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

const handleCreateOrUpdateReserva = async () => {
  if (!horaInicio || !horaFin || !motivo.trim()) {
    Alert.alert("Error", "Completa todos los campos.");
    return;
  }
  if (!validarFormatoHora(horaInicio) || !validarFormatoHora(horaFin)) {
    Alert.alert("Error", "Formato de hora incorrecto. Usa HH:MM.");
    return;
  }
  const sNew = timeToMinutes(horaInicio);
  const eNew = timeToMinutes(horaFin);
  if (sNew >= eNew) {
    Alert.alert("Error", "La hora de inicio debe ser menor que la de fin.");
    return;
  }
  if (!selectedDay) {
    Alert.alert("Error", "Selecciona una fecha.");
    return;
  }

  // 🔹 Validar solapamiento en Firestore
  const solapa = await existeSolapamientoEnFirestore(
    selectedDay, numero, horaInicio, horaFin, editingReservaId ?? undefined
  );
  if (solapa) {
    Alert.alert("Horario ocupado", "Ya existe una reserva en ese rango.");
    return;
  }

  try {
    const usuarioEmail = auth.currentUser?.email ?? null;
    const usuarioId = auth.currentUser?.uid ?? null;

    console.log("Intentando guardar reserva. UID:", usuarioId, "Email:", usuarioEmail);

    if (!usuarioId) {
      Alert.alert("Error", "No se detectó usuario logueado.");
      return;
    }

    if (editingReservaId) {
      console.log("Actualizando reserva:", editingReservaId);
      await updateDoc(doc(db, "reservas", editingReservaId), {
        horaInicio: normalizeTime(horaInicio),
        horaFin: normalizeTime(horaFin),
        motivo: motivo.trim(),
        usuarioEmail,
        usuarioId,
      });
      Alert.alert("Reserva actualizada", `Sala ${numero} actualizada.`);
    } else {
      console.log("Creando nueva reserva...");
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
      console.log("Reserva creada con ID:", docRef.id);
      Alert.alert("Reserva creada", `Sala ${numero} reservada el ${selectedDay}.`);
    }

    setModalVisible(false);
    setHoraInicio(""); setHoraFin(""); setMotivo(""); setEditingReservaId(null);
    await fetchReservasForDay(selectedDay);

  } catch (err: any) {
    console.error("Error al guardar reserva:", err);
    Alert.alert("Error", "No se pudo guardar la reserva: " + err.message);
  }
};

  const handleEliminarReserva = async (reserva: Reserva) => {
    if (!reserva.id) return;
    if (reserva.usuarioId !== auth.currentUser?.uid) {
      Alert.alert("No permitido", "Solo el creador puede eliminar la reserva.");
      return;
    }
    Alert.alert("Confirmar", "¿Cancelar esta reserva?", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, "reservas", reserva.id!));
            Alert.alert("Reserva cancelada");
            if (selectedDay) await fetchReservasForDay(selectedDay);
          } catch {
            Alert.alert("Error", "No se pudo cancelar.");
          }
        }
      }
    ]);
  };

  const goToSala = (newNum: number) => {
    if (newNum < 1 || newNum > MAX_SALAS) {
      Alert.alert("No existe", "No hay más salas.");
      return;
    }
    navigation.replace("Sala", { numero: newNum });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.navButton}>
            <Text style={styles.navButtonText}>🏠 Home</Text>
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

            {/* Lista de reservas */}
            {loadingReservas ? (
              <Text style={{ color: "#fff" }}>Cargando...</Text>
            ) : reservasDia.length === 0 ? (
              <Text style={{ color: "#fff" }}>No hay reservas.</Text>
            ) : (
              <FlatList
                data={reservasDia}
                keyExtractor={(item) => item.id ?? `${item.horaInicio}-${item.horaFin}`}
                style={{ maxHeight: 140, marginBottom: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.reservaRow}
                    onPress={() => {
                      if (item.usuarioId === auth.currentUser?.uid) {
                        setHoraInicio(item.horaInicio);
                        setHoraFin(item.horaFin);
                        setMotivo(item.motivo);
                        setEditingReservaId(item.id ?? null);
                      } else {
                        Alert.alert("Reserva", `${item.horaInicio} - ${item.horaFin}\n${item.motivo}\n${item.usuarioEmail ?? "Usuario"}`);
                      }
                    }}>
                    <View>
                      <Text style={styles.reservaText}>{item.horaInicio} - {item.horaFin}</Text>
                      <Text style={styles.reservaMotivo}>{item.motivo}</Text>
                      <Text style={styles.reservaUsuario}>{item.usuarioEmail ?? "Usuario"}</Text>
                    </View>
                    {item.usuarioId === auth.currentUser?.uid && (
                      <TouchableOpacity onPress={() => handleEliminarReserva(item)}>
                        <Text style={styles.eliminarText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Formulario */}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    height: 90, paddingHorizontal: 10, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: "#141414", backgroundColor: "#000",
  },
  leftHeader: { flexDirection: "row", alignItems: "center" },
  rightHeader: { flexDirection: "row", alignItems: "center" },
  centerHeader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#d4af37", fontSize: 18, fontWeight: "700" },
  salaMeta: { color: "#fff", fontSize: 11 },
  disabledButton: { opacity: 0.4 },
  logoutButton: { backgroundColor: "#d4af37", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
  logoutText: { color: "#000", fontWeight: "700", fontSize: 14 },
  content: { flex: 1, padding: 20, alignItems: "center" },
  title: { color: "#fff", fontSize: 22, marginBottom: 12, fontWeight: "600" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: "#1c1c1c", padding: 20, borderRadius: 10, width: "90%" },
  modalTitle: { color: "#d4af37", fontSize: 18, marginBottom: 10, textAlign: "center" },
  input: { backgroundColor: "#000", borderColor: "#d4af37", borderWidth: 1, borderRadius: 8, color: "#fff", padding: 10, marginBottom: 12 },
  saveButton: { backgroundColor: "#d4af37", padding: 12, borderRadius: 8, marginTop: 6 },
  saveText: { color: "#000", fontWeight: "700", textAlign: "center" },
  cancelButton: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#d4af37" },
  cancelText: { color: "#d4af37", textAlign: "center" },
  reservaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#2a2a2a" },
  reservaText: { color: "#fff", fontWeight: "700" },
  reservaMotivo: { color: "#ddd", fontSize: 12 },
  reservaUsuario: { color: "#aaa", fontSize: 11 },
  eliminarText: { color: "#ff6961", fontWeight: "700" },
  navButton: { backgroundColor: "#d4af37", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginHorizontal: 6 },
  navButtonText: { color: "#000", fontWeight: "700", fontSize: 14 },
});
