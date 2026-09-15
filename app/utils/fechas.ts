// app/utils/fechas.ts

// Devuelve la fecha en formato "YYYY-MM-DD" usando el huso horario LOCAL
// del dispositivo, a diferencia de Date.toISOString() que siempre usa UTC.
// Evita que, cerca de la medianoche en Argentina (UTC-3), una fecha calcule
// mal el día por el desfasaje horario.
export function toLocalDateString(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const dia = fecha.getDate().toString().padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}