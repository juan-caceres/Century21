import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label = "",
  disabled = false,
  minimumDate,
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <input
        type="date"
        value={value || ''}
        disabled={disabled}
        min={minimumDate ? formatearISO(minimumDate) : undefined}
        onChange={(e) => onChange(e.target.value)}
        style={webInputStyle}
      />
    </View>
  );
};

const webInputStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  color: '#fff',
  border: '1px solid #BEAF87',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  width: '100%',
  boxSizing: 'border-box',
  colorScheme: 'dark',
};

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  label: { color: '#BEAF87', fontSize: 14, marginBottom: 5, fontWeight: '600' },
});

export default DatePicker;