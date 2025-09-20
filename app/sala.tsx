// app/sala.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Image, StyleSheet, Alert, Modal,
  TextInput, FlatList
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import Calendario from "./componentes/calendario";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection, addDoc, query, where, getDocs, serverTimestamp,
  deleteDoc, doc, updateDoc, getDoc
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

  // opcional: metadata de la sala si la guardan en Firestore (nombre/capacidad/tv)
  const [salaInfo, setSalaInfo] = useState<any>(null);

  useEffect(() => {
    // cada vez que param "numero" cambie, intento cargar metadata (opcional)
    fetchSalaInfo();
  }, [numero]);

  useEffect(() => {
    if (selectedDay) {
      fetchReservasForDay(selectedDay);
    } else {
      setReservasDia([]);
    }
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
      console.log("Error signOut:", err);
      Alert.alert("Error", "No se pudo cerrar sesión. Intenta de nuevo.");
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

  // Trae reservas de la sala y fecha seleccionada
  const fetchReservasForDay = async (fecha: string) => {
    setLoadingReservas(true);
    try {
      const reservasRef = collection(db, "reservas");
      const q = query(reservasRef, where("sala", "==", numero), where("fecha", "==", fecha));
      const snap = await getDocs(q);
      const arr: Reserva[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      arr.sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
      setReservasDia(arr);
    } catch (err) {
      console.log("Error fetch reservas:", err);
      Alert.alert("Error", "No se pudieron cargar las reservas del día.");
    } finally {
      setLoadingReservas(false);
    }
  };

  const haySolapamientoLocal = (inicio: string, fin: string, excepcionId?: string) => {
    const sNew = timeToMinutes(inicio);
    const eNew = timeToMinutes(fin);
    for (const r of reservasDia) {
      if (excepcionId && r.id === excepcionId) continue;
      const sExist = timeToMinutes(r.horaInicio);
      const eExist = timeToMinutes(r.horaFin);
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
      Alert.alert("Error", "Formato de hora incorrecto. Usa HH:MM (ej. 09:30).");
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

    try {
      // refrescar reservas antes de intentar crear/editar
      await fetchReservasForDay(selectedDay);
      if (haySolapamientoLocal(horaInicio, horaFin, editingReservaId ?? undefined)) {
        Alert.alert("Horario ocupado", "Ya existe una reserva en ese rango para esta sala.");
        return;
      }

      const usuarioEmail = auth.currentUser?.email ?? null;
      const usuarioId = auth.currentUser?.uid ?? null;

      if (editingReservaId) {
        // actualizar
        await updateDoc(doc(db, "reservas", editingReservaId), {
          horaInicio: normalizeTime(horaInicio),
          horaFin: normalizeTime(horaFin),
          motivo: motivo.trim(),
          usuarioEmail,
          usuarioId,
        });
        Alert.alert("Reserva actualizada", `Sala ${numero} actualizada.`);
      } else {
        // crear nueva
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
        Alert.alert("Reserva creada", `Sala ${numero} reservada el ${selectedDay} de ${normalizeTime(horaInicio)} a ${normalizeTime(horaFin)}.`);
      }

      // limpiar y recargar
      setModalVisible(false);
      setHoraInicio("");
      setHoraFin("");
      setMotivo("");
      setEditingReservaId(null);
      setTimeout(() => fetchReservasForDay(selectedDay!), 300);
    } catch (err) {
      console.log("Error creando/actualizando reserva:", err);
      Alert.alert("Error", "No se pudo guardar la reserva. Intenta de nuevo.");
    }
  };

  const handleEliminarReserva = async (reserva: Reserva) => {
    if (!reserva.id) return;
    if (reserva.usuarioId !== auth.currentUser?.uid) {
      Alert.alert("No permitido", "Sólo el usuario que creó la reserva puede eliminarla.");
      return;
    }

    Alert.alert(
      "Confirmar",
      "¿Deseas cancelar esta reserva?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Si, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "reservas", reserva.id!));
              Alert.alert("Reserva cancelada", "La reserva fue cancelada correctamente.");
              fetchReservasForDay(selectedDay!);
            } catch (err) {
              console.log("Error al eliminar:", err);
              Alert.alert("Error", "No se pudo cancelar la reserva.");
            }
          }
        }
      ]
    );
  };

  // navegación entre salas sin apilar pantallas
  const goToSala = (newNum: number) => {
    if (newNum < 1 || newNum > MAX_SALAS) {
      Alert.alert("No existe", "No hay más salas.");
      return;
    }
    navigation.replace("Sala", { numero: newNum });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")} style={styles.iconButton}>
            <Text style={{ fontWeight: "700" }}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => goToSala(numero - 1)}
            style={[styles.iconButton, numero === 1 && styles.disabledButton]}
            disabled={numero === 1}
          >
            <Text style={{ fontWeight: "700" }}>◀</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.centerHeader}>
          <Text style={styles.headerTitle}>{salaInfo?.nombre ? `${salaInfo.nombre}` : `Sala ${numero}`}</Text>
          {salaInfo?.capacidad ? <Text style={styles.salaMeta}>Capacidad: {salaInfo.capacidad}</Text> : null}
          {salaInfo?.tv ? <Text style={styles.salaMeta}>Televisor: Sí</Text> : null}
        </View>

        <View style={styles.rightHeader}>
          <TouchableOpacity onPress={() => goToSala(numero + 1)} style={styles.iconButton}>
            <Text style={{ fontWeight: "700" }}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Estás en {salaInfo?.nombre ?? `Sala ${numero}`}</Text>

        <Calendario
          onDaySelected={(date) => {
            setSelectedDay(date);
            // abrimos modal al seleccionar día
            setModalVisible(true);
          }}
        />
      </View>

      {/* Modal de reserva */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reserva - {selectedDay}</Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.sectionTitle}>Reservas del día</Text>
              <TouchableOpacity onPress={() => selectedDay && fetchReservasForDay(selectedDay)}>
                <Text style={{ color: "#d4af37", fontWeight: "700" }}>Actualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingReservas ? (
              <Text style={{ color: "#fff", marginBottom: 8 }}>Cargando reservas...</Text>
            ) : reservasDia.length === 0 ? (
              <Text style={{ color: "#fff", marginBottom: 8 }}>No hay reservas para este día.</Text>
            ) : (
              <FlatList
                data={reservasDia}
                keyExtractor={(item) => item.id ?? `${item.horaInicio}-${item.horaFin}`}
                style={{ maxHeight: 140, marginBottom: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.reservaRow}
                    onPress={() => {
                      // si sos dueño, abrimos para editar; si no show detalles
                      if (item.usuarioId === auth.currentUser?.uid) {
                        setHoraInicio(item.horaInicio);
                        setHoraFin(item.horaFin);
                        setMotivo(item.motivo);
                        setEditingReservaId(item.id ?? null);
                        // dejamos modal abierto (ya lo está)
                      } else {
                        Alert.alert("Reserva", `${item.horaInicio} - ${item.horaFin}\n${item.motivo}\n${item.usuarioEmail ?? "Usuario"}`);
                      }
                    }}
                  >
                    <View>
                      <Text style={styles.reservaText}>{item.horaInicio} - {item.horaFin}</Text>
                      <Text style={styles.reservaMotivo} numberOfLines={1}>{item.motivo}</Text>
                      <Text style={styles.reservaUsuario}>{item.usuarioEmail ?? "Usuario"}</Text>
                    </View>
                    <View>
                      {item.usuarioId === auth.currentUser?.uid ? (
                        <TouchableOpacity onPress={() => handleEliminarReserva(item)}>
                          <Text style={styles.eliminarText}>Cancelar</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Hora inicio (ej: 10:30)"
              placeholderTextColor="#888"
              value={horaInicio}
              onChangeText={setHoraInicio}
              keyboardType="default"
            />
            <TextInput
              style={styles.input}
              placeholder="Hora fin (ej: 11:30)"
              placeholderTextColor="#888"
              value={horaFin}
              onChangeText={setHoraFin}
              keyboardType="default"
            />
            <TextInput
              style={styles.input}
              placeholder="Motivo"
              placeholderTextColor="#888"
              value={motivo}
              onChangeText={setMotivo}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleCreateOrUpdateReserva}>
              <Text style={styles.saveText}>{editingReservaId ? "Actualizar Reserva" : "Guardar Reserva"}</Text>
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
  centerHeader: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  logo: { width: 120, height: 48 },
  headerTitle: { color: "#d4af37", fontSize: 18, fontWeight: "700" },
  salaMeta: { color: "#fff", fontSize: 11 },
  iconButton: { padding: 8, marginHorizontal: 6, backgroundColor: "#1c1c1c", borderRadius: 6 },
  disabledButton: { opacity: 0.4 },
  logoutButton: { backgroundColor: "#d4af37", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
  logoutText: { color: "#000", fontWeight: "700", fontSize: 14 },
  content: { flex: 1, padding: 20, alignItems: "center" },
  title: { color: "#fff", fontSize: 22, marginBottom: 12, fontWeight: "600" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: "#1c1c1c", padding: 20, borderRadius: 10, width: "90%" },
  modalTitle: { color: "#d4af37", fontSize: 18, marginBottom: 10, textAlign: "center" },
  sectionTitle: { color: "#d4af37", fontSize: 14, marginBottom: 6, fontWeight: "700" },
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
});
