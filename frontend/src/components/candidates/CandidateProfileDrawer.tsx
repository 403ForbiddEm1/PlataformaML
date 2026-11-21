import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Code2,
  EyeOff,
  FileText,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Application, CandidateProfile } from '@/types';
import {
  candidatesService,
  DEFAULT_VISIBILITY,
  getCandidateVisibility,
} from '@/services/candidates.service';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MLScoreBadge } from '@/components/ml/MLScoreBadge';

interface CandidateProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  onOpenExplainability?: (app: Application) => void;
  onOpenChat?: (app: Application) => void;
  onOpenFullApplication?: (app: Application) => void;
}

/**
 * Cajón deslizante desde el LADO IZQUIERDO para Admin de Empresa y RRHH.
 * Muestra el perfil curricular del candidato en modo ESTRICTAMENTE SOLO LECTURA
 * y respeta la configuración de visibilidad que el candidato haya elegido.
 */
export const CandidateProfileDrawer: React.FC<CandidateProfileDrawerProps> = ({
  isOpen,
  onClose,
  application,
  onOpenExplainability,
  onOpenChat,
  onOpenFullApplication,
}) => {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    if (!isOpen || !application) {
      return;
    }
    let active = true;
    candidatesService.getProfile(application.candidateEmail).then((prof) => {
      if (active) setProfile(prof);
    });
    return () => {
      active = false;
    };
  }, [isOpen, application]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !application) return null;

  const vis = profile?.visibility || getCandidateVisibility(application.candidateEmail) || DEFAULT_VISIBILITY;
  const fullName =
    application.candidateName ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    'Candidato';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const photoUrl =
    profile?.photoUrl ||
    localStorage.getItem(`nexo_photo_by_email_${(application.candidateEmail || '').trim().toLowerCase()}`) ||
    null;

  const matchingSkills = application.mlBreakdown?.matchingSkills || [];
  const skillsList =
    profile?.skills && profile.skills.length > 0
      ? profile.skills
      : matchingSkills;

  return (
    <div className="fixed inset-0 z-[70] flex justify-start">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#090A0C]/65 backdrop-blur-sm modal-animate-backdrop"
        aria-hidden="true"
      />

      {/* Panel que se abre desde el LADO IZQUIERDO */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${fullName}`}
        className="relative z-10 w-full max-w-xl h-full bg-[#FCFBF8] dark:bg-[#0D111A] border-r-2 border-[#C8B193] dark:border-[#232D42] text-[#3A2818] dark:text-[#F1F2EC] shadow-[20px_0_60px_rgba(0,0,0,0.55)] flex flex-col overflow-hidden animate-in slide-in-from-left duration-300"
      >
        {/* Aviso superior de SOLO LECTURA */}
        <div className="px-5 py-2.5 bg-[#261B12] dark:bg-[#090A0C] border-b border-[#C8B193]/30 dark:border-[#F1F2EC]/10 flex items-center justify-between gap-2 text-[11px] text-[#E6B87A] dark:text-[#C8FF45]">
          <span className="inline-flex items-center gap-1.5 font-mono-tabular font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Vista de solo lectura · Solo el candidato puede editar su perfil</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="press p-1 rounded-lg text-[#F6EEE2]/80 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar perfil"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cabecera del candidato */}
        <div className="p-5 sm:p-6 bg-[#EFE5D4]/85 dark:bg-[#141925] border-b border-[#C8B193] dark:border-[#232D42] flex items-start gap-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={fullName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#0B5D46] dark:border-[#C8FF45] shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#0B5D46] dark:bg-[#4C6FFF] text-white font-black text-lg flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-black text-[#3A2818] dark:text-[#F1F2EC] truncate">{fullName}</h2>
              <Badge status={application.status} />
            </div>
            <p className="text-xs font-bold text-[#0B5D46] dark:text-[#C8FF45]">
              {profile?.title || `Postulante a ${application.vacancyTitle}`}
            </p>
            <p className="text-[11px] text-[#70553B] dark:text-[#9A9B94]">
              Convocatoria: <strong className="text-[#3A2818] dark:text-[#F1F2EC]">{application.vacancyTitle}</strong>
            </p>
          </div>
        </div>

        {/* Cuerpo desplazable del perfil */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {!vis.profileVisible ? (
            <div className="p-6 rounded-2xl border border-dashed border-[#C8B193] dark:border-[#232D42] bg-[#F6EEE2]/60 dark:bg-[#141925] text-center space-y-2">
              <EyeOff className="w-8 h-8 mx-auto text-[#70553B] dark:text-[#9A9B94]" />
              <h4 className="text-sm font-bold text-[#3A2818] dark:text-[#F1F2EC]">
                El candidato configuró su perfil público como privado
              </h4>
              <p className="text-xs text-[#70553B] dark:text-[#9A9B94]">
                Solo se muestran los datos esenciales de su postulación a esta vacante.
              </p>
            </div>
          ) : (
            <>
              {/* Puntaje de Afinidad ML de esta postulación */}
              <div className="p-4 rounded-2xl bg-[#F6EEE2] dark:bg-[#141925] border border-[#C8B193] dark:border-[#232D42] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                    Afinidad Algorítmica (Modelo IA)
                  </span>
                  <p className="text-xs text-[#3A2818] dark:text-[#F1F2EC]">
                    {application.mlBreakdown?.explanation ||
                      'Evaluación curricular objetiva sin sesgos demográficos.'}
                  </p>
                </div>
                <MLScoreBadge
                  score={typeof application.mlScore === 'number' ? application.mlScore : 0}
                  size="lg"
                  onClick={() => onOpenExplainability && onOpenExplainability(application)}
                />
              </div>

              {/* Contacto y Ubicación (respetando visibilidad del candidato) */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                  <span>Contacto y Ubicación</span>
                </h3>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#141925] border border-[#C8B193]/70 dark:border-[#232D42] flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#3A2818] dark:text-[#F1F2EC] truncate">
                      <Mail className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      {vis.showEmail ? (
                        application.candidateEmail || profile?.email
                      ) : (
                        <span className="italic text-[#70553B] dark:text-[#9A9B94] inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Oculto por el candidato
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-[#70553B] dark:text-[#777873]">Correo</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#141925] border border-[#C8B193]/70 dark:border-[#232D42] flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#3A2818] dark:text-[#F1F2EC] truncate">
                      <Phone className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      {vis.showPhone ? (
                        application.candidatePhone || profile?.phone || 'No especificado'
                      ) : (
                        <span className="italic text-[#70553B] dark:text-[#9A9B94] inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Oculto por el candidato
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-[#70553B] dark:text-[#777873]">Telegram</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#141925] border border-[#C8B193]/70 dark:border-[#232D42] flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#3A2818] dark:text-[#F1F2EC] truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      {vis.showLocation ? (
                        profile?.location || 'Ubicación no especificada'
                      ) : (
                        <span className="italic text-[#70553B] dark:text-[#9A9B94] inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Oculto por el candidato
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-[#70553B] dark:text-[#777873]">Ubicación</span>
                  </div>
                </div>
              </div>

              {/* Biografía */}
              {profile?.bio && (
                <div className="p-4 rounded-xl bg-[#F6EEE2]/65 dark:bg-[#141925] border border-[#C8B193]/70 dark:border-[#232D42] text-xs italic text-[#3A2818] dark:text-[#E5D6BE] leading-relaxed">
                  “{profile.bio}”
                </div>
              )}

              {/* Habilidades */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                  <span>Habilidades y Competencias</span>
                </h3>
                {!vis.showSkills ? (
                  <p className="p-3 rounded-xl bg-white dark:bg-[#141925] border border-dashed border-[#C8B193] dark:border-[#232D42] text-xs italic text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" /> Sección marcada como no visible por el candidato.
                  </p>
                ) : skillsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((sk) => (
                      <span
                        key={sk}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EFE5D4] dark:bg-[#1B2233] text-[#3A2818] dark:text-[#C8FF45] border border-[#C8B193] dark:border-[#232D42]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#70553B] dark:text-[#777873]">Sin habilidades registradas.</p>
                )}
              </div>

              {/* Experiencia Laboral */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                  <span>Experiencia Laboral</span>
                </h3>
                {!vis.showExperience ? (
                  <p className="p-3 rounded-xl bg-white dark:bg-[#141925] border border-dashed border-[#C8B193] dark:border-[#232D42] text-xs italic text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" /> Sección marcada como no visible por el candidato.
                  </p>
                ) : profile?.experience && profile.experience.length > 0 ? (
                  <div className="space-y-2">
                    {profile.experience.map((exp, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#141925] border border-[#C8B193]/70 dark:border-[#232D42] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#3A2818] dark:text-[#F1F2EC]">{exp.role}</span>
                          <span className="text-[10px] font-mono-tabular text-[#70553B] dark:text-[#9A9B94]">
                            {exp.period}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#0B5D46] dark:text-[#C8FF45]">{exp.company}</p>
                        {exp.description && (
                          <p className="text-[11px] text-[#70553B] dark:text-[#9A9B94] leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#70553B] dark:text-[#777873]">
                    Ver detalle en el documento CV adjunto ({application.cvFileName || 'Curriculum.pdf'}).
                  </p>
                )}
              </div>

              {/* Formación Académica */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                  <span>Formación Académica</span>
                </h3>
                {!vis.showEducation ? (
                  <p className="p-3 rounded-xl bg-white dark:bg-[#141925] border border-dashed border-[#C8B193] dark:border-[#232D42] text-xs italic text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" /> Sección marcada como no visible por el candidato.
                  </p>
                ) : profile?.education && profile.education.length > 0 ? (
                  <div className="space-y-2">
                    {profile.education.map((edu, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#141925] border border-[#C8B193]/70 dark:border-[#232D42] flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#3A2818] dark:text-[#F1F2EC]">{edu.degree}</p>
                          <p className="text-[11px] text-[#70553B] dark:text-[#9A9B94]">{edu.institution}</p>
                        </div>
                        <span className="text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded bg-[#EFE5D4] dark:bg-white/10">
                          {edu.graduationYear}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#70553B] dark:text-[#777873]">
                    Ver formación en el CV adjunto.
                  </p>
                )}
              </div>

              {/* Documentos de la postulación */}
              <div className="p-3.5 rounded-xl bg-[#EFE5D4]/60 dark:bg-[#141925] border border-[#C8B193] dark:border-[#232D42] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                  <span className="font-semibold truncate">
                    {application.cvFileName || profile?.cvFileName || 'Curriculum_Vitae.pdf'}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B5D46] dark:text-[#C8FF45] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verificado
                </span>
              </div>
            </>
          )}
        </div>

        {/* Pie de acciones operativas sobre la postulación (sin modificar el perfil) */}
        <div className="p-4 bg-[#EFE5D4] dark:bg-[#141925] border-t border-[#C8B193] dark:border-[#232D42] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onOpenChat && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onClose();
                  onOpenChat(application);
                }}
                leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
              >
                Mensaje / Telegram
              </Button>
            )}
            {onOpenExplainability && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenExplainability(application);
                }}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Factores IA
              </Button>
            )}
            {onOpenFullApplication && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenFullApplication(application);
                }}
              >
                Historial y Estado
              </Button>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </aside>
    </div>
  );
};
