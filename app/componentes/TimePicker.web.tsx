// app/componentes/TimePicker.web.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
};

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label = "",
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <input
        type="time"
        value={value || ''}
        disabled={disabled}
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

export default TimePicker;