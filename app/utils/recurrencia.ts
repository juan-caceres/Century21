// app/utils/recurrencia.ts (archivo nuevo)
export type TipoDuracion = 'fecha' | 'semanas' | 'meses' | 'finDeAnio';

export function calcularFechaFin(
  fechaInicio: string,
  tipoDuracion: TipoDuracion,
  valor?: number,
  fechaFinManual?: string
): string {
  const [anio, mes, dia] = fechaInicio.split('-').map(Number);

  if (tipoDuracion === 'fecha' && fechaFinManual) return fechaFinManual;
  if (tipoDuracion === 'finDeAnio') return `${anio}-12-31`;

  const fin = new Date(anio, mes - 1, dia);
  if (tipoDuracion === 'semanas' && valor) fin.setDate(fin.getDate() + valor * 7);
  if (tipoDuracion === 'meses' && valor) fin.setMonth(fin.getMonth() + valor);

  return fin.toISOString().split('T')[0];
}

// Genera las ocurrencias "virtuales" de todos los grupos para un rango de días
// (se usa tanto para pintar el calendario semanal como para chequear solapamientos)
export function generarOcurrenciasDeGrupos(
  grupos: any[],
  dias: Date[]
) {
  const ocurrencias: any[] = [];

  grupos.forEach(grupo => {
    if (!grupo.activo) return;

    dias.forEach(dia => {
      const diaSemanaNum = dia.getDay();
      if (!grupo.diasSemana.includes(diaSemanaNum)) return;

      const diaStr = dia.toISOString().split('T')[0];
      if (diaStr < grupo.fechaInicio || diaStr > grupo.fechaFin) return;
      if (grupo.excepciones?.includes(diaStr)) return;

      const [h1, m1] = grupo.horaInicio.split(':').map(Number);
      const [h2, m2] = grupo.horaFin.split(':').map(Number);
      const [anio, mes, diaNum] = diaStr.split('-').map(Number);

      ocurrencias.push({
        id: `grupo-${grupo.id}-${diaStr}`,
        grupoId: grupo.id,
        titulo: grupo.motivo,
        inicio: new Date(anio, mes - 1, diaNum, h1, m1),
        fin: new Date(anio, mes - 1, diaNum, h2, m2),
        fecha: diaStr,
        horaInicio: grupo.horaInicio,
        horaFin: grupo.horaFin,
        motivo: grupo.motivo,
        esGrupo: true,
      });
    });
  });

  return ocurrencias;
}