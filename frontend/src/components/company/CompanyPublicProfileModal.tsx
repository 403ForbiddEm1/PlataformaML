import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Building2,
  Globe,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';

interface PublicCompanyData {
  id: string;
  nombre: string;
  razonSocial?: string | null;
  identificacionFiscal?: string | null;
  sector?: string | null;
  sitioWeb?: string | null;
  urlLogo?: string | null;
  descripcion?: string | null;
  correoContacto?: string | null;
  telefonoContacto?: string | null;
  direccion?: string | null;
  estado?: string;
  creadoEn?: string;
  vacantes?: Array<{
    id: string;
    titulo: string;
    departamento?: string | null;
    ubicacion?: string | null;
    modalidad?: string | null;
    cantidadVacantes?: number;
    estado?: string;
    creadoEn?: string;
  }>;
  vacantesActivas?: Array<{
    id: string;
    titulo: string;
    departamento?: string | null;
    ubicacion?: string | null;
    modalidad?: string | null;
    cantidadVacantes?: number;
    estado?: string;
    creadoEn?: string;
  }>;
  historialVacantes?: Array<{
    id: string;
    titulo: string;
    departamento?: string | null;
    ubicacion?: string | null;
    modalidad?: string | null;
    cantidadVacantes?: number;
    estado?: string;
    creadoEn?: string;
  }>;
  visibilidadPerfil?: 'PUBLICO' | 'SOLO_REGISTRADOS' | 'NADIE';
  activaHasta?: string | null;
  _count?: {
    vacantes?: number;
    postulaciones?: number;
  };
}

interface CompanyPublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string | null;
  fallbackName?: string;
  fallbackCompany?: Partial<PublicCompanyData> | null;
  readOnlyNotice?: string;
}

export const CompanyPublicProfileModal: React.FC<CompanyPublicProfileModalProps> = ({
  isOpen,
  onClose,
  companyId,
  fallbackName,
  fallbackCompany,
  readOnlyNotice = 'Perfil público de empresa · Solo lectura',
}) => {
  const [company, setCompany] = useState<PublicCompanyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setBlockedMessage(null);

    const initial: PublicCompanyData | null =
      fallbackCompany || fallbackName
        ? {
            id: companyId || fallbackCompany?.id || '',
            nombre: fallbackCompany?.nombre || fallbackName || 'Empresa',
            ...fallbackCompany,
          }
        : null;
    setCompany(initial);

    if (companyId && /^[0-9a-f-]{36}$/i.test(companyId)) {
      setLoading(true);
      api
        .get<PublicCompanyData>(`/company/public/${companyId}`)
        .then((res) => {
          if (active && res.data) {
            setCompany(res.data);
          }
        })
        .catch((err: any) => {
          if (active && (err?.status === 403 || String(err?.message || '').toLowerCase().includes('privado') || String(err?.message || '').toLowerCase().includes('iniciar sesión'))) {
            setBlockedMessage(err?.message || 'Esta empresa restringió la visibilidad de su perfil.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, companyId, fallbackName, fallbackCompany]);

  if (!isOpen) return null;

  const displayName = company?.nombre || fallbackName || 'Empresa';
  const coverLocal =
    typeof window !== 'undefined'
      ? localStorage.getItem(`nexo_company_cover_${company?.id || displayName}`) ||
        localStorage.getItem(`nexo_company_cover_${displayName}`)
      : null;
  const logoLocal =
    company?.urlLogo ||
    (typeof window !== 'undefined'
      ? localStorage.getItem(`nexo_company_logo_${company?.id || displayName}`) ||
        localStorage.getItem(`nexo_company_logo_${displayName}`)
      : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      subtitle={readOnlyNotice}
      maxWidth="2xl"
      variant="manila"
    >
      <div className="space-y-5">
        {/* Portada Horizontal + Logo 4x4 */}
        <div className="relative rounded-2xl overflow-hidden border border-[#C8B193] dark:border-white/15 bg-[#1B130C] dark:bg-[#0D111A]">
          <div className="h-32 sm:h-40 w-full relative overflow-hidden">
            {coverLocal ? (
              <img src={coverLocal} alt={`Portada de ${displayName}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#2B1D12] via-[#0B5D46]/70 to-[#141923]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-[#C8FF45] border border-[#C8FF45]/40 backdrop-blur-md">
              <Lock className="w-3 h-3" /> Solo lectura
            </span>
          </div>

          <div className="px-5 pb-4 -mt-10 relative z-10 flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-[#FCFBF8] dark:border-[#111622] bg-[#0B5D46] text-white font-black text-2xl flex items-center justify-center overflow-hidden shadow-lg shrink-0">
              {logoLocal ? (
                <img src={logoLocal} alt={`Logo ${displayName}`} className="w-full h-full object-cover" />
              ) : (
                displayName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white truncate">{displayName}</h3>
                {company?.estado && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-[#C8FF45] border border-[#C8FF45]/35">
                    {company.estado}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#EBDCC8]/85 truncate">
                {company?.sector || 'Organización afiliada a PlataformaML'}
                {company?.identificacionFiscal ? ` · RIF ${company.identificacionFiscal}` : ''}
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando perfil oficial de la empresa...
          </div>
        )}

        {blockedMessage ? (
          <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-center space-y-2">
            <Lock className="w-7 h-7 mx-auto text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-black text-amber-900 dark:text-amber-200">
              Perfil con visibilidad restringida
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
              {blockedMessage}
            </p>
          </div>
        ) : (
        <>

        {/* Descripción */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-[#DED7C8] dark:border-slate-800 space-y-2">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-[#7D5634] dark:text-[#C8FF45] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Acerca de la Empresa
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {company?.descripcion ||
              `${displayName} publica convocatorias laborales con evaluación ética de talento en PlataformaML.`}
          </p>
        </div>

        {/* Datos de Contacto y Ubicación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {company?.correoContacto && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-[#DED7C8] dark:border-slate-800 flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Correo Corporativo</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {company.correoContacto}
                </span>
              </div>
            </div>
          )}
          {company?.telefonoContacto && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-[#DED7C8] dark:border-slate-800 flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Teléfono / Telegram</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {company.telefonoContacto}
                </span>
              </div>
            </div>
          )}
          {company?.sitioWeb && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-[#DED7C8] dark:border-slate-800 flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sitio Web</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {company.sitioWeb}
                </span>
              </div>
            </div>
          )}
          {company?.direccion && (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-[#DED7C8] dark:border-slate-800 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ubicación</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {company.direccion}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Vacantes abiertas de esta empresa */}
        {company?.vacantes && company.vacantes.length > 0 && (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-[#DED7C8] dark:border-slate-800 space-y-2.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#7D5634] dark:text-[#C8FF45] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Convocatorias Activas ({company.vacantes.length})
            </h4>
            <div className="divide-y divide-[#DED7C8]/60 dark:divide-slate-800">
              {company.vacantes.map((v) => (
                <div key={v.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{v.titulo}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {v.departamento || 'General'} · {v.ubicacion || 'Remoto'}
                    </p>
                  </div>
                  {v.cantidadVacantes && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-700 dark:text-[#C8FF45] text-[10px] font-bold shrink-0">
                      {v.cantidadVacantes} {v.cantidadVacantes === 1 ? 'plaza' : 'plazas'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de Vacantes (Cerradas / Pausadas) */}
        {company?.historialVacantes && company.historialVacantes.length > 0 && (
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-[#DED7C8] dark:border-slate-800 space-y-2.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Historial de Convocatorias ({company.historialVacantes.length})
            </h4>
            <div className="divide-y divide-[#DED7C8]/60 dark:divide-slate-800">
              {company.historialVacantes.map((v) => (
                <div key={v.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{v.titulo}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {v.departamento || 'General'} · {v.ubicacion || 'Remoto'}
                      {v.creadoEn ? ` · ${new Date(v.creadoEn).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase shrink-0">
                    {v.estado || 'CERRADA'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}

        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
            Organización verificada en PlataformaML
          </span>
          <button
            type="button"
            onClick={onClose}
            className="press px-4 py-1.5 rounded-xl bg-[#EFE5D4] hover:bg-[#E2D2B8] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#3A2818] dark:text-slate-200 font-bold text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
