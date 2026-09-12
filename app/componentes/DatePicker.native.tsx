import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  minimumDate?: Date;
};

const formatearISO = (d: Date): string => {
  const anio = d.getFullYear();
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const dia = d.getDate().toString().padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const formatearParaMostrar = (d: Date): string => {
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
};

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  label = "",
  disabled = false,
  minimumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [displayDate, setDisplayDate] = useState('');

  useEffect(() => {
    if (value && value !== '') {
      const [anio, mes, dia] = value.split('-').map(Number);
      const newDate = new Date(anio, mes - 1, dia);
      setDate(newDate);
      setDisplayDate(formatearParaMostrar(newDate));
    }
  }, [value]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate && event.type !== 'dismissed') {
      setDate(selectedDate);
      setDisplayDate(formatearParaMostrar(selectedDate));
      onChange(formatearISO(selectedDate));
    }
  };

  const showDatePicker = () => {
    if (!disabled) setShowPicker(true);
  };

  const confirmIOS = () => {
    setDisplayDate(formatearParaMostrar(date));
    onChange(formatearISO(date));
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={showDatePicker}
        disabled={disabled}
      >
        <Text style={[styles.inputText, !displayDate && styles.placeholderText]}>
          {displayDate || placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.cancelButton}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Seleccionar fecha</Text>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={styles.confirmButton}>Confirmar</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.iosPicker}
                textColor="#BEAF87"
                minimumDate={minimumDate}
                locale="es-ES"
              />
            </View>
          </View>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={minimumDate}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  label: { color: '#BEAF87', fontSize: 14, marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: '#1e1e1e', borderColor: '#BEAF87', borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputDisabled: { opacity: 0.6 },
  inputText: { color: '#fff', fontSize: 16 },
  placeholderText: { color: '#888' },
  calendarIcon: { fontSize: 18 },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#1c1c1c', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#BEAF87', fontSize: 18, fontWeight: '600' },
  cancelButton: { color: '#ff6961', fontSize: 16 },
  confirmButton: { color: '#BEAF87', fontSize: 16, fontWeight: '600' },
  iosPicker: { backgroundColor: '#1c1c1c', height: 200 },
});

export default DatePicker;