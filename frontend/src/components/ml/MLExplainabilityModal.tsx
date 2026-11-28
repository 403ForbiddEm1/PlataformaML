import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { MLFactorBreakdown } from '@/types';
import { ShieldCheck, CheckCircle2, XCircle, Brain, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

interface MLExplainabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  vacancyTitle: string;
  breakdown?: MLFactorBreakdown;
}

export const MLExplainabilityModal: React.FC<MLExplainabilityModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  vacancyTitle,
  breakdown,
}) => {
  if (!breakdown) return null;

  const isPendingML =
    /pendiente de evaluaci/i.test(breakdown.explanation || '') ||
    (breakdown.keyFactors || []).some((f) => /no respondi/i.test(f));

  const scoreBoxClass = isPendingML
    ? 'bg-amber-600 border-amber-700 text-white'
    : breakdown.affinityScore >= 75
    ? 'bg-[#0B5D46] border-emerald-800 text-white'
    : breakdown.affinityScore >= 60
    ? 'bg-amber-600 border-amber-700 text-white'
    : 'bg-rose-600 border-rose-700 text-white';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acta de Explicabilidad Algorítmica (XAI)"
      subtitle={`Desglose técnico de factores auditables para ${candidateName} · ${vacancyTitle}`}
      maxWidth="2xl"
      variant="manila"
    >
      <div className="space-y-5">
        {isPendingML && (
          <div className="p-3.5 rounded-xl border border-amber-400/60 bg-amber-50 dark:bg-amber-950/35 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Microservicio de Machine Learning sin respuesta durante esta postulación</p>
              <p className="text-amber-800 dark:text-amber-300/90 mt-0.5 leading-snug">
                El backend no recibió respuesta del servicio Python de ML (por ejemplo, servicio en reposo/inicio en frío o URL/clave no disponible), por lo que no se generó ningún puntaje simulado.
              </p>
            </div>
          </div>
        )}

        {/* Casilla Oficial de Puntaje */}
        <div className="p-4 rounded-xl bg-[#F4EFE4] dark:bg-slate-800/80 border border-[#C8B496] dark:border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-14 rounded-lg flex flex-col items-center justify-center border shadow-xs shrink-0 ${scoreBoxClass}`}>
              <span className="text-[9px] uppercase tracking-widest opacity-85 font-mono-tabular">
                {isPendingML ? 'ESTADO' : 'SCORE'}
              </span>
              <span className="font-mono-tabular font-bold text-lg leading-none mt-0.5">
                {isPendingML ? 'N/A' : `${breakdown.affinityScore}%`}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100">
                  Índice de Afinidad Ponderado
                </span>
                {isPendingML ? (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 px-2 py-0.5 rounded-md font-semibold">
                    <AlertTriangle className="w-3 h-3" /> Pendiente de ML
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                    <Sparkles className="w-3 h-3" /> Evaluación Objetiva
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Calculado mediante similitud vectorial de competencias y clasificación supervisada auditada.
              </p>
            </div>
          </div>
        </div>

        {/* Dimension Breakdown Progress Bars (RF07: Factores Clave) */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Desglose Proporcional por Dimensión
          </h4>

          {/* Experiencia */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#DED7C8] dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#0B5D46] dark:text-emerald-400" /> Experiencia Laboral en Roles Afines
              </span>
              <span className="font-mono-tabular text-[#0B5D46] dark:text-emerald-400 font-bold">
                {breakdown.experienceMatch}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-sm overflow-hidden">
              <div
                className="bg-[#0B5D46] dark:bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${breakdown.experienceMatch}%` }}
              />
            </div>
          </div>

          {/* Formación */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#DED7C8] dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-sky-700 dark:text-sky-400" /> Formación Académica & Certificaciones
              </span>
              <span className="font-mono-tabular text-sky-800 dark:text-sky-300 font-bold">
                {breakdown.educationMatch}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-sm overflow-hidden">
              <div
                className="bg-sky-600 h-full transition-all duration-500"
                style={{ width: `${breakdown.educationMatch}%` }}
              />
            </div>
          </div>

          {/* Habilidades Técnicas */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#DED7C8] dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-700 dark:text-indigo-400" /> Coincidencia de Habilidades Técnicas
              </span>
              <span className="font-mono-tabular text-indigo-800 dark:text-indigo-300 font-bold">
                {breakdown.skillsMatch}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-sm overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-500"
                style={{ width: `${breakdown.skillsMatch}%` }}
              />
            </div>
          </div>
        </div>

        {/* Skills Matched vs Missing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
            <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Competencias Verificadas ({breakdown.matchingSkills.length})
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {breakdown.matchingSkills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded text-xs font-medium text-emerald-900 dark:text-emerald-300"
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#DED7C8] dark:border-slate-800 bg-white dark:bg-slate-900">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-slate-400" /> Brechas o Competencias por Desarrollar
            </h5>
            {breakdown.missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {breakdown.missingSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    − {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Sin brechas detectadas. El candidato cubre todas las competencias clave.
              </p>
            )}
          </div>
        </div>

        {/* Model Qualitative Interpretation */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#DED7C8] dark:border-slate-800 space-y-2.5">
          <div>
            <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Dictamen Técnico del Modelo
            </h5>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif-editorial italic">
              "{breakdown.explanation}"
            </p>
          </div>
          {breakdown.keyFactors && breakdown.keyFactors.length > 0 && (
            <ul className="pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
              {breakdown.keyFactors.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          )}
        </div>

        {/* RNF03: Fairness Guarantee Box */}
        <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 flex items-start gap-3 text-xs text-sky-950 dark:text-sky-200">
          <ShieldCheck className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Garantía de Equidad y Cero Sesgo Demográfico</p>
            <p className="text-sky-800 dark:text-sky-300 mt-0.5 leading-snug">
              Este puntaje ha sido generado sin considerar género, edad, fotografía ni estado civil, cumpliendo con los estándares éticos de PlataformaML.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
