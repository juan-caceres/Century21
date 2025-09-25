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

const { width, height } = Dimensions.get('window');
const HORAS_INICIO = 9;
const HORAS_FIN = 19;
const ALTURA_HORA = width < 400 ? 30 : Math.max(35, Math.min(50, height / 18));
const ANCHO_COLUMNA_HORAS = width < 400 ? 35 : width < 600 ? 45 : 55;
const ANCHO_MIN_DIA = width < 400 ? 45 : width < 600 ? 65 : 80;

export default function Calendario({ reservas, alSeleccionarHorario }: Props) {
  const [semanaActual, setSemanaActual] = useState(new Date());
  
  // Obtener los días de la semana (Lunes a Sábado)
  const obtenerDiasDeLaSemana = (fecha: Date) => {
    const inicioSemana = new Date(fecha);
    const diaDeLaSemana = inicioSemana.getDay();
    
    const diasParaRestar = diaDeLaSemana === 0 ? 6 : diaDeLaSemana - 1;
    inicioSemana.setDate(inicioSemana.getDate() - diasParaRestar);
    
    const dias = [];
    for (let i = 0; i < 6; i++) { // (Lunes a Sábado)
      const dia = new Date(inicioSemana);
      dia.setDate(inicioSemana.getDate() + i);
      dias.push(dia);
    }
    return dias;
  };

  const diasSemana = obtenerDiasDeLaSemana(semanaActual);
  
  // Verificar día pasado
  const esDiaPasado = (fecha: Date) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(fecha);
    fechaComparar.setHours(0, 0, 0, 0);
    return fechaComparar < hoy;
  };

  const generarHoras = () => {
    const horas = [];
    for (let i = HORAS_INICIO; i <= HORAS_FIN; i++) { 
      // En pantallas chicas -> mostrar solo la hora sin :00
      const formato = width < 400 ? `${i}` : `${i.toString().padStart(2, '0')}:00`;
      horas.push(formato);
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

  // Reservas para un día específico
  const obtenerReservasDelDia = (fecha: Date) => {
    const fechaString = fecha.toISOString().split('T')[0];
    return reservas.filter(reserva => {
      const reservaFecha = reserva.inicio.toISOString().split('T')[0];
      return reservaFecha === fechaString;
    });
  };

  const formatearFecha = (fecha: Date) => {
    const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
    // En pantallas chicas -> versiones más cortas
    const diaCorto = width < 400 ? diaSemana.substring(0, 2) : diaSemana;
    
    return {
      dia: fecha.getDate(),
      diaSemana: diaCorto,
      mes: fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
    };
  };

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

  // Render de evento en el calendario
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
            height: Math.max(duration, 18),
          }
        ]}
      >
        <Text style={styles.eventoTexto} numberOfLines={width < 400 ? 1 : 2}>
          {reserva.titulo}
        </Text>
        <Text style={styles.eventoHora}>
          {`${horaInicio.toString().padStart(2, '0')}:${minutosInicio.toString().padStart(2, '0')}`}
        </Text>
      </View>
    );
  };

  // FUNCIÓN PARA MANEJAR EL TOQUE EN LAS CELDAS
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

    const fechaHora = new Date(dia);
    fechaHora.setHours(0, 0, 0, 0);
    
    console.log('Fecha seleccionada:', fechaHora.toISOString());
    console.log('Llamando a alSeleccionarHorario...');
    
    alSeleccionarHorario(fechaHora);
  };

  // Calcular si necesitamos scroll horizontal
  const anchoTotalNecesario = ANCHO_COLUMNA_HORAS + (ANCHO_MIN_DIA * 6);
  const necesitaScrollHorizontal = anchoTotalNecesario > width;

  return (
    <View style={styles.contenedor}>
      {/* Header con navegación */}
      <View style={styles.headerNavegacion}>
        <TouchableOpacity 
          style={styles.botonNavegacion} 
          onPress={() => cambiarSemana('anterior')}
        >
          <Text style={styles.textoNavegacion}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.tituloContainer}>
          <Text style={styles.tituloSemana}>
            {formatearTituloSemana()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.botonNavegacion} 
          onPress={() => cambiarSemana('siguiente')}
        >
          <Text style={styles.textoNavegacion}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Contenedor con scroll horizontal */}
      <ScrollView 
        horizontal={necesitaScrollHorizontal}
        showsHorizontalScrollIndicator={necesitaScrollHorizontal}
        bounces={false}
        contentContainerStyle={!necesitaScrollHorizontal ? { flex: 1 } : {}}
      >
        <View style={[
          styles.calendarioWrapper,
          { minWidth: necesitaScrollHorizontal ? anchoTotalNecesario : '100%' }
        ]}>
          {/* Header con días de la semana */}
          <View style={styles.headerDias}>
            <View style={[styles.columnaHoras, { width: ANCHO_COLUMNA_HORAS }]} />
            {diasSemana.map((dia, index) => {
              const fechaFormateada = formatearFecha(dia);
              const esPasado = esDiaPasado(dia);
              
              return (
                <View key={index} style={[
                  styles.columnaDia,
                  necesitaScrollHorizontal 
                    ? { width: ANCHO_MIN_DIA }
                    : { flex: 1 }
                ]}>
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
          <ScrollView 
            style={styles.scrollContainer} 
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={styles.calendarioContainer}>
              {/* Columna de horas */}
              <View style={[styles.columnaHoras, { width: ANCHO_COLUMNA_HORAS }]}>
                {horas.map((hora, index) => (
                  <View key={index} style={[styles.filaHora, { height: ALTURA_HORA }]}>
                    <Text style={styles.horaTexto}>{hora}</Text>
                  </View>
                ))}
              </View>

              {/* Columnas de días */}
              {diasSemana.map((dia, diaIndex) => {
                const reservasDelDia = obtenerReservasDelDia(dia);
                const esPasado = esDiaPasado(dia);
                
                return (
                  <View key={diaIndex} style={[
                    styles.columnaDia,
                    necesitaScrollHorizontal 
                      ? { width: ANCHO_MIN_DIA }
                      : { flex: 1 }
                  ]}>
                    {/* Celdas para cada hora (9:00 a 19:00) - 11 celdas */}
                    {Array.from({ length: 11 }, (_, horaIndex) => (
                      <TouchableOpacity
                        key={`celda-${diaIndex}-${horaIndex}`}
                        style={[
                          styles.celdaHora,
                          { height: ALTURA_HORA },
                          esPasado && styles.celdaPasada
                        ]}
                        onPress={() => manejarToqueCelda(dia, horaIndex)}
                        disabled={esPasado}
                        activeOpacity={esPasado ? 1 : 0.3}
                      >
                        <View style={styles.lineaDivision} />
                      </TouchableOpacity>
                    ))}
                    
                    {/* Render de eventos del día */}
                    <View style={styles.eventosContainer} pointerEvents="none">
                      {reservasDelDia.map(reserva => renderizarEvento(reserva, dia))}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
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
    paddingHorizontal: width < 400 ? 4 : 8,
    paddingVertical: width < 400 ? 4 : 6,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: width < 400 ? 35 : 40,
  },
  botonNavegacion: {
    width: width < 400 ? 28 : 32,
    height: width < 400 ? 28 : 32,
    backgroundColor: '#BEAF87',
    borderRadius: width < 400 ? 14 : 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNavegacion: {
    color: '#ffffff',
    fontSize: width < 400 ? 14 : 16,
    fontWeight: 'bold',
  },
  tituloContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tituloSemana: {
    fontSize: width < 400 ? 12 : 14,
    fontWeight: 'bold',
    color: '#252526',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  calendarioWrapper: {
    flex: 1,
  },
  headerDias: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: width < 400 ? 4 : 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: width < 400 ? 32 : 40,
  },
  columnaHoras: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  columnaDia: {
    alignItems: 'center',
    position: 'relative',
  },
  diaSemanaTexto: {
    fontSize: width < 400 ? 8 : 9,
    color: '#BEAF87',
    fontWeight: 'bold',
    marginBottom: 1,
  },
  diaNumeroTexto: {
    fontSize: width < 400 ? 10 : 12,
    color: '#252526',
    fontWeight: 'bold',
  },
  diaPasadoTexto: {
    color: '#cccccc',
  },
  scrollContainer: {
    flex: 1,
  },
  calendarioContainer: {
    flexDirection: 'row',
    minHeight: 11 * ALTURA_HORA,
  },
  filaHora: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: width < 400 ? 1 : 3,
  },
  horaTexto: {
    fontSize: width < 400 ? 7 : 9,
    color: '#666666',
    fontWeight: '500',
  },
  celdaHora: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e8e8',
    borderRightWidth: 0.5,
    borderRightColor: '#e8e8e8',
    position: 'relative',
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
  },
  evento: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#BEAF87',
    borderRadius: width < 400 ? 2 : 3,
    padding: width < 400 ? 2 : 3,
    borderLeftWidth: 2,
    borderLeftColor: '#9A8F6A',
  },
  eventoTexto: {
    color: '#ffffff',
    fontSize: width < 400 ? 7 : 9,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  eventoHora: {
    color: '#ffffff',
    fontSize: width < 400 ? 6 : 8,
    opacity: 0.9,
  },
});