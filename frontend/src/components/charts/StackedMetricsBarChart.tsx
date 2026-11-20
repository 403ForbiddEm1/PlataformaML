import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Application, Vacancy } from '@/types';
import { TiltGlassCard } from '@/components/ui/TiltGlassCard';

interface StackedBarColumn {
  id: string;
  shortLabel: string;
  fullLabel: string;
  topValue: number;
  bottomValue: number;
}

interface StackedMetricsBarChartProps {
  vacancies: Vacancy[];
  applications: Application[];
  companyName: string;
}

const PIPELINE_STAGES: Array<{ key: Application['status']; short: string; full: string }> = [
  { key: 'Recibida', short: 'Recib.', full: 'Recibida' },
  { key: 'En revisión', short: 'Revis.', full: 'En revisión' },
  { key: 'Preseleccionado', short: 'Presel.', full: 'Preseleccionado' },
  { key: 'Entrevista', short: 'Entrev.', full: 'Entrevista' },
  { key: 'Contratado', short: 'Contr.', full: 'Contratado' },
  { key: 'Descartado', short: 'Descart.', full: 'Descartado' },
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

function getTooltipTransform(clientX: number, clientY: number): string {
  const x =
    typeof window !== 'undefined'
      ? Math.min(clientX + 14, window.innerWidth - 205)
      : clientX + 14;
  const y = Math.max(8, clientY - 64);
  return `translate3d(${x}px, ${y}px, 0)`;
}

/**
 * Gráfica vertical de barras compacta sobre tarjeta glassmorphic con Tilt 3D mínimo.
 * Actualiza el tooltip flotante con translate3d dentro de requestAnimationFrame sin re-renderizar React.
 */
export const StackedMetricsBarChart: React.FC<StackedMetricsBarChartProps> = ({
  vacancies,
  applications,
  companyName,
}) => {
  const [groupBy, setGroupBy] = useState<'stages' | 'vacancies'>(() =>
    vacancies.length >= 3 ? 'vacancies' : 'stages'
  );
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

  const columns = useMemo<StackedBarColumn[]>(() => {
    if (groupBy === 'vacancies' && vacancies.length > 0) {
      return vacancies.slice(0, 8).map((vac) => {
        const apps = applications.filter((a) => a.vacancyId === vac.id);
        const topValue = apps.filter(
          (a) => a.status === 'Preseleccionado' || a.status === 'Contratado' || a.status === 'Entrevista'
        ).length;
        const bottomValue = apps.length - topValue;
        const words = vac.title.trim().split(/\s+/);
        const shortLabel = words[0]?.slice(0, 8) || 'Vacante';
        return {
          id: vac.id,
          shortLabel,
          fullLabel: vac.title,
          topValue,
          bottomValue,
        };
      });
    }

    return PIPELINE_STAGES.map((stage) => {
      const count = applications.filter((a) => a.status === stage.key).length;
      return {
        id: stage.key,
        shortLabel: stage.short,
        fullLabel: stage.full,
        topValue: count,
        bottomValue: 0,
      };
    });
  }, [groupBy, vacancies, applications]);

  const maxTotal = useMemo(
    () => columns.reduce((acc, col) => Math.max(acc, col.topValue + col.bottomValue), 0),
    [columns]
  );

  const { maxTick, ticks } = useMemo(() => computeNiceMax(maxTotal), [maxTotal]);
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

  return (
    <>
      <TiltGlassCard
        maxTiltDeg={1.4}
        className="w-full h-full rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
      >
        {/* Cabecera compacta: Título + Selector + Leyenda */}
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
              Balance de Candidatos · {companyName}
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Por {groupBy === 'vacancies' ? 'convocatoria activa' : 'etapa del proceso'} (datos locales).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {vacancies.length > 0 && (
              <div className="inline-flex rounded-lg bg-slate-900/10 dark:bg-white/10 p-0.5 border border-slate-300/60 dark:border-white/15 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setGroupBy('stages')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    groupBy === 'stages'
                      ? 'bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Por Etapa
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('vacancies')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    groupBy === 'vacancies'
                      ? 'bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Por Vacante
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700 dark:text-slate-200">
              {groupBy === 'stages' ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF6347] inline-block shrink-0" />
                  Candidatos en etapa
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF6347] inline-block shrink-0" />
                    Avanzados / Aptos
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#18191B] dark:bg-slate-200 inline-block shrink-0" />
                    En Evaluación
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Área de la gráfica */}
        <div className="relative z-10 flex gap-2.5 sm:gap-3 items-stretch pt-1">
          {/* Eje Y */}
          <div className="h-44 flex flex-col justify-between items-end pr-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 select-none shrink-0">
            {ticks.map((tick) => (
              <span key={tick} className="leading-none">
                {tick}
              </span>
            ))}
          </div>

          {/* Grid horizontal + Columnas alineadas desde la izquierda */}
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
                className="relative z-10 h-full grid gap-2 sm:gap-4 items-end px-1 sm:px-2"
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
                      <div className="w-full max-w-[42px] h-full flex flex-col justify-end items-center">
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
                                className="w-full rounded-md sm:rounded-lg bg-[#FF6347] shadow-xs transition-[height] duration-300"
                                style={{ height: `${Math.max(topPct, 8)}%` }}
                              />
                            )}
                            {col.bottomValue > 0 && (
                              <div
                                className="w-full rounded-md sm:rounded-lg bg-[#18191B] dark:bg-slate-200 shadow-xs transition-[height] duration-300"
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

            {/* Etiquetas eje X alineadas desde la izquierda */}
            <div
              className="grid gap-2 sm:gap-4 pt-2 px-1 sm:px-2"
              style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
            >
              {columns.map((col) => (
                <span
                  key={col.id}
                  className="text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate"
                  title={col.fullLabel}
                >
                  {col.shortLabel}
                </span>
              ))}
            </div>
          </div>
        </div>
      </TiltGlassCard>

      {hoveredCol &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed top-0 left-0 z-[9999] pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-950/92 text-white border border-white/15 shadow-xl text-[10px] leading-tight min-w-[125px] max-w-[195px] will-change-transform"
            style={{
              transform: getTooltipTransform(cursorRef.current.x, cursorRef.current.y),
            }}
          >
            <p className="font-bold text-slate-100 truncate mb-1">{hoveredCol.fullLabel}</p>
            {groupBy === 'stages' ? (
              <div className="flex items-center justify-between gap-2 text-[#FF8570] font-bold">
                <span>Cantidad:</span>
                <span className="font-mono">{hoveredCol.topValue}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 text-[#FF8570]">
                  <span>Avanzados:</span>
                  <span className="font-mono font-bold">{hoveredCol.topValue}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-slate-300">
                  <span>En Evaluación:</span>
                  <span className="font-mono font-bold">{hoveredCol.bottomValue}</span>
                </div>
                <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between gap-2 text-emerald-400 font-bold">
                  <span>Total:</span>
                  <span className="font-mono">{hoveredCol.topValue + hoveredCol.bottomValue}</span>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
