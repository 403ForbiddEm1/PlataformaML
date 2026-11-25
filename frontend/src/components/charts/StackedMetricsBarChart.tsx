import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Application, Vacancy } from '@/types';
import { TiltGlassCard } from '@/components/ui/TiltGlassCard';
import type { DonutMode, DonutPerson, DonutSegment } from '@/components/charts/CompanyStatusDonutChart';

interface BarColumnItem {
  id: string;
  shortLabel: string;
  fullLabel: string;
  subtitle: string;
  topValue: number;
  bottomValue: number;
  barColor?: string;
  openings?: number;
  isLadderPerson?: boolean;
}

interface StackedMetricsBarChartProps {
  mode: DonutMode;
  segments: DonutSegment[];
  activeSegment: DonutSegment | null;
  vacancies: Vacancy[];
  applications: Application[];
  companyName: string;
  onClearSegment?: () => void;
}

const AFFINITY_BANDS = [
  { id: 'band-0', short: '<50%', full: 'Afinidad Baja (<50%)', min: 0, max: 49, color: '#F43F5E' },
  { id: 'band-1', short: '50-64%', full: 'Afinidad Media-Baja (50–64%)', min: 50, max: 64, color: '#F59E0B' },
  { id: 'band-2', short: '65-74%', full: 'Afinidad Media (65–74%)', min: 65, max: 74, color: '#0EA5E9' },
  { id: 'band-3', short: '75-89%', full: 'Afinidad Alta (75–89%)', min: 75, max: 89, color: '#10B981' },
  { id: 'band-4', short: '90-100%', full: 'Afinidad Sobresaliente (90–100%)', min: 90, max: 100, color: '#84CC16' },
];

function computeNiceMax(maxVal: number): { maxTick: number; ticks: number[] } {
  if (maxVal <= 4) {
    return { maxTick: 4, ticks: [4, 3, 2, 1, 0] };
  }
  const step = Math.ceil(maxVal / 4);
  const maxTick = step * 4;
  return {
    maxTick,
    ticks: [maxTick, step * 3, step * 2, step, 0],
  };
}

function getTierColor(score: number): string {
  if (score >= 90) return '#84CC16';
  if (score >= 75) return '#10B981';
  if (score >= 65) return '#0EA5E9';
  if (score >= 50) return '#F59E0B';
  return '#F43F5E';
}

function getTooltipTransform(clientX: number, clientY: number): string {
  const x =
    typeof window !== 'undefined'
      ? Math.min(clientX + 14, window.innerWidth - 220)
      : clientX + 14;
  const y = Math.max(8, clientY - 76);
  return `translate3d(${x}px, ${y}px, 0)`;
}

/**
 * Gráfica de columnas adaptada al negocio:
 * - Vista principal ('ladder'): Nivel de afinidad en escalera (ascendente) de las personas
 *   pertenecientes al modo y sección seleccionados en la torta (Postulantes o Personal Activo).
 * - Vista secundaria ('quality'): Calidad de talento (≥75% vs <75%) frente a plazas por convocatoria.
 */
export const StackedMetricsBarChart: React.FC<StackedMetricsBarChartProps> = ({
  mode,
  segments,
  activeSegment,
  vacancies,
  applications,
  companyName,
  onClearSegment,
}) => {
  const [chartView, setChartView] = useState<'ladder' | 'quality'>('ladder');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const targetPeople = useMemo<DonutPerson[]>(() => {
    if (activeSegment) return activeSegment.people;
    return segments.flatMap((s) => s.people);
  }, [activeSegment, segments]);

  const useIndividualLadder = chartView === 'ladder' && targetPeople.length <= 12;

  const { columns, maxTick, ticks } = useMemo(() => {
    if (chartView === 'quality') {
      const vacancyCols: BarColumnItem[] = vacancies.slice(0, 8).map((vac) => {
        const apps = applications.filter((a) => a.vacancyId === vac.id);
        const qualified = apps.filter(
          (a) => (typeof a.mlScore === 'number' ? a.mlScore : 0) >= 75
        ).length;
        const underThreshold = apps.length - qualified;
        const firstWord = vac.title.trim().split(/\s+/)[0] || 'Vacante';
        return {
          id: vac.id,
          shortLabel: firstWord.slice(0, 9),
          fullLabel: vac.title,
          subtitle: `${vac.department} · ${vac.openings} ${vac.openings === 1 ? 'plaza' : 'plazas'}`,
          topValue: qualified,
          bottomValue: underThreshold,
          openings: vac.openings,
        };
      });
      const maxVal = vacancyCols.reduce(
        (acc, c) => Math.max(acc, c.topValue + c.bottomValue),
        0
      );
      const nice = computeNiceMax(maxVal);
      return { columns: vacancyCols, ...nice };
    }

    // Vista 'ladder': Escalera de afinidad sincronizada con la torta
    if (useIndividualLadder) {
      const sorted = [...targetPeople].sort(
        (a, b) => (a.affinity ?? 0) - (b.affinity ?? 0)
      );
      const cols: BarColumnItem[] = sorted.map((p) => {
        const score = p.affinity ?? 0;
        const firstName = p.name.trim().split(/\s+/)[0] || 'Usuario';
        return {
          id: p.id,
          shortLabel: firstName.slice(0, 9),
          fullLabel: p.name,
          subtitle: `${p.roleOrVacancy} · ${p.status}`,
          topValue: score,
          bottomValue: 0,
          barColor: p.affinity !== null ? getTierColor(score) : '#64748B',
          isLadderPerson: true,
        };
      });
      return {
        columns: cols,
        maxTick: 100,
        ticks: [100, 75, 50, 25, 0],
      };
    }

    // Más de 12 personas: escalera por rangos de afinidad ascendentes
    const bandCols: BarColumnItem[] = AFFINITY_BANDS.map((band) => {
      const count = targetPeople.filter((p) => {
        const s = p.affinity ?? 0;
        return s >= band.min && s <= band.max;
      }).length;
      return {
        id: band.id,
        shortLabel: band.short,
        fullLabel: band.full,
        subtitle: mode === 'applicants' ? 'Postulantes en este rango' : 'Personal activo en este rango',
        topValue: count,
        bottomValue: 0,
        barColor: band.color,
      };
    });
    const maxBand = bandCols.reduce((acc, c) => Math.max(acc, c.topValue), 0);
    const nice = computeNiceMax(maxBand);
    return { columns: bandCols, ...nice };
  }, [chartView, useIndividualLadder, targetPeople, vacancies, applications, mode]);

  const slotCount = Math.max(columns.length, 6);
  const hoveredCol = columns.find((c) => c.id === hoveredId) ?? null;

  const scheduleTooltipPosition = () => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = tooltipRef.current;
      if (!el) return;
      el.style.transform = getTooltipTransform(cursorRef.current.x, cursorRef.current.y);
    });
  };

  const handleMouseEnter = (e: React.MouseEvent, id: string) => {
    cursorRef.current.x = e.clientX;
    cursorRef.current.y = e.clientY;
    setHoveredId(id);
    scheduleTooltipPosition();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    cursorRef.current.x = e.clientX;
    cursorRef.current.y = e.clientY;
    scheduleTooltipPosition();
  };

  const handleMouseLeave = () => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setHoveredId(null);
  };

  useEffect(() => {
    if (hoveredId) {
      scheduleTooltipPosition();
    }
  }, [hoveredId]);

  return (
    <>
      <TiltGlassCard
        maxTiltDeg={1.4}
        className="w-full h-full rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
      >
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {chartView === 'ladder'
                  ? `Escalera de Afinidad · ${mode === 'applicants' ? 'Postulantes' : 'Personal Activo'}`
                  : `Calidad de Talento vs. Plazas · ${companyName}`}
              </h3>
              {chartView === 'ladder' && activeSegment && (
                <button
                  type="button"
                  onClick={onClearSegment}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C8FF45]/25 text-slate-900 dark:text-[#C8FF45] border border-[#C8FF45]/50 cursor-pointer"
                  title="Clic para volver al total general"
                >
                  {activeSegment.label} ✕
                </button>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {chartView === 'ladder'
                ? activeSegment
                  ? `Nivel de afinidad ordenado en escalera para "${activeSegment.label}".`
                  : `Nivel de afinidad IA en escalera ascendente (${mode === 'applicants' ? 'todas las convocatorias' : 'todos los roles activos'}).`
                : 'Comparativa por convocatoria: perfiles calificados (≥75%) vs bajo umbral (<75%).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-slate-900/10 dark:bg-white/10 p-0.5 border border-slate-300/60 dark:border-white/15 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartView('ladder')}
                className={`min-h-[34px] px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartView === 'ladder'
                    ? 'bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Escalera Afinidad
              </button>
              {vacancies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChartView('quality')}
                  className={`min-h-[34px] px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    chartView === 'quality'
                      ? 'bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Calidad vs Plazas
                </button>
              )}
            </div>

            {chartView === 'quality' && (
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block shrink-0" />
                  Aptos ≥75%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#18191B] dark:bg-slate-300 inline-block shrink-0" />
                  Bajo umbral
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Área de la gráfica */}
        {columns.length === 0 ? (
          <div className="relative z-10 h-44 rounded-xl border border-dashed border-slate-300/70 dark:border-white/15 flex items-center justify-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 px-4 text-center">
            {mode === 'applicants'
              ? 'No hay postulantes en esta selección para graficar su escalera de afinidad.'
              : 'No hay personal activo en este rol para graficar su escalera de afinidad.'}
          </div>
        ) : (
          <div className="relative z-10 flex gap-2.5 sm:gap-3 items-stretch pt-1">
            {/* Eje Y */}
            <div className="h-44 flex flex-col justify-between items-end pr-1 text-xs font-semibold text-slate-500 dark:text-slate-400 select-none shrink-0">
              {ticks.map((tick) => (
                <span key={tick} className="leading-none">
                  {useIndividualLadder && chartView === 'ladder' ? `${tick}%` : tick}
                </span>
              ))}
            </div>

            {/* Grid horizontal + Columnas */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="relative h-44 w-full">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {ticks.map((tick) => (
                    <div
                      key={tick}
                      className={`w-full border-b ${
                        tick === 0
                          ? 'border-slate-400/50 dark:border-white/20'
                          : 'border-dashed border-slate-300/60 dark:border-white/10'
                      }`}
                    />
                  ))}
                </div>

                <div
                  className="relative z-10 h-full grid gap-2 sm:gap-3 items-end px-1 sm:px-2"
                  style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
                >
                  {columns.map((col) => {
                    const topPct = maxTick > 0 ? (col.topValue / maxTick) * 100 : 0;
                    const bottomPct = maxTick > 0 ? (col.bottomValue / maxTick) * 100 : 0;
                    const hasBoth = col.topValue > 0 && col.bottomValue > 0;
                    const hasAny = col.topValue + col.bottomValue > 0;

                    return (
                      <div
                        key={col.id}
                        onMouseEnter={(e) => handleMouseEnter(e, col.id)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        className="h-full flex flex-col justify-end items-center group cursor-default"
                      >
                        <div className="w-full max-w-[44px] h-full flex flex-col justify-end items-center">
                          {!hasAny ? (
                            <div className="w-full h-1.5 rounded-full bg-slate-400/30 dark:bg-white/15 transition-colors group-hover:bg-slate-400/50 dark:group-hover:bg-white/30" />
                          ) : (
                            <div
                              className={`w-full h-full flex flex-col justify-end ${
                                hasBoth ? 'gap-1' : ''
                              } transition-transform duration-150 group-hover:scale-[1.04]`}
                            >
                              {col.topValue > 0 && (
                                <div
                                  className="w-full rounded-md sm:rounded-lg shadow-xs transition-[height] duration-300"
                                  style={{
                                    height: `${Math.max(topPct, 8)}%`,
                                    backgroundColor: col.barColor || '#10B981',
                                  }}
                                />
                              )}
                              {col.bottomValue > 0 && (
                                <div
                                  className="w-full rounded-md sm:rounded-lg bg-[#18191B] dark:bg-slate-300 shadow-xs transition-[height] duration-300"
                                  style={{ height: `${Math.max(bottomPct, 8)}%` }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="grid gap-2 sm:gap-3 pt-2 px-1 sm:px-2"
                style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
              >
                {columns.map((col) => (
                  <span
                    key={col.id}
                    className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300 truncate"
                    title={col.fullLabel}
                  >
                    {col.shortLabel}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </TiltGlassCard>

      {hoveredCol &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed top-0 left-0 z-[9999] pointer-events-none px-3 py-2 rounded-xl bg-slate-950/92 text-white border border-white/15 shadow-xl text-xs leading-tight min-w-[160px] max-w-[230px] will-change-transform"
          >
            <p className="font-bold text-slate-100 truncate">{hoveredCol.fullLabel}</p>
            <p className="text-xs text-slate-400 truncate mb-1.5">{hoveredCol.subtitle}</p>
            {chartView === 'ladder' ? (
              <div className="flex items-center justify-between gap-2 text-[#C8FF45] font-bold">
                <span>{hoveredCol.isLadderPerson ? 'Afinidad IA:' : 'Personas:'}</span>
                <span className="font-mono">
                  {hoveredCol.isLadderPerson ? `${hoveredCol.topValue}%` : hoveredCol.topValue}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 text-emerald-400">
                  <span>Aptos (≥75%):</span>
                  <span className="font-mono font-bold">{hoveredCol.topValue}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-slate-300">
                  <span>Bajo umbral:</span>
                  <span className="font-mono font-bold">{hoveredCol.bottomValue}</span>
                </div>
                <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between gap-2 text-sky-400 font-bold">
                  <span>Plazas abiertas:</span>
                  <span className="font-mono">{hoveredCol.openings ?? 1}</span>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
