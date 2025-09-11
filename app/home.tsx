import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  Button, 
  Modal, 
  FlatList, 
  Alert, 
  Platform 
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Calendar from "expo-calendar";

const salasDisponibles = ["Sala 1", "Sala 2", "Sala 3", "Sala 4"];

export default function ReservarSala() {
  const [modalVisible, setModalVisible] = useState(false);
  const [salaSeleccionada, setSalaSeleccionada] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [reservas, setReservas] = useState<any[]>([]);

  // ✅ Pedir permisos de calendario al iniciar
  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === "granted" && Platform.OS === "ios") {
        await Calendar.requestRemindersPermissionsAsync();
      }
    })();
  }, []);

  // ✅ Seleccionar sala
  const seleccionarSala = (sala: string) => {
    setSalaSeleccionada(sala);
    setModalVisible(true);
  };

  // ✅ Manejar selección de fecha/hora
  const onChangeFecha = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false); // cerrar el diálogo SOLO en Android
    }
    if (selectedDate) {
      setFecha(selectedDate);
    }
  };

  // ✅ Confirmar reserva
  const reservar = async () => {
    if (!salaSeleccionada) return;

    const conflicto = reservas.find(
      r => r.sala === salaSeleccionada && r.fecha.toDateString() === fecha.toDateString()
    );

    if (conflicto) {
      Alert.alert("Error", "La sala ya está reservada para esta fecha");
      return;
    }

    const nuevaReserva = { sala: salaSeleccionada, fecha };
    setReservas([...reservas, nuevaReserva]);
    setModalVisible(false);

    Alert.alert("Éxito", `Reservaste ${salaSeleccionada} para ${fecha.toLocaleString()}`);

    // ✅ Crear evento en calendario
    const calendars = await Calendar.getCalendarsAsync();
    const defaultCalendar = calendars.find(cal => cal.allowsModifications);

    if (defaultCalendar) {
      await Calendar.createEventAsync(defaultCalendar.id, {
        title: `Reserva ${salaSeleccionada}`,
        startDate: fecha,
        endDate: new Date(fecha.getTime() + 60 * 60 * 1000), // +1 hora
        location: "Oficina",
      });
      console.log("Evento agregado al calendario ✅");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Reservar Sala</Text>

      <FlatList
        data={salasDisponibles}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 5 }}>
            <Button title={`Reservar ${item}`} onPress={() => seleccionarSala(item)} />
          </View>
        )}
      />

      {/* Modal de reserva */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ margin: 20, backgroundColor: "white", padding: 20, borderRadius: 10 }}>
            <Text style={{ fontSize: 20, marginBottom: 20 }}>Selecciona fecha y hora</Text>
            
            <Button title="Elegir fecha y hora" onPress={() => setShowPicker(true)} />

            {showPicker && (
              <DateTimePicker
                value={fecha}
                mode="datetime"
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onChangeFecha}
              />
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} />
              <Button title="Reservar" onPress={reservar} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
