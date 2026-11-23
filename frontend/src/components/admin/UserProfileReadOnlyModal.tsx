import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Building2,
  Calendar,
  Award,
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AdminUserProfileResponse {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  activo: boolean;
  creadoEn: string;
  empresa: {
    id: string;
    nombre: string;
    rif?: string | null;
    sector?: string | null;
    dominio?: string | null;
    estado?: string | null;
  } | null;
  perfilCandidato: {
    id: string;
    nombres?: string;
    apellidos?: string;
    fotoUrl?: string | null;
    titulo?: string | null;
    resumen?: string | null;
    ubicacion?: string | null;
    telefono?: string | null;
    habilidades?: string[];
    educacion?: Array<{
      id?: string;
      institucion?: string;
      titulo?: string;
      anioGraduacion?: string;
    }>;
    experiencia?: Array<{
      id?: string;
      empresa?: string;
      cargo?: string;
      periodo?: string;
      descripcion?: string;
    }>;
    documentos?: Array<{
      id: string;
      tipo: string;
      nombreArchivo: string;
      creadoEn: string;
    }>;
  } | null;
  postulaciones: Array<{
    id: string;
    estado: string;
    creadoEn: string;
    vacante: {
      id: string;
      titulo: string;
      empresa?: { nombre: string } | null;
    } | null;
    prediccion?: {
      puntuacion?: number;
      afinidad?: string;
    } | null;
  }>;
}

interface UserProfileReadOnlyModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onViewCompany?: (companyId: string) => void;
}

export const UserProfileReadOnlyModal: React.FC<UserProfileReadOnlyModalProps> = ({
  userId,
  isOpen,
  onClose,
  onViewCompany,
}) => {
  const [profile, setProfile] = useState<AdminUserProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<AdminUserProfileResponse>(`/admin/users/${userId}/profile`)
      .then((res) => {
        if (!cancelled) {
          setProfile(res.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'No se pudo cargar el perfil del usuario.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  const roleLabel = (rol: string) => {
    const r = (rol || '').toUpperCase();
    if (r === 'SUPERADMIN') return 'Admin Global';
    if (r === 'ADMIN' || r === 'ADMINISTRADOR') return 'Admin Empresa';
    if (r === 'RRHH') return 'Recursos Humanos';
    return 'Candidato';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profile ? profile.nombre : 'Perfil de Usuario'}
      subtitle="Vista de auditoría — Solo lectura (no editable por Superadmin)"
      maxWidth="2xl"
      variant="manila"
    >
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Cargando expediente real desde Neon...</p>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && profile && (
        <div className="space-y-5 text-xs">
          {/* Read-only notice */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Modo solo lectura — Los datos provienen directamente de la base de datos y no pueden modificarse aquí.
            </span>
            <span className="font-mono text-[10px] opacity-80">
              {profile.activo ? 'ACTIVO' : 'INACTIVO'}
            </span>
          </div>

          {/* Header identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-[#c8b193]/60 dark:border-white/10">
            {profile.perfilCandidato?.fotoUrl ? (
              <img
                src={profile.perfilCandidato.fotoUrl}
                alt={profile.nombre}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shrink-0">
                {(profile.nombre || 'US').slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {profile.nombre}
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                  {roleLabel(profile.rol)}
                </span>
              </div>

              {profile.perfilCandidato?.titulo && (
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {profile.perfilCandidato.titulo}
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  {profile.email}
                </span>
                {(profile.telefono || profile.perfilCandidato?.telefono) && (
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {profile.telefono || profile.perfilCandidato?.telefono}
                  </span>
                )}
                {profile.perfilCandidato?.ubicacion && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    {profile.perfilCandidato.ubicacion}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Registro: {new Date(profile.creadoEn).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Affiliated Company */}
          {profile.empresa && (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                    Empresa Afiliada
                  </span>
                  <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                    {profile.empresa.nombre}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {[profile.empresa.sector, profile.empresa.rif ? `RIF: ${profile.empresa.rif}` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Organización registrada'}
                  </p>
                </div>
              </div>
              {onViewCompany && (
                <button
                  type="button"
                  onClick={() => onViewCompany(profile.empresa!.id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shrink-0"
                >
                  Ver Empresa
                </button>
              )}
            </div>
          )}

          {/* Candidate Profile Details */}
          {profile.perfilCandidato && (
            <div className="space-y-4">
              {profile.perfilCandidato.resumen && (
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-white/10 space-y-1.5">
                  <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Resumen Profesional
                  </h5>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {profile.perfilCandidato.resumen}
                  </p>
                </div>
              )}

              {Array.isArray(profile.perfilCandidato.habilidades) &&
                profile.perfilCandidato.habilidades.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-white/10 space-y-2">
                    <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Habilidades ({profile.perfilCandidato.habilidades.length})
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.perfilCandidato.habilidades.map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-semibold text-[11px]"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {Array.isArray(profile.perfilCandidato.experiencia) &&
                profile.perfilCandidato.experiencia.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-white/10 space-y-2.5">
                    <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      Experiencia Laboral ({profile.perfilCandidato.experiencia.length})
                    </h5>
                    <div className="space-y-2.5">
                      {profile.perfilCandidato.experiencia.map((exp, idx) => (
                        <div
                          key={exp.id || idx}
                          className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {exp.cargo || 'Cargo'}
                            </span>
                            {exp.periodo && (
                              <span className="text-[10px] font-mono text-slate-500">{exp.periodo}</span>
                            )}
                          </div>
                          {exp.empresa && (
                            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              {exp.empresa}
                            </p>
                          )}
                          {exp.descripcion && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                              {exp.descripcion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {Array.isArray(profile.perfilCandidato.educacion) &&
                profile.perfilCandidato.educacion.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-white/10 space-y-2.5">
                    <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                      Formación Académica ({profile.perfilCandidato.educacion.length})
                    </h5>
                    <div className="space-y-2">
                      {profile.perfilCandidato.educacion.map((edu, idx) => (
                        <div
                          key={edu.id || idx}
                          className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 flex justify-between items-start gap-2"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              {edu.titulo || 'Título'}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {edu.institucion}
                            </p>
                          </div>
                          {edu.anioGraduacion && (
                            <span className="text-[10px] font-mono text-slate-500 shrink-0">
                              {edu.anioGraduacion}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {Array.isArray(profile.perfilCandidato.documentos) &&
                profile.perfilCandidato.documentos.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-white/10 space-y-2">
                    <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Documentos Cargados ({profile.perfilCandidato.documentos.length})
                    </h5>
                    <div className="space-y-1.5">
                      {profile.perfilCandidato.documentos.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {doc.nombreArchivo}
                          </span>
                          <span className="text-[10px] font-mono uppercase text-slate-500 shrink-0 ml-2">
                            {doc.tipo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Postulaciones */}
          {Array.isArray(profile.postulaciones) && profile.postulaciones.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-white/10 space-y-2.5">
              <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                Historial de Postulaciones ({profile.postulaciones.length})
              </h5>
              <div className="space-y-2">
                {profile.postulaciones.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {p.vacante?.titulo || 'Vacante'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {p.vacante?.empresa?.nombre || 'Empresa'} · {new Date(p.creadoEn).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof p.prediccion?.puntuacion === 'number' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[10px]">
                          ML: {Math.round(p.prediccion.puntuacion)}%
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {p.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
