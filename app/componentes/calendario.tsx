import { Calendar, LocaleConfig } from "react-native-calendars";
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";

LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ],
  monthNamesShort: ["Ene.","Feb.","Mar","Abr","May","Jun","Jul.","Ago","Sept.","Oct.","Nov.","Dic."],
  dayNames: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],
  dayNamesShort: ["Dom.","Lun.","Mar.","Mié.","Jue.","Vie.","Sáb."],
  today: "Hoy"
};
LocaleConfig.defaultLocale = "es";

export default function Calendario() {
  const [selected, setSelected] = useState("");

  return (
    <View style={styles.container}>
      <Calendar
        style={styles.calendar}
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
        onDayPress={(day) => setSelected(day.dateString)}
        markedDates={{ [selected]: { selected: true, selectedColor: "#d4af37" } }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  calendar: { borderWidth: 1, borderColor: "#d4af37", borderRadius: 10 },
});
