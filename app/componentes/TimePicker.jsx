// app/componentes/TimePicker.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Button,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const TimePicker = ({ 
  value, 
  onChange, 
  placeholder = "Seleccionar hora",
  label = "",
  disabled = false 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [displayTime, setDisplayTime] = useState('');

  useEffect(() => {
    if (value && value !== '') {
      // Convertir string HH:MM a Date
      const [hours, minutes] = value.split(':').map(Number);
      const newDate = new Date();
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      setTime(newDate);
      setDisplayTime(value);
    }
  }, [value]);

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedTime && event.type !== 'dismissed') {
      setTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setDisplayTime(timeString);
      onChange(timeString);
    }
  };

  const showTimePicker = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  const confirmIOS = () => {
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    setDisplayTime(timeString);
    onChange(timeString);
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={showTimePicker}
        disabled={disabled}
      >
        <Text style={[
          styles.inputText,
          !displayTime && styles.placeholderText
        ]}>
          {displayTime || placeholder}
        </Text>
        <Text style={styles.clockIcon}>🕐</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.cancelButton}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Seleccionar hora</Text>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={styles.confirmButton}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.iosPicker}
                textColor="#BEAF87"
                is24Hour={true}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            is24Hour={true}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  label: {
    color: '#BEAF87',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderColor: '#BEAF87',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
  placeholderText: {
    color: '#888',
  },
  clockIcon: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1c1c1c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#BEAF87',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    color: '#ff6961',
    fontSize: 16,
  },
  confirmButton: {
    color: '#BEAF87',
    fontSize: 16,
    fontWeight: '600',
  },
  iosPicker: {
    backgroundColor: '#1c1c1c',
    height: 200,
  },
});

export default TimePicker;