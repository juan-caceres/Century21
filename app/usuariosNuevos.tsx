// app/usuariosNuevos.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, ScrollView,} from "react-native";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, updateDoc, doc, DocumentData } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../app/types/navigation";
import { useAuth } from "./context/authContext";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

type UsuariosNuevosScreenNavigationProp = StackNavigationProp<RootStackParamList, "UsuariosNuevos">;
type Props = { navigation: UsuariosNuevosScreenNavigationProp };

type SolicitudUsuario = {
  id: string;
  email: string;
  username: string;
  estado: string;
  createdAt?: any;
};

type Filtro = "pendientes" | "rechazados";

export default function UsuariosNuevos({ navigation }: Props) {
  const { role } = useAuth();
  const [pendientes, setPendientes] = useState<SolicitudUsuario[]>([]);
  const [rechazados, setRechazados] = useState<SolicitudUsuario[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("pendientes");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"aprobar" | "rechazar" | "reactivar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<SolicitudUsuario | null>(null);

  const [message, setMessage] = useState({ text: "", type: "success" as "success" | "error" });

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "success" }), 3000);
  };

  useEffect(() => {
    if (role !== "admin" && role !== "superuser") return;

    const qPendientes = query(collection(db, "users"), where("estado", "==", "pendiente"));
    const unsubPendientes = onSnapshot(qPendientes, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as SolicitudUsuario[];
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPendientes(data);
    });

    const qRechazados = query(collection(db, "users"), where("estado", "==", "rechazado"));
    const unsubRechazados = onSnapshot(qRechazados, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as SolicitudUsuario[];
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setRechazados(data);
    });

    return () => {
      unsubPendientes();
      unsubRechazados();
    };
  }, [role]);

  const formatearFecha = (createdAt: any) => {
    if (!createdAt?.seconds) return "";
    const fecha = new Date(createdAt.seconds * 1000);
    return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const abrirModal = (tipo: "aprobar" | "rechazar" | "reactivar", usuario: SolicitudUsuario) => {
    setModalType(tipo);
    setSeleccionado(usuario);
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setModalType(null);
    setSeleccionado(null);
  };

  const confirmarAccion = async () => {
    if (!seleccionado || !modalType) return;

    try {
      const nuevoEstado =
        modalType === "aprobar" ? "aprobado" :
        modalType === "rechazar" ? "rechazado" :
        "pendiente"; // "reactivar" vuelve a mandar un rechazado a la cola de pendientes

      await updateDoc(doc(db, "users", seleccionado.id), { estado: nuevoEstado });

      showMessage(
        modalType === "aprobar"
          ? "✅ Usuario aprobado correctamente."
          : modalType === "rechazar"
          ? "Usuario rechazado."
          : "Usuario devuelto a pendientes.",
        "success"
      );
    } catch (err) {
      console.log("Error actualizando estado:", err);
      showMessage("No se pudo actualizar el usuario.", "error");
    } finally {
      cerrarModal();
    }
  };

  const getModalContent = () => {
    if (!seleccionado || !modalType) return { title: "", message: "", action: "", color: "" };
    switch (modalType) {
      case "aprobar":
        return {
          title: "Aprobar Usuario",
          message: `¿Aprobar a ${seleccionado.username} (${seleccionado.email})? Podrá iniciar sesión normalmente.`,
          action: "Aprobar",
          color: "#4CAF50",
        };
      case "rechazar":
        return {
          title: "Rechazar Usuario",
          message: `¿Rechazar a ${seleccionado.username} (${seleccionado.email})? No podrá iniciar sesión.`,
          action: "Rechazar",
          color: "#ff6b6b",
        };
      case "reactivar":
        return {
          title: "Volver a Pendientes",
          message: `¿Enviar a ${seleccionado.username} de vuelta a la lista de pendientes para revisarlo de nuevo?`,
          action: "Volver a pendientes",
          color: "#BEAF87",
        };
      default:
        return { title: "", message: "", action: "", color: "" };
    }
  };

  if (role !== "admin" && role !== "superuser") {
    return (
      <View style={styles.container}>
        <Text style={styles.accessDenied}>Acceso denegado</Text>
      </View>
    );
  }

  const modalContent = getModalContent();
  const lista = filtro === "pendientes" ? pendientes : rechazados;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.backButtonText}>
              <FontAwesome name="arrow-left" size={15} color="white" /> Inicio
            </Text>
          </TouchableOpacity>
          <Text style={styles.title}>Usuarios Nuevos</Text>
        </View>

        {message.text !== "" && (
          <View style={[styles.messageContainer, { backgroundColor: message.type === "success" ? "#4CAF50" : "#ff6b6b" }]}>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        )}

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filtro === "pendientes" && styles.filterButtonActive]}
            onPress={() => setFiltro("pendientes")}
          >
            <Ionicons name="time-outline" size={16} color={filtro === "pendientes" ? "#000" : "#BEAF87"} style={{ marginRight: 4 }} />
            <Text style={[styles.filterButtonText, filtro === "pendientes" && styles.filterButtonTextActive]}>
              Pendientes ({pendientes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filtro === "rechazados" && styles.filterButtonActive]}
            onPress={() => setFiltro("rechazados")}
          >
            <Ionicons name="close-circle-outline" size={16} color={filtro === "rechazados" ? "#000" : "#ff6b6b"} style={{ marginRight: 4 }} />
            <Text style={[styles.filterButtonText, filtro === "rechazados" && styles.filterButtonTextActive]}>
              Rechazados ({rechazados.length})
            </Text>
          </TouchableOpacity>
        </View>

        {lista.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name={filtro === "pendientes" ? "checkmark-done-outline" : "close-circle-outline"} size={48} color="#888" />
            <Text style={styles.emptyText}>
              {filtro === "pendientes" ? "No hay usuarios pendientes de aprobación." : "No hay usuarios rechazados."}
            </Text>
          </View>
        ) : (
          lista.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.userInfo}>
                <View style={styles.row}>
                  <Ionicons name="person" size={18} color="#BEAF87" style={{ marginRight: 6 }} />
                  <Text style={styles.username}>@{item.username}</Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="mail" size={16} color="#888" style={{ marginRight: 6 }} />
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                {item.createdAt && (
                  <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={14} color="#888" style={{ marginRight: 6 }} />
                    <Text style={styles.fecha}>Registrado el {formatearFecha(item.createdAt)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                {filtro === "pendientes" ? (
                  <>
                    <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => abrirModal("aprobar", item)}>
                      <Text style={styles.actionButtonText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => abrirModal("rechazar", item)}>
                      <Text style={styles.actionButtonText}>Rechazar</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={[styles.actionButton, styles.reconsiderButton]} onPress={() => abrirModal("reactivar", item)}>
                    <Text style={[styles.actionButtonText, { color: "#252526" }]}>Reconsiderar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
              <Text style={styles.modalMessage}>{modalContent.message}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: modalContent.color }]} onPress={confirmarAccion}>
                  <Text style={[styles.modalButtonText, modalType === "reactivar" && { color: "#252526" }]}>
                    {modalContent.action}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={cerrarModal}>
                  <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", padding: 20, paddingTop: height > 700 ? 70 : 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backButton: { backgroundColor: "#BEAF87", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  backButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  title: { fontSize: 24, fontWeight: "bold", color: "#BEAF87", marginLeft: 18, flex: 1 },
  accessDenied: { fontSize: 20, color: "#ff6b6b", textAlign: "center", marginTop: 50 },
  messageContainer: { padding: 12, borderRadius: 8, marginBottom: 15, alignItems: "center" },
  messageText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  filterContainer: { flexDirection: "row", gap: 8, marginBottom: 15 },
  filterButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#252526", borderWidth: 1, borderColor: "#444", alignItems: "center", flexDirection: "row", justifyContent: "center" },
  filterButtonActive: { backgroundColor: "#BEAF87", borderColor: "#BEAF87" },
  filterButtonText: { color: "#888", fontSize: 13, fontWeight: "600" },
  filterButtonTextActive: { color: "#000", fontWeight: "bold" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 15, color: "#888", textAlign: "center", marginTop: 15, paddingHorizontal: 30 },
  card: { backgroundColor: "#252526", padding: 18, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: "#BEAF87" },
  userInfo: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  username: { fontSize: 17, color: "#BEAF87", fontWeight: "bold" },
  email: { fontSize: 14, color: "#aaa" },
  fecha: { fontSize: 12, color: "#888" },
  actionButtons: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  approveButton: { backgroundColor: "#4CAF50" },
  rejectButton: { backgroundColor: "#ff6b6b" },
  reconsiderButton: { backgroundColor: "#BEAF87" },
  actionButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContent: { backgroundColor: "#1c1c1c", padding: 25, borderRadius: 15, width: "85%", maxWidth: 400, alignItems: "center" },
  modalTitle: { color: "#BEAF87", fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  modalMessage: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 25, lineHeight: 22 },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelModalButton: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#BEAF87" },
  cancelModalButtonText: { color: "#BEAF87", fontWeight: "bold", fontSize: 16 },
});