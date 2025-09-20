import { Calendar, LocaleConfig } from "react-native-calendars";
import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

LocaleConfig.locales["es"] = {
  monthNames: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  monthNamesShort: ["Ene.","Feb.","Mar.","Abr","May","Jun","Jul.","Ago","Sept.","Oct.","Nov.","Dic."],
  dayNames: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],
  dayNamesShort: ["Dom.","Lun.","Mar.","Mié.","Jue.","Vie.","Sáb."],
  today: "Hoy"
};
LocaleConfig.defaultLocale = "es";

type Props = { onDaySelected: (date: string) => void };

export default function Calendario({ onDaySelected }: Props) {
  const [selected, setSelected] = useState("");
  const { width: screenWidth } = useWindowDimensions();

  // ancho 90% pantalla, max 500px
  const calendarWidth = Math.min(screenWidth * 0.9, 500);
  const calendarHeight = calendarWidth * 0.9; // altura proporcional

  return (
    <View style={styles.container}>
      <Calendar
        style={[styles.calendar, { width: calendarWidth, height: calendarHeight }]}
        theme={{
          backgroundColor: "#000",
          calendarBackground: "#000",
          textSectionTitleColor: "#d4af37",
          selectedDayBackgroundColor: "#d4af37",
          selectedDayTextColor: "#000",
          todayTextColor: "#d4af37",
          dayTextColor: "#fff",
          textDisabledColor: "#555",
          monthTextColor: "#d4af37",
          arrowColor: "#d4af37",
        }}
        current={new Date().toISOString().split("T")[0]}
        minDate={new Date().toISOString().split("T")[0]}
        onDayPress={(day) => {
          setSelected(day.dateString);
          onDaySelected(day.dateString);
        }}
        markedDates={{ [selected]: { selected: true, selectedColor: "#d4af37" } }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, width: "100%", alignItems: "center" },
  calendar: {
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 12,
    padding: 10,
  },
});
