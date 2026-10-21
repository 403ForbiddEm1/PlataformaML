import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { MLFactorBreakdown } from '@/types';
import { ShieldCheck, CheckCircle2, XCircle, Brain, Sparkles, TrendingUp } from 'lucide-react';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Explicabilidad del Modelo de Aprendizaje Automático"
      subtitle={`Desglose de factores que influyeron en el puntaje de ${candidateName} para ${vacancyTitle}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Main Score Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50/30 border border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-emerald-500/25">
              {breakdown.affinityScore}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide uppercase text-emerald-800">
                  Índice de Afinidad Ponderado
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                  <Sparkles className="w-3 h-3" /> Alta Compatibilidad
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Calculado mediante similitud vectorial de competencias y clasificación con RandomForest v2.4.
              </p>
            </div>
          </div>
        </div>

        {/* Dimension Breakdown Progress Bars */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Factores Clave Evaluados (RF07)
          </h4>

          {/* Experiencia */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Experiencia Laboral en Roles Afines
              </span>
              <span className="text-emerald-700 font-bold">{breakdown.experienceMatch}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${breakdown.experienceMatch}%` }}
              />
            </div>
          </div>

          {/* Formación */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-sky-600" /> Formación Académica & Certificaciones
              </span>
              <span className="text-sky-700 font-bold">{breakdown.educationMatch}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${breakdown.educationMatch}%` }}
              />
            </div>
          </div>

          {/* Habilidades Técnicas */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" /> Coincidencia de Habilidades Técnicas
              </span>
              <span className="text-purple-700 font-bold">{breakdown.skillsMatch}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${breakdown.skillsMatch}%` }}
              />
            </div>
          </div>
        </div>

        {/* Skills Matched vs Missing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40">
            <h5 className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Habilidades Cumplidas ({breakdown.matchingSkills.length})
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {breakdown.matchingSkills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-white border border-emerald-200 rounded-md text-xs font-medium text-emerald-800 shadow-2xs"
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-slate-400" /> Brechas o Habilidades Faltantes
            </h5>
            {breakdown.missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {breakdown.missingSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-600 shadow-2xs"
                  >
                    ✗ {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-700 font-medium">
                Sin brechas detectadas. El candidato cubre todas las competencias clave.
              </p>
            )}
          </div>
        </div>

        {/* Model Qualitative Interpretation */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Interpretación Textual del Algoritmo
          </h5>
          <p className="text-xs text-slate-600 leading-relaxed italic">
            "{breakdown.explanation}"
          </p>
        </div>

        {/* Fairness Guarantee Box (RNF03) */}
        <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 flex items-start gap-3 text-xs text-sky-900">
          <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Garantía de Equidad y Cero Sesgo (RNF03)</p>
            <p className="text-sky-800 mt-0.5 leading-snug">
              Este puntaje ha sido generado de manera objetiva sin considerar género, edad, fotografía, estado civil ni
              ningún otro dato protegido, conforme a los principios éticos y requerimientos del proyecto.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
