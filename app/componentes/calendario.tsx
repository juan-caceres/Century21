//app/componentes/calendario.jsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";

type Reserva = {
  id?: string;
  titulo: string;
  inicio: Date;
  fin: Date;
};

type Props = {
  reservas: Reserva[];
  alSeleccionarHorario: (fecha: Date) => void;
};

const { width } = Dimensions.get('window');
const HORAS_INICIO = 9;
const HORAS_FIN = 19;
const ALTURA_HORA = 60;

export default function Calendario({ reservas, alSeleccionarHorario }: Props) {
  const [semanaActual, setSemanaActual] = useState(new Date());
  
  // Obtener los días de la semana (Lunes a Sábado)
  const obtenerDiasDeLaSemana = (fecha: Date) => {
    const inicioSemana = new Date(fecha);
    const diaDeLaSemana = inicioSemana.getDay();
    
    // Ajustar al lunes más cercano
    const diasParaRestar = diaDeLaSemana === 0 ? 6 : diaDeLaSemana - 1;
    inicioSemana.setDate(inicioSemana.getDate() - diasParaRestar);
    
    const dias = [];
    for (let i = 0; i < 6; i++) { // Solo 6 días (Lunes a Sábado)
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      dias.push(dia);
    }
    return dias;
  };

  const diasSemana = obtenerDiasDeLaSemana(semanaActual);
  
  // Verificar si un día es pasado
  const esDiaPasado = (fecha: Date) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(fecha);
    fechaComparar.setHours(0, 0, 0, 0);
    return fechaComparar < hoy;
  };

  // Generar horas del día (solo para mostrar en la columna lateral)
  const generarHoras = () => {
    const horas = [];
    for (let i = HORAS_INICIO; i <= HORAS_FIN; i++) { 
      horas.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return horas;
  };

  const horas = generarHoras();

  // Cambiar semana
  const cambiarSemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(semanaActual);
    if (direccion === 'anterior') {
      nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    } else {
      nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    }
    setSemanaActual(nuevaFecha);
  };

  // Obtener reservas para un día específico
  const obtenerReservasDelDia = (fecha: Date) => {
    const fechaString = fecha.toISOString().split('T')[0];
    return reservas.filter(reserva => {
      const reservaFecha = reserva.inicio.toISOString().split('T')[0];
      return reservaFecha === fechaString;
    });
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fecha: Date) => {
    return {
      dia: fecha.getDate(),
      diaSemana: fecha.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
      mes: fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
    };
  };

  // Formatear título de la semana con rango de fechas
  const formatearTituloSemana = () => {
    const primerDia = diasSemana[0];
    const ultimoDia = diasSemana[diasSemana.length - 1];
    
    const primerDiaStr = primerDia.getDate();
    const ultimoDiaStr = ultimoDia.getDate();
    const mesInicio = primerDia.toLocaleDateString('es-ES', { month: 'short' });
    const mesFin = ultimoDia.toLocaleDateString('es-ES', { month: 'short' });
    const año = primerDia.getFullYear();
    
    if (primerDia.getMonth() === ultimoDia.getMonth()) {
      return `${primerDiaStr} - ${ultimoDiaStr} ${mesInicio} ${año}`;
    } else {
      return `${primerDiaStr} ${mesInicio} - ${ultimoDiaStr} ${mesFin} ${año}`;
    }
  };

  // Renderizar evento en el calendario
  const renderizarEvento = (reserva: Reserva, fecha: Date) => {
    const horaInicio = reserva.inicio.getHours();
    const minutosInicio = reserva.inicio.getMinutes();
    const horaFin = reserva.fin.getHours();
    const minutosFin = reserva.fin.getMinutes();
    
    const topPosition = ((horaInicio - HORAS_INICIO) + minutosInicio / 60) * ALTURA_HORA;
    const duration = ((horaFin - horaInicio) + (minutosFin - minutosInicio) / 60) * ALTURA_HORA;
    
    return (
      <View
        key={reserva.id}
        style={[
          styles.evento,
          {
            top: topPosition,
            height: Math.max(duration, 20),
          }
        ]}
      >
        <Text style={styles.eventoTexto} numberOfLines={2}>
          {reserva.titulo}
        </Text>
        <Text style={styles.eventoHora}>
          {`${horaInicio.toString().padStart(2, '0')}:${minutosInicio.toString().padStart(2, '0')}`}
        </Text>
      </View>
    );
  };

  // 🔥 FUNCIÓN MEJORADA PARA MANEJAR EL TOQUE EN LAS CELDAS
  const manejarToqueCelda = (dia: Date, horaIndex: number) => {
    console.log('=== DEBUG TOQUE CELDA ===');
    console.log('Día:', dia.toDateString());
    console.log('Hora Index:', horaIndex);
    
    const esPasado = esDiaPasado(dia);
    console.log('Es día pasado:', esPasado);
    
    if (esPasado) {
      console.log('Día pasado - no se puede seleccionar');
      return;
    }

    // Crear fecha SIN hora específica - solo el día
    const fechaHora = new Date(dia);
    fechaHora.setHours(0, 0, 0, 0); // Sin hora precargada
    
    console.log('Fecha seleccionada:', fechaHora.toISOString());
    console.log('Llamando a alSeleccionarHorario...');
    
    // Llamar al callback
    alSeleccionarHorario(fechaHora);
  };

  return (
    <View style={styles.contenedor}>
      {/* Header con navegación */}
      <View style={styles.headerNavegacion}>
        <TouchableOpacity 
          style={styles.botonNavegacion} 
          onPress={() => cambiarSemana('anterior')}
        >
          <Text style={styles.textoNavegacion}>← Semana Anterior</Text>
        </TouchableOpacity>
        
        <Text style={styles.tituloSemana}>
          {formatearTituloSemana()}
        </Text>
        
        <TouchableOpacity 
          style={styles.botonNavegacion} 
          onPress={() => cambiarSemana('siguiente')}
        >
          <Text style={styles.textoNavegacion}>Siguiente Semana →</Text>
        </TouchableOpacity>
      </View>

      {/* Header con días de la semana */}
      <View style={styles.headerDias}>
        <View style={styles.columnaHoras} />
        {diasSemana.map((dia, index) => {
          const fechaFormateada = formatearFecha(dia);
          const esPasado = esDiaPasado(dia);
          
          return (
            <View key={index} style={styles.columnaDia}>
              <Text style={[
                styles.diaSemanaTexto,
                esPasado && styles.diaPasadoTexto
              ]}>
                {fechaFormateada.diaSemana}
              </Text>
              <Text style={[
                styles.diaNumeroTexto,
                esPasado && styles.diaPasadoTexto
              ]}>
                {fechaFormateada.dia}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Calendario principal */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarioContainer}>
          {/* Columna de horas */}
          <View style={styles.columnaHoras}>
            {horas.map((hora, index) => (
              <View key={index} style={styles.filaHora}>
                <Text style={styles.horaTexto}>{hora}</Text>
              </View>
            ))}
          </View>

          {/* Columnas de días */}
          {diasSemana.map((dia, diaIndex) => {
            const reservasDelDia = obtenerReservasDelDia(dia);
            const esPasado = esDiaPasado(dia);
            
            return (
              <View key={diaIndex} style={styles.columnaDia}>
                {/* 🔥 CELDAS MEJORADAS - Crear celdas para cada hora (9:00 a 19:00) */}
                {Array.from({ length: 11 }, (_, horaIndex) => (
                  <TouchableOpacity
                    key={`celda-${diaIndex}-${horaIndex}`}
                    style={[
                      styles.celdaHora,
                      esPasado && styles.celdaPasada
                    ]}
                    onPress={() => manejarToqueCelda(dia, horaIndex)}
                    disabled={esPasado}
                    activeOpacity={esPasado ? 1 : 0.3}
                  >
                    <View style={styles.lineaDivision} />
                  </TouchableOpacity>
                ))}
                
                {/* Renderizar eventos del día */}
                <View style={styles.eventosContainer} pointerEvents="none">
                  {reservasDelDia.map(reserva => renderizarEvento(reserva, dia))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerNavegacion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  botonNavegacion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#BEAF87',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  textoNavegacion: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tituloSemana: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#252526',
    textTransform: 'capitalize',
  },
  headerDias: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  columnaHoras: {
    width: 60,
    alignItems: 'center',
  },
  columnaDia: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  diaSemanaTexto: {
    fontSize: 12,
    color: '#BEAF87',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  diaNumeroTexto: {
    fontSize: 16,
    color: '#252526',
    fontWeight: 'bold',
  },
  diaPasadoTexto: {
    color: '#cccccc',
  },
  scrollContainer: {
    flex: 1,
    maxHeight: '100%', // 🔥 AÑADIDO: Asegurar que use toda la altura disponible
  },
  calendarioContainer: {
    flexDirection: 'row',
    height: 11 * ALTURA_HORA, // 🔥 CORREGIDO: 11 horas (9:00 a 19:00) en lugar de 10
    minHeight: 11 * ALTURA_HORA, // 🔥 AÑADIDO: altura mínima para garantizar scroll
  },
  filaHora: {
    height: ALTURA_HORA,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 8,
  },
  horaTexto: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  celdaHora: {
    height: ALTURA_HORA,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e8e8',
    borderRightWidth: 0.5,
    borderRightColor: '#e8e8e8',
    position: 'relative',
    // 🔥 MEJORA: Asegurar que las celdas sean realmente tocables
    minHeight: ALTURA_HORA,
    width: '100%',
  },
  celdaPasada: {
    backgroundColor: '#f8f8f8',
    opacity: 0.5,
  },
  lineaDivision: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: '#e8e8e8',
  },
  eventosContainer: {
    position: 'absolute',
    top: 0,
    left: 2,
    right: 2,
    bottom: 0,
    // 🔥 CLAVE: pointerEvents="none" para que los eventos no bloqueen los toques
  },
  evento: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#BEAF87',
    borderRadius: 4,
    padding: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#9A8F6A',
  },
  eventoTexto: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  eventoHora: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.9,
  },
});