import {Calendar, CalendarList, Agenda, LocaleConfig} from 'react-native-calendars';
import React, {useState} from 'react';
import { View } from 'react-native';

//configuracion de dias,mes y año de calendario en espanol
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mie.', 'Jue.', 'Vie.', 'Sab.'],
  today: "Hoy"
};

LocaleConfig.defaultLocale = 'es';

export default function Calendario() {

    const [selected, setSelected] = useState('');

  return (
    <View>

      <Calendar
              // Customize the appearance of the calendar
              style={{
                borderWidth: 1,
                borderColor: 'gray',
                height: 350,
                marginTop: 20
              }}
      
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#00adf5',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#00adf5',
                dayTextColor: '#2d4150',
                textDisabledColor: '#dd99ee'
              }}
      
              // Specify the current date
              current={'2025-09-12'}
              // Callback that gets called when the user selects a day
              onDayPress={day => {
                console.log('selected day', day);
              }}
              // Mark specific dates as marked
              markedDates={{
                '2025-09-13': {selected: true, marked: true, selectedColor: 'blue'},
                '2012-03-02': {marked: true},
                '2012-03-03': {selected: true, marked: true, selectedColor: 'blue'}
              }}
            />
      
      
      
    </View>
  );
}