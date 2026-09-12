// app/componentes/gestionGruposModal.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, FlatList, ScrollView, KeyboardAvoidingView, Platform,} from "react-native";
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import Ionicons from "@expo/vector-icons/Ionicons";
import TimePicker from "./TimePicker";
import DatePicker from "./DatePicker";
import { calcularFechaFin, TipoDuracion } from "../utils/recurrencia";

const DIAS = [
  { label: "Lun", labelCompleto: "lunes", valor: 1 },
  { label: "Mar", labelCompleto: "martes", valor: 2 },
  { label: "Mié", labelCompleto: "miércoles", valor: 3 },
  { label: "Jue", labelCompleto: "jueves", valor: 4 },
  { label: "Vie", labelCompleto: "viernes", valor: 5 },
  { label: "Sáb", labelCompleto: "sábado", valor: 6 },
];
const TODOS_LOS_DIAS = DIAS.map(d => d.valor);

const HORA_MIN = 9;
const HORA_MAX = 19;

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const esDomingo = (fechaStr: string): boolean => {
  if (!fechaStr) return false;
  return new Date(fechaStr + 'T00:00:00').getDay() === 0;
};

type ConfirmState = {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  colorConfirmar?: string;
  accion: (() => Promise<void>) | null;
};

export default function GestionGruposModal({ visible, onClose, sala, salaNombre, grupos }: any) {
  const [editId, setEditId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [tipoDuracion, setTipoDuracion] = useState<TipoDuracion>("meses");
  const [valorDuracion, setValorDuracion] = useState("1");
  const [fechaFinManual, setFechaFinManual] = useState("");

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    visible: false, titulo: "", mensaje: "", textoConfirmar: "", accion: null,
  });

  const showMessage = (text: string, type: "success" | "error" = "success", duration = 3000) => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), duration);
  };

  const limpiarForm = () => {
    setEditId(null); setMotivo(""); setHoraInicio(""); setHoraFin("");
    setDiasSemana([]); setFechaInicio(""); setTipoDuracion("meses");
    setValorDuracion("1"); setFechaFinManual("");
  };

  const toggleDia = (valor: number) => {
    setDiasSemana(prev => prev.includes(valor) ? prev.filter(d => d !== valor) : [...prev, valor]);
  };

  // ---- Handlers de fecha con validaciones ----
  const handleFechaInicioChange = (fecha: string) => {
    if (esDomingo(fecha)) {
      showMessage("Los domingos no están disponibles para reservas.", "error");
      return;
    }
    setFechaInicio(fecha);
    if (fechaFinManual && fechaFinManual < fecha) setFechaFinManual("");
  };

  const handleFechaFinManualChange = (fecha: string) => {
    if (esDomingo(fecha)) {
      showMessage("Los domingos no están disponibles para reservas.", "error");
      return;
    }
    if (fechaInicio && fecha < fechaInicio) {
      showMessage("La fecha de fin no puede ser anterior a la de inicio.", "error");
      return;
    }
    setFechaFinManual(fecha);
  };

  // ---- Validación de horarios ----
  const validarHorarios = (): boolean => {
    const sNew = timeToMinutes(horaInicio);
    const eNew = timeToMinutes(horaFin);
    if (sNew < HORA_MIN * 60 || eNew > HORA_MAX * 60) {
      showMessage(`Las reservas deben estar entre ${HORA_MIN}:00 y ${HORA_MAX}:00.`, "error");
      return false;
    }
    if (sNew >= eNew) {
      showMessage("La hora de inicio debe ser menor a la hora de fin.", "error");
      return false;
    }
    return true;
  };

  // ---- Paso 1: validar todo, campo por campo, y armar el resumen ----
  const prepararConfirmacion = () => {
    if (!motivo.trim()) { showMessage("Falta completar el motivo.", "error"); return; }
    if (!horaInicio) { showMessage("Falta seleccionar la hora de inicio.", "error"); return; }
    if (!horaFin) { showMessage("Falta seleccionar la hora de fin.", "error"); return; }
    if (!validarHorarios()) return;
    if (diasSemana.length === 0) { showMessage("Elegí al menos un día de la semana.", "error"); return; }
    if (!fechaInicio) { showMessage("Falta seleccionar la fecha de inicio.", "error"); return; }
    if (esDomingo(fechaInicio)) { showMessage("Los domingos no están disponibles para reservas.", "error"); return; }

    if (tipoDuracion === "fecha" && !fechaFinManual) {
      showMessage("Falta seleccionar la fecha de fin.", "error");
      return;
    }
    if (tipoDuracion !== "fecha" && (!valorDuracion || isNaN(parseInt(valorDuracion)) || parseInt(valorDuracion) <= 0)) {
      showMessage(`Ingresá una cantidad válida de ${tipoDuracion === "semanas" ? "semanas" : "meses"}.`, "error");
      return;
    }

    const fechaFin = calcularFechaFin(fechaInicio, tipoDuracion, parseInt(valorDuracion), fechaFinManual);

    const payload = {
      sala,
      motivo: motivo.trim(),
      horaInicio,
      horaFin,
      diasSemana,
      fechaInicio,
      fechaFin,
      activo: true,
      creadoPor: auth.currentUser?.uid ?? null,
      creadoPorNombre: auth.currentUser?.email ?? null,
      updatedAt: serverTimestamp(),
    };

    const diasTexto = diasSemana.slice().sort((a, b) => a - b)
      .map(d => DIAS.find(x => x.valor === d)?.labelCompleto).join(", ");

    const [ai, mi, di] = fechaInicio.split('-');
    const [af, mf, df] = fechaFin.split('-');

    setConfirm({
      visible: true,
      titulo: "Confirmar reserva recurrente",
      mensaje:
        `Se ${editId ? "actualizará" : "creará"} una reserva recurrente:\n\n` +
        `📌 Motivo: ${motivo.trim()}\n` +
        `🕐 Horario: ${horaInicio} a ${horaFin}\n` +
        `📅 Días: todos los ${diasTexto}\n` +
        `🏢 Sala: ${salaNombre}\n` +
        `➡️ Desde el ${di}-${mi}-${ai} hasta el ${df}-${mf}-${af}`,
      textoConfirmar: "Sí, confirmar",
      accion: async () => {
        try {
          if (editId) {
            await updateDoc(doc(db, "gruposReservas", editId), payload);
            showMessage("Grupo actualizado correctamente.", "success");
          } else {
            await addDoc(collection(db, "gruposReservas"), { ...payload, createdAt: serverTimestamp() });
            showMessage("Grupo creado correctamente.", "success");
          }
          limpiarForm();
        } catch (err) {
          showMessage("No se pudo guardar el grupo.", "error");
        }
      },
    });
  };

  const pedirConfirmacionEliminar = (grupo: any) => {
    setConfirm({
      visible: true,
      titulo: "Eliminar grupo",
      mensaje: `¿Eliminar por completo el grupo "${grupo.motivo}"?\n\nEsta acción no se puede deshacer.`,
      textoConfirmar: "Sí, eliminar",
      colorConfirmar: "#ff6961",
      accion: async () => {
        try {
          await deleteDoc(doc(db, "gruposReservas", grupo.id));
          showMessage("Grupo eliminado correctamente.", "success");
        } catch (err) {
          showMessage("No se pudo eliminar el grupo.", "error");
        }
      },
    });
  };

  const editarGrupo = (grupo: any) => {
    setEditId(grupo.id);
    setMotivo(grupo.motivo);
    setHoraInicio(grupo.horaInicio);
    setHoraFin(grupo.horaFin);
    setDiasSemana(grupo.diasSemana);
    setFechaInicio(grupo.fechaInicio);
    setTipoDuracion("fecha");
    setFechaFinManual(grupo.fechaFin);
  };

  const cerrarConfirm = () => setConfirm(prev => ({ ...prev, visible: false, accion: null }));

  const ejecutarConfirm = async () => {
    if (confirm.accion) await confirm.accion();
    cerrarConfirm();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.overlay}>
            <View style={styles.content}>
              <View style={styles.headerModal}>
                <Text style={styles.title}>Reservas Repetitivas — {salaNombre}</Text>
                <TouchableOpacity onPress={() => { limpiarForm(); onClose(); }} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#BEAF87" />
                </TouchableOpacity>
              </View>

              {feedbackMessage && (
                <View style={[
                  styles.feedbackContainer,
                  { backgroundColor: feedbackMessage.type === "success" ? "#BEAF87" : "#ff6961" }
                ]}>
                  <Text style={styles.feedbackText}>{feedbackMessage.text}</Text>
                </View>
              )}

              <FlatList
                data={grupos}
                keyExtractor={(g) => g.id}
                style={{ maxHeight: 140, marginBottom: 12 }}
                nestedScrollEnabled
                ListEmptyComponent={
                  <View style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
                    <Text style={styles.empty}>No hay grupos activos.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.grupoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.grupoTexto}>{item.motivo}</Text>
                      <Text style={styles.grupoSub}>
                        {item.horaInicio}-{item.horaFin} • {item.diasSemana
                          .slice().sort((a: number, b: number) => a - b)
                          .map((d: number) => DIAS.find(x => x.valor === d)?.label).join(", ")}
                      </Text>
                      <Text style={styles.grupoSub}>{item.fechaInicio} → {item.fechaFin}</Text>
                    </View>
                    <TouchableOpacity onPress={() => editarGrupo(item)} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => pedirConfirmacionEliminar(item)} style={[styles.smallBtn, styles.deleteBtn]}>
                      <Text style={styles.smallBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />

              <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TextInput style={styles.input} placeholder="Motivo" placeholderTextColor="#888" value={motivo} onChangeText={setMotivo} />

                <TimePicker label="Hora inicio" value={horaInicio} onChange={setHoraInicio} />
                <TimePicker label="Hora fin" value={horaFin} onChange={setHoraFin} />
                <Text style={styles.hint}>Horario permitido: {HORA_MIN}:00 a {HORA_MAX}:00</Text>

                <View style={styles.filaEntreLabels}>
                  <Text style={styles.label}>Días de la semana</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity onPress={() => setDiasSemana(TODOS_LOS_DIAS)}>
                      <Text style={styles.linkTexto}>Todos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDiasSemana([])}>
                      <Text style={styles.linkTexto}>Ninguno</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.diasRow}>
                  {DIAS.map(d => (
                    <TouchableOpacity
                      key={d.valor}
                      style={[styles.diaBtn, diasSemana.includes(d.valor) && styles.diaBtnActivo]}
                      onPress={() => toggleDia(d.valor)}
                    >
                      <Text style={[styles.diaBtnTexto, diasSemana.includes(d.valor) && styles.diaBtnTextoActivo]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <DatePicker label="Fecha de inicio" value={fechaInicio} onChange={handleFechaInicioChange} minimumDate={new Date()} />
                <Text style={styles.hint}>Los domingos no están disponibles</Text>

                <Text style={styles.label}>Duración</Text>
                <View style={styles.diasRow}>
                  {[
                    { v: "semanas", l: "Semanas" }, { v: "meses", l: "Meses" },
                    { v: "finDeAnio", l: "Fin de año" }, { v: "fecha", l: "Fecha exacta" },
                  ].map(op => (
                    <TouchableOpacity
                      key={op.v}
                      style={[styles.diaBtn, tipoDuracion === op.v && styles.diaBtnActivo]}
                      onPress={() => setTipoDuracion(op.v as TipoDuracion)}
                    >
                      <Text style={[styles.diaBtnTexto, tipoDuracion === op.v && styles.diaBtnTextoActivo]}>{op.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {(tipoDuracion === "semanas" || tipoDuracion === "meses") && (
                  <TextInput
                    style={styles.input}
                    placeholder={tipoDuracion === "semanas" ? "Cantidad de semanas" : "Cantidad de meses"}
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={valorDuracion}
                    onChangeText={setValorDuracion}
                  />
                )}
                {tipoDuracion === "fecha" && (
                  <DatePicker
                    label="Fecha de fin"
                    value={fechaFinManual}
                    onChange={handleFechaFinManualChange}
                    minimumDate={fechaInicio ? new Date(fechaInicio + 'T00:00:00') : new Date()}
                  />
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.saveBtn} onPress={prepararConfirmacion}>
                    <Text style={styles.saveBtnText}>{editId ? "Actualizar Grupo" : "Crear Grupo"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { limpiarForm(); onClose(); }}>
                    <Text style={styles.cancelBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de confirmación genérico (crear/editar/eliminar), por encima del anterior */}
      <Modal visible={confirm.visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.content, { maxHeight: undefined }]}>
            <Text style={styles.title}>{confirm.titulo}</Text>
            <Text style={styles.resumenTexto}>{confirm.mensaje}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.saveBtn, confirm.colorConfirmar ? { backgroundColor: confirm.colorConfirmar } : null]}
                onPress={ejecutarConfirm}
              >
                <Text style={styles.saveBtnText}>{confirm.textoConfirmar}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={cerrarConfirm}>
                <Text style={styles.cancelBtnText}>Volver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center" },
  content: { backgroundColor: "#1c1c1c", padding: 20, borderRadius: 12, width: "90%", maxWidth: 500, maxHeight: "88%" },
  headerModal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  closeBtn: { padding: 4 },
  title: { color: "#BEAF87", fontSize: 18, fontWeight: "bold", flex: 1 },
  empty: { color: "#888", textAlign: "center", lineHeight: 20 },
  hint: { color: "#888", fontSize: 12, marginTop: -4, marginBottom: 10 },
  feedbackContainer: { padding: 10, borderRadius: 8, marginBottom: 10 },
  feedbackText: { color: "#000", fontWeight: "bold", textAlign: "center" },
  grupoRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#2e2e2e", padding: 8, borderRadius: 6, marginBottom: 6 },
  grupoTexto: { color: "#fff", fontWeight: "bold" },
  grupoSub: { color: "#aaa", fontSize: 12 },
  smallBtn: { backgroundColor: "#BEAF87", paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, marginLeft: 6 },
  deleteBtn: { backgroundColor: "#ff6961" },
  smallBtnText: { color: "#000", fontWeight: "bold", fontSize: 12 },
  input: { backgroundColor: "#1e1e1e", borderColor: "#BEAF87", borderWidth: 1, borderRadius: 8, color: "#fff", padding: 10, marginBottom: 10 },
  label: { color: "#BEAF87", fontWeight: "600", marginBottom: 6 },
  filaEntreLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  linkTexto: { color: "#BEAF87", fontSize: 12, fontWeight: "600", textDecorationLine: "underline" },
  diasRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  diaBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: "#BEAF87" },
  diaBtnActivo: { backgroundColor: "#BEAF87" },
  diaBtnTexto: { color: "#BEAF87", fontWeight: "600" },
  diaBtnTextoActivo: { color: "#000" },
  buttonRow: { marginTop: 8 },
  saveBtn: { backgroundColor: "#BEAF87", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 8 },
  saveBtnText: { color: "#000", fontWeight: "bold" },
  cancelBtn: { padding: 12, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#BEAF87" },
  cancelBtnText: { color: "#BEAF87", fontWeight: "bold" },
  resumenTexto: { color: "#fff", fontSize: 14, lineHeight: 22, marginBottom: 16 },
});