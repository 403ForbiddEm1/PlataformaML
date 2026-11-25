import React, { useMemo } from 'react';
import { Briefcase, RotateCcw, Sparkles, Users } from 'lucide-react';
import { Application, Employee, Vacancy } from '@/types';
import { TiltGlassCard } from '@/components/ui/TiltGlassCard';

export type DonutMode = 'applicants' | 'employees';

export interface DonutPerson {
  id: string;
  name: string;
  email: string;
  roleOrVacancy: string;
  status: string;
  affinity: number | null;
  salary?: number;
}

export interface DonutSegment {
  id: string;
  label: string;
  color: string;
  count: number;
  pct: number;
  avgAffinity: number | null;
  qualifiedCount: number;
  openings?: number;
  avgSalary?: number;
  people: DonutPerson[];
}

const SLICE_PALETTE = [
  '#4C6FFF',
  '#10B981',
  '#FF6347',
  '#F59E0B',
  '#A855F7',
  '#06B6D4',
  '#F43F5E',
  '#84CC16',
];

interface BuildSegmentsInput {
  mode: DonutMode;
  vacancies: Vacancy[];
  applications: Application[];
  employees: Employee[];
}

export function buildCompanyDonutSegments({
  mode,
  vacancies,
  applications,
  employees,
}: BuildSegmentsInput): DonutSegment[] {
  const affinityByEmail = new Map<string, number>();
  const affinityByCandId = new Map<string, number>();

  for (const app of applications) {
    if (typeof app.mlScore === 'number') {
      const emailKey = (app.candidateEmail || '').trim().toLowerCase();
      if (emailKey && !affinityByEmail.has(emailKey)) {
        affinityByEmail.set(emailKey, app.mlScore);
      }
      if (app.candidateId && !affinityByCandId.has(app.candidateId)) {
        affinityByCandId.set(app.candidateId, app.mlScore);
      }
    }
  }

  if (mode === 'applicants') {
    const groups = new Map<string, { label: string; openings?: number; apps: Application[] }>();

    for (const vac of vacancies) {
      groups.set(vac.id, { label: vac.title, openings: vac.openings, apps: [] });
    }

    for (const app of applications) {
      const existing = groups.get(app.vacancyId);
      if (existing) {
        existing.apps.push(app);
      } else {
        groups.set(app.vacancyId || app.vacancyTitle, {
          label: app.vacancyTitle || 'Convocatoria',
          apps: [app],
        });
      }
    }

    const nonEmpty = Array.from(groups.entries()).filter(([, g]) => g.apps.length > 0);
    const total = nonEmpty.reduce((acc, [, g]) => acc + g.apps.length, 0);

    return nonEmpty.map(([id, g], idx) => {
      const people: DonutPerson[] = g.apps.map((a) => ({
        id: a.id,
        name: a.candidateName,
        email: a.candidateEmail,
        roleOrVacancy: g.label,
        status: a.status,
        affinity: typeof a.mlScore === 'number' ? a.mlScore : null,
      }));
      const scored = people.filter((p) => p.affinity !== null);
      const avgAffinity =
        scored.length > 0
          ? Math.round(scored.reduce((s, p) => s + (p.affinity ?? 0), 0) / scored.length)
          : null;
      const qualifiedCount = scored.filter((p) => (p.affinity ?? 0) >= 75).length;

      return {
        id,
        label: g.label,
        color: SLICE_PALETTE[idx % SLICE_PALETTE.length],
        count: g.apps.length,
        pct: total > 0 ? Math.round((g.apps.length / total) * 100) : 0,
        avgAffinity,
        qualifiedCount,
        openings: g.openings,
        people,
      };
    });
  }

  // Modo 'employees': personal activo agrupado por rol/puesto en la empresa
  const activeEmployees = employees.filter((e) => e.status === 'Activo');
  const roleGroups = new Map<string, Employee[]>();

  for (const emp of activeEmployees) {
    const roleKey = (emp.role || 'Sin rol asignado').trim();
    const list = roleGroups.get(roleKey) || [];
    list.push(emp);
    roleGroups.set(roleKey, list);
  }

  const entries = Array.from(roleGroups.entries()).sort((a, b) => b[1].length - a[1].length);
  const total = activeEmployees.length;

  return entries.map(([roleLabel, emps], idx) => {
    const people: DonutPerson[] = emps.map((emp) => {
      const emailKey = (emp.email || '').trim().toLowerCase();
      const matchedScore =
        (emp.candidateId && affinityByCandId.get(emp.candidateId)) ??
        (emailKey ? affinityByEmail.get(emailKey) : undefined);

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        roleOrVacancy: roleLabel,
        status: emp.department || emp.status,
        affinity: typeof matchedScore === 'number' ? matchedScore : null,
        salary: emp.salary,
      };
    });

    const scored = people.filter((p) => p.affinity !== null);
    const avgAffinity =
      scored.length > 0
        ? Math.round(scored.reduce((s, p) => s + (p.affinity ?? 0), 0) / scored.length)
        : null;
    const qualifiedCount = scored.filter((p) => (p.affinity ?? 0) >= 75).length;
    const avgSalary =
      emps.length > 0
        ? Math.round(emps.reduce((s, e) => s + (e.salary || 0), 0) / emps.length)
        : 0;

    return {
      id: roleLabel.toLowerCase(),
      label: roleLabel,
      color: SLICE_PALETTE[idx % SLICE_PALETTE.length],
      count: emps.length,
      pct: total > 0 ? Math.round((emps.length / total) * 100) : 0,
      avgAffinity,
      qualifiedCount,
      avgSalary,
      people,
    };
  });
}

interface CompanyStatusDonutChartProps {
  mode: DonutMode;
  onModeChange: (mode: DonutMode) => void;
  segments: DonutSegment[];
  hoveredSegmentId: string | null;
  pinnedSegmentId: string | null;
  onHoverSegment: (id: string | null) => void;
  onTogglePinSegment: (id: string | null) => void;
  companyName: string;
}

/**
 * Gráfica de torta/donut interactiva en SVG puro (40%) + Caja de Resumen Contextual (60%).
 * Soporta dos modos: Postulantes por Convocatoria (por defecto) y Personal Activo por Rol.
 */
export const CompanyStatusDonutChart: React.FC<CompanyStatusDonutChartProps> = ({
  mode,
  onModeChange,
  segments,
  hoveredSegmentId,
  pinnedSegmentId,
  onHoverSegment,
  onTogglePinSegment,
  companyName,
}) => {
  const activeId = hoveredSegmentId ?? pinnedSegmentId;
  const activeSegment = useMemo(
    () => segments.find((s) => s.id === activeId) ?? null,
    [segments, activeId]
  );

  const totalCount = useMemo(
    () => segments.reduce((acc, s) => acc + s.count, 0),
    [segments]
  );

  const allPeople = useMemo(
    () => segments.flatMap((s) => s.people),
    [segments]
  );

  const globalAvgAffinity = useMemo(() => {
    const scored = allPeople.filter((p) => p.affinity !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((acc, p) => acc + (p.affinity ?? 0), 0) / scored.length);
  }, [allPeople]);

  const globalQualified = useMemo(
    () => allPeople.filter((p) => (p.affinity ?? 0) >= 75).length,
    [allPeople]
  );

  const globalAvgSalary = useMemo(() => {
    const withSalary = allPeople.filter((p) => typeof p.salary === 'number' && p.salary > 0);
    if (withSalary.length === 0) return 0;
    return Math.round(withSalary.reduce((acc, p) => acc + (p.salary ?? 0), 0) / withSalary.length);
  }, [allPeople]);

  // Geometría SVG Donut
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const arcs = useMemo(() => {
    if (totalCount === 0) return [];
    let offsetAccum = 0;
    return segments.map((seg) => {
      const ratio = seg.count / totalCount;
      const gap = segments.length > 1 ? 3 : 0;
      const dashLength = Math.max(0, ratio * circumference - gap);
      const dashOffset = -offsetAccum;
      offsetAccum += ratio * circumference;
      return {
        seg,
        dashLength,
        dashOffset,
      };
    });
  }, [segments, totalCount, circumference]);

  return (
    <div className="w-full space-y-3">
      {/* Deslizador / Selector superior encima de la torta */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Distribución de {mode === 'applicants' ? 'Postulantes por Convocatoria' : 'Personal Activo por Rol'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {mode === 'applicants'
              ? `Candidatos inscritos en cada convocatoria activa de ${companyName}.`
              : `Colaboradores activos agrupados por puesto asignado dentro de ${companyName}.`}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Modo de gráfica de distribución"
          className="inline-flex rounded-xl bg-slate-900/10 dark:bg-white/[0.06] p-1 border border-slate-300/60 dark:border-white/15 text-xs font-bold"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'applicants'}
            onClick={() => {
              onModeChange('applicants');
              onTogglePinSegment(null);
            }}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'applicants'
                ? 'bg-[#C8FF45] text-[#090A0C] shadow-xs font-extrabold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span>Postulantes (Convocatoria)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'employees'}
            onClick={() => {
              onModeChange('employees');
              onTogglePinSegment(null);
            }}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'employees'
                ? 'bg-[#C8FF45] text-[#090A0C] shadow-xs font-extrabold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Personal Activo (Rol)</span>
          </button>
        </div>
      </div>

      {/* Fila compartida: 40% Torta (lg:col-span-4) + 60% Caja Resumen (lg:col-span-6) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-5 items-stretch">
        {/* Columna 40%: Torta SVG Interactiva */}
        <TiltGlassCard
          maxTiltDeg={1.4}
          className="lg:col-span-4 rounded-2xl p-5 flex flex-col items-center justify-between gap-4"
        >
          <div className="relative z-10 w-full flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {mode === 'applicants' ? 'Por Convocatoria' : 'Por Rol Laboral'}
            </span>
            {pinnedSegmentId && (
              <button
                type="button"
                onClick={() => onTogglePinSegment(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-[#C8FF45] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ver general</span>
              </button>
            )}
          </div>

          <div className="relative z-10 w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
            <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90 overflow-visible">
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-slate-200/70 dark:text-white/10"
                strokeWidth="30"
              />
              {arcs.map(({ seg, dashLength, dashOffset }) => {
                const isFocused = activeId === seg.id;
                const isDimmed = activeId !== null && !isFocused;
                return (
                  <circle
                    key={seg.id}
                    cx="110"
                    cy="110"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isFocused ? 34 : 30}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    style={{
                      transformOrigin: '110px 110px',
                      transform: isFocused ? 'scale(1.04)' : 'scale(1)',
                      opacity: isDimmed ? 0.38 : 1,
                      transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, stroke-width 180ms ease',
                    }}
                    className="cursor-pointer"
                    onMouseEnter={() => onHoverSegment(seg.id)}
                    onMouseLeave={() => onHoverSegment(null)}
                    onClick={() => onTogglePinSegment(pinnedSegmentId === seg.id ? null : seg.id)}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              {activeSegment ? (
                <>
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {activeSegment.pct}%
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1 truncate max-w-[110px]">
                    {activeSegment.count} {activeSegment.count === 1 ? 'persona' : 'personas'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    {totalCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">
                    {mode === 'applicants' ? 'Postulantes' : 'Activos'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Leyenda interactiva compacta */}
          {segments.length === 0 ? (
            <p className="relative z-10 text-xs text-slate-500 dark:text-slate-400 text-center">
              {mode === 'applicants'
                ? 'Aún no hay postulantes registrados en las convocatorias.'
                : 'Aún no hay personal contratado activo registrado.'}
            </p>
          ) : (
            <div className="relative z-10 w-full flex flex-wrap justify-center gap-1.5">
              {segments.map((seg) => {
                const isSelected = activeId === seg.id;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onMouseEnter={() => onHoverSegment(seg.id)}
                    onMouseLeave={() => onHoverSegment(null)}
                    onClick={() => onTogglePinSegment(pinnedSegmentId === seg.id ? null : seg.id)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-[#090A0C] border-transparent'
                        : 'bg-white/50 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 border-slate-300/60 dark:border-white/15 hover:border-slate-400'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate max-w-[115px]">{seg.label}</span>
                    <span className="font-mono font-bold">{seg.pct}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </TiltGlassCard>

        {/* Columna 60%: Caja Resumen Contextual (General vs Detalle de Sección) */}
        <TiltGlassCard
          maxTiltDeg={1.2}
          className="lg:col-span-6 rounded-2xl p-5 flex flex-col justify-between gap-4 min-h-[290px]"
        >
          {activeSegment ? (
            /* ESTADO DETALLADO AL PASAR MOUSE O SELECCIONAR SECCIÓN */
            <div className="relative z-10 flex-1 flex flex-col justify-between gap-4 animate-pop-in">
              <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-white/10">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: activeSegment.color }}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {mode === 'applicants' ? 'Detalle de Convocatoria' : 'Detalle de Rol Activo'}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 truncate">
                    {activeSegment.label}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white">
                    {activeSegment.count} / {totalCount} ({activeSegment.pct}%)
                  </span>
                </div>
              </div>

              {/* Indicadores estadísticos de esa sección */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Afinidad Media
                  </span>
                  <span className="text-lg font-black text-emerald-700 dark:text-[#C8FF45]">
                    {activeSegment.avgAffinity !== null ? `${activeSegment.avgAffinity}%` : 'N/D'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Perfil ≥ 75%
                  </span>
                  <span className="text-lg font-black text-sky-700 dark:text-sky-400">
                    {activeSegment.qualifiedCount} {activeSegment.qualifiedCount === 1 ? 'apto' : 'aptos'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    {mode === 'applicants' ? 'Plazas Abiertas' : 'Sueldo Prom.'}
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white truncate block">
                    {mode === 'applicants'
                      ? activeSegment.openings ?? 1
                      : `RD$ ${(activeSegment.avgSalary || 0).toLocaleString('es-DO')}`}
                  </span>
                </div>
              </div>

              {/* Lista compacta de usuarios en esta sección con su afinidad */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                  {mode === 'applicants' ? 'Postulantes en esta convocatoria' : 'Personal en este rol'}
                </span>
                <div className="max-h-[148px] overflow-y-auto pr-1 space-y-1.5">
                  {activeSegment.people.map((person) => (
                    <div
                      key={person.id}
                      className="px-3 py-2 rounded-xl bg-white/60 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {person.name}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {person.email} · {person.status}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 shrink-0 ${
                          person.affinity === null
                            ? 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                            : person.affinity >= 75
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : person.affinity >= 50
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{person.affinity !== null ? `${person.affinity}%` : 'N/D'}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ESTADO GENERAL POR DEFECTO */
            <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-white/10">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                    Resumen Numérico General
                  </span>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    {mode === 'applicants'
                      ? 'Panorama de Postulantes por Convocatoria'
                      : 'Panorama de Personal Activo por Rol'}
                  </h4>
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Pasa el cursor o toca una porción
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    {mode === 'applicants' ? 'Total Postulantes' : 'Personal Activo'}
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{totalCount}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    {mode === 'applicants' ? 'Con Demanda' : 'Roles Activos'}
                  </span>
                  <span className="text-xl font-black text-sky-700 dark:text-sky-400">{segments.length}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Afinidad Media
                  </span>
                  <span className="text-xl font-black text-emerald-700 dark:text-[#C8FF45]">
                    {globalAvgAffinity !== null ? `${globalAvgAffinity}%` : 'N/D'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    {mode === 'applicants' ? 'Aptos ≥ 75%' : 'Sueldo Prom.'}
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white truncate block">
                    {mode === 'applicants'
                      ? globalQualified
                      : `RD$ ${globalAvgSalary.toLocaleString('es-DO')}`}
                  </span>
                </div>
              </div>

              {/* Desglose porcentual resumido por categoría */}
              {segments.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300/70 dark:border-white/15 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {mode === 'applicants'
                    ? 'Cuando los candidatos postulen a tus vacantes verás aquí el desglose por convocatoria.'
                    : 'Cuando contrates candidatos en la empresa verás aquí su proporción por rol de trabajo.'}
                </div>
              ) : (
                <div className="max-h-[140px] overflow-y-auto pr-1 space-y-2">
                  {segments.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onMouseEnter={() => onHoverSegment(seg.id)}
                      onMouseLeave={() => onHoverSegment(null)}
                      onClick={() => onTogglePinSegment(seg.id)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/50 dark:bg-white/[0.04] hover:bg-white/80 dark:hover:bg-white/[0.09] border border-slate-200/60 dark:border-white/10 transition-colors cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="truncate">{seg.label}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200 shrink-0">
                          {seg.count} ({seg.pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${Math.max(seg.pct, 4)}%`, backgroundColor: seg.color }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </TiltGlassCard>
      </div>
    </div>
  );
};
