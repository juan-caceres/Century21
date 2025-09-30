//app/componentes/calendario.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions, Platform } from "react-native";

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

// Constantes adaptativas
const isSmallDevice = width < 380;
const isMediumDevice = width >= 380 && width < 600;
const isLargeDevice = width >= 600;
const isWeb = Platform.OS === 'web';

const HORAS_INICIO = 9;
const HORAS_FIN = 19;

// Altura de hora más adaptativa
const getAlturaHora = () => {
  if (isSmallDevice) return Math.max(40, height / 20); // Mínimo 40px en pantallas chicas
  if (isMediumDevice) return Math.max(50, height / 18);
  return Math.max(60, height / 16);
};

const ALTURA_HORA = getAlturaHora();

// Ancho de columnas adaptativo
const getAnchoColumnaHoras = () => {
  if (isSmallDevice) return 40;
  if (isMediumDevice) return 50;
  return 60;
};

const ANCHO_COLUMNA_HORAS = getAnchoColumnaHoras();

// Ancho mínimo para columnas de días
const getAnchoMinDia = () => {
  const espacioDisponible = width - ANCHO_COLUMNA_HORAS;
  const anchoPorDia = espacioDisponible / 6; // 6 días (lunes a sábado)
  
  // Asegurar un mínimo razonable
  if (isSmallDevice) return Math.max(50, anchoPorDia);
  if (isMediumDevice) return Math.max(70, anchoPorDia);
  return Math.max(90, anchoPorDia);
};

const ANCHO_MIN_DIA = getAnchoMinDia();

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
      const formato = isSmallDevice ? `${i}` : `${i.toString().padStart(2, '0')}:00`;
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
    const diaCorto = isSmallDevice ? diaSemana.substring(0, 2) : diaSemana;
    
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
    
    // Tamaños de fuente adaptativos
    const tituloFontSize = isSmallDevice ? 8 : isMediumDevice ? 9 : 10;
    const horaFontSize = isSmallDevice ? 7 : isMediumDevice ? 8 : 9;
    
    return (
      <View
        key={reserva.id}
        style={[
          styles.evento,
          {
            top: topPosition,
            height: Math.max(duration, 20),
            padding: isSmallDevice ? 3 : isMediumDevice ? 4 : 5,
          }
        ]}
      >
        <Text style={[styles.eventoTexto, { fontSize: tituloFontSize }]} numberOfLines={isSmallDevice ? 1 : 2}>
          {reserva.titulo}
        </Text>
        <Text style={[styles.eventoHora, { fontSize: horaFontSize }]}>
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
  const necesitaScrollHorizontal = anchoTotalNecesario > width - 20; 

  // Tamaños adaptativos para el header
  const botonNavSize = isSmallDevice ? 32 : isMediumDevice ? 36 : 40;
  const tituloFontSize = isSmallDevice ? 11 : isMediumDevice ? 13 : 15;

  return (
    <View style={styles.contenedor}>
      {/* Header con navegación */}
      <View style={[styles.headerNavegacion, { minHeight: isSmallDevice ? 40 : 48 }]}>
        <TouchableOpacity 
          style={[styles.botonNavegacion, { width: botonNavSize, height: botonNavSize }]} 
          onPress={() => cambiarSemana('anterior')}
        >
          <Text style={[styles.textoNavegacion, { fontSize: isSmallDevice ? 16 : 18 }]}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.tituloContainer}>
          <Text style={[styles.tituloSemana, { fontSize: tituloFontSize }]}>
            {formatearTituloSemana()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.botonNavegacion, { width: botonNavSize, height: botonNavSize }]} 
          onPress={() => cambiarSemana('siguiente')}
        >
          <Text style={[styles.textoNavegacion, { fontSize: isSmallDevice ? 16 : 18 }]}>›</Text>
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
          <View style={[styles.headerDias, { minHeight: isSmallDevice ? 36 : 44 }]}>
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
                    { fontSize: isSmallDevice ? 8 : isMediumDevice ? 9 : 10 },
                    esPasado && styles.diaPasadoTexto
                  ]}>
                    {fechaFormateada.diaSemana}
                  </Text>
                  <Text style={[
                    styles.diaNumeroTexto,
                    { fontSize: isSmallDevice ? 11 : isMediumDevice ? 13 : 14 },
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
                    <Text style={[
                      styles.horaTexto,
                      { fontSize: isSmallDevice ? 8 : isMediumDevice ? 9 : 10 }
                    ]}>
                      {hora}
                    </Text>
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
  contenedor: { flex: 1, backgroundColor: '#ffffff', },
  headerNavegacion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: isSmallDevice ? 6 : isMediumDevice ? 8 : 10, paddingVertical: isSmallDevice ? 6 : 8, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', },
  botonNavegacion: { backgroundColor: '#BEAF87', borderRadius: 20, alignItems: 'center', justifyContent: 'center', },
  textoNavegacion: { color: '#ffffff', fontWeight: 'bold', },
  tituloContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, },
  tituloSemana: { fontWeight: 'bold', color: '#252526', textTransform: 'capitalize', textAlign: 'center', },
  calendarioWrapper: { flex: 1, },
  headerDias: { flexDirection: 'row', backgroundColor: '#f5f5f5', paddingVertical: isSmallDevice ? 6 : 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', },
  columnaHoras: { alignItems: 'center', backgroundColor: '#f5f5f5', },
  columnaDia: { alignItems: 'center', position: 'relative', },
  diaSemanaTexto: { color: '#BEAF87', fontWeight: 'bold', marginBottom: 2, },
  diaNumeroTexto: { color: '#252526', fontWeight: 'bold', },
  diaPasadoTexto: { color: '#cccccc', },
  scrollContainer: { flex: 1, },
  calendarioContainer: { flexDirection: 'row', minHeight: 11 * ALTURA_HORA, },
  filaHora: { justifyContent: 'center', alignItems: 'center', paddingRight: isSmallDevice ? 2 : 4, },
  horaTexto: { color: '#666666', fontWeight: '500', },
  celdaHora: { borderBottomWidth: 0.5, borderBottomColor: '#e8e8e8', borderRightWidth: 0.5, borderRightColor: '#e8e8e8', position: 'relative', width: '100%', },
  celdaPasada: { backgroundColor: '#f8f8f8', opacity: 0.5, },
  lineaDivision: { position: 'absolute', top: 0, left: 0, right: 0, height: 0.5, backgroundColor: '#e8e8e8', },
  eventosContainer: { position: 'absolute', top: 0, left: 2, right: 2, bottom: 0, },
  evento: { position: 'absolute', left: 0, right: 0, backgroundColor: '#BEAF87', borderRadius: isSmallDevice ? 3 : 4, borderLeftWidth: 2, borderLeftColor: '#9A8F6A', },
  eventoTexto: { color: '#ffffff', fontWeight: 'bold', marginBottom: 1, },
  eventoHora: { color: '#ffffff', opacity: 0.9, },
});