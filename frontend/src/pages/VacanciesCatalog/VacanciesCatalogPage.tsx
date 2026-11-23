import React, { useEffect, useState } from 'react';
import { Empresa, Vacancy } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { vacanciesService } from '@/services/vacancies.service';
import { empresaService } from '@/services/empresa.service';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CompanyPublicProfileModal } from '@/components/company/CompanyPublicProfileModal';
import {
  Search,
  MapPin,
  Building2,
  ChevronRight,
  Folder,
  FolderOpen,
  Paperclip,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';

interface VacanciesCatalogPageProps {
  onNavigate: (view: string) => void;
  onSelectVacancy: (vacancy: Vacancy) => void;
}

const HERO_SLIDES = [
  '/images/hero-slide-1.jpg',
  '/images/hero-slide-2.jpg',
  '/images/hero-slide-3.jpg',
  '/images/login-workspace.jpg',
];

export const VacanciesCatalogPage: React.FC<VacanciesCatalogPageProps> = ({
  onNavigate,
  onSelectVacancy,
}) => {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [search, setSearch] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [selectedModalVacancy, setSelectedModalVacancy] = useState<Vacancy | null>(null);
  const [viewCompanyProfile, setViewCompanyProfile] = useState<{ id?: string; name?: string } | null>(null);
  const [slideState, setSlideState] = useState<{
    current: number;
    previous: number | null;
    tick: number;
  }>({ current: 0, previous: null, tick: 0 });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlideState((prev) => ({
        current: (prev.current + 1) % HERO_SLIDES.length,
        previous: prev.current,
        tick: prev.tick + 1,
      }));
    }, 5500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    vacanciesService.getAll().then((data) => {
      setVacancies(data);
    });
    empresaService.getAll().then(setCompanies);
  }, []);

  const filtered = vacancies.filter((v) => {
    if (workModeFilter !== 'all' && v.workMode !== workModeFilter) return false;
    if (companyFilter !== 'all' && v.empresaId !== companyFilter && v.empresaNombre !== companyFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        v.department.toLowerCase().includes(q) ||
        (v.empresaNombre && v.empresaNombre.toLowerCase().includes(q)) ||
        v.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans transition-colors">
      <Navbar onNavigate={onNavigate} currentView="vacancies" />

      {/* Glassmorphic Header & Search Ledger with Automatic Left-to-Right Sliding Background */}
      <section className="relative overflow-hidden border-b border-[#777873]/25 dark:border-[#F1F2EC]/10 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 slide-left-item">
        {/* Sliding Photo Carousel Background (no manual controls, left -> right continuous flow) */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          {slideState.previous !== null && (
            <img
              key={`hero-exit-${slideState.previous}-${slideState.tick}`}
              src={HERO_SLIDES[slideState.previous]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center grayscale contrast-110 animate-hero-slide-out"
            />
          )}
          <img
            key={`hero-enter-${slideState.current}-${slideState.tick}`}
            src={HERO_SLIDES[slideState.current]}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover object-center grayscale contrast-110 ${
              slideState.tick > 0 ? 'animate-hero-slide-in' : ''
            }`}
          />
          {/* Atmospheric Scrim Layer preserving readability in both light and dark modes */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F1F2EC]/90 via-[#F1F2EC]/74 to-[#F1F2EC]/86 dark:from-[#090A0C]/90 dark:via-[#090A0C]/72 dark:to-[#090A0C]/86 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-7xl 2xl:max-w-[1560px] mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#090A0C]/80 dark:bg-[#F1F2EC]/8 text-[#C8FF45] text-[11px] font-mono-tabular font-semibold border border-[#C8FF45]/35 uppercase tracking-wider backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF45]" />
                <span>CATÁLOGO DE CONVOCATORIAS · EVALUACIÓN ÉTICA SIN SESGOS</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-[1.12]">
                Expedientes de Convocatorias Abiertas
              </h1>
              <p className="text-xs sm:text-sm text-[#777873] max-w-2xl leading-relaxed">
                Explora las posiciones activas de empresas afiliadas a <strong className="text-[#090A0C] dark:text-[#F1F2EC] font-semibold">PlataformaML</strong>. Cada postulación es analizada objetivamente según tus competencias técnicas y trayectoria verificable.
              </p>
            </div>

            {/* Summary Ledger Counter */}
            <div className="flex items-center gap-5 px-5 py-3.5 rounded-2xl glass-panel shrink-0 self-start lg:self-end">
              <div>
                <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#777873] block">
                  CONVOCATORIAS
                </span>
                <span className="text-2xl font-mono-tabular font-bold text-[#090A0C] dark:text-[#F1F2EC]">
                  {filtered.length}
                </span>
              </div>
              <div className="w-px h-8 bg-[#777873]/30" />
              <div>
                <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#777873] block">
                  EMPRESAS
                </span>
                <span className="text-2xl font-mono-tabular font-bold text-[#4C6FFF] dark:text-[#C8FF45]">
                  {companies.length || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-2.5 rounded-2xl glass-panel flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777873] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por cargo, departamento, empresa o habilidad (Python, SQL, React...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-[#F1F2EC]/80 dark:bg-[#090A0C]/80 text-[#090A0C] dark:text-[#F1F2EC] border border-[#777873]/35 rounded-xl outline-none transition-all focus:border-[#4C6FFF] dark:focus:border-[#C8FF45]"
              />
            </div>

            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="text-xs font-semibold px-3.5 py-2 bg-[#F1F2EC]/80 dark:bg-[#090A0C]/80 text-[#090A0C] dark:text-[#F1F2EC] border border-[#777873]/35 rounded-xl outline-none cursor-pointer focus:border-[#4C6FFF] dark:focus:border-[#C8FF45]"
            >
              <option value="all">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)}
              className="text-xs font-semibold px-3.5 py-2 bg-[#F1F2EC]/80 dark:bg-[#090A0C]/80 text-[#090A0C] dark:text-[#F1F2EC] border border-[#777873]/35 rounded-xl outline-none cursor-pointer focus:border-[#4C6FFF] dark:focus:border-[#C8FF45]"
            >
              <option value="all">Todas las modalidades</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Presencial">Presencial</option>
              <option value="Remoto">Remoto</option>
            </select>
          </div>
        </div>
      </section>

      {/* List of Vacancies as Archival Manila Expediente Folders */}
      <main className="max-w-7xl 2xl:max-w-[1560px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-[#777873]">
          <span className="font-medium">
            Mostrando <strong className="font-mono-tabular text-[#090A0C] dark:text-[#F1F2EC]">{filtered.length}</strong> expedientes de convocatorias activas
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">¿Representas a una organización?</span>
            <button
              type="button"
              onClick={() => {
                if (user?.role === 'admin' || user?.role === 'administrador' || user?.role === 'rrhh') {
                  onNavigate('hr-dashboard');
                } else {
                  onNavigate('login');
                }
              }}
              className="text-[#4C6FFF] dark:text-[#C8FF45] font-semibold hover:underline cursor-pointer"
            >
              Gestionar convocatorias →
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-14 bg-[#FCFBF8] dark:bg-slate-900 rounded-2xl border border-[#D8D2C5] dark:border-slate-800 p-8 space-y-4">
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              No se encontraron expedientes de vacantes con los criterios seleccionados.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setCompanyFilter('all');
                setWorkModeFilter('all');
              }}
            >
              Restablecer filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 items-stretch">
            {filtered.map((vac) => (
              <div
                key={vac.id}
                onClick={() => setSelectedModalVacancy(vac)}
                className="relative group transition-all duration-200 manila-folder-perspective cursor-pointer flex flex-col"
              >
                {/* Manila Folder Upper-Left Identifier Tab + 3D Back Cover Lip */}
                <div className="flex items-end justify-start pl-0 pr-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewCompanyProfile({
                        id: vac.empresaId || vac.companyId,
                        name: vac.empresaNombre || vac.companyName || 'PlataformaML Corporativo',
                      });
                    }}
                    title="Ver perfil de la empresa"
                    className="manila-folder-tab-3d relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg bg-[#E5D6BE] dark:bg-[#29211A] border-t border-x border-[#C8B496] dark:border-[#46372B] text-[11px] font-bold text-[#3A2818] dark:text-[#EBDCC8] cursor-pointer select-none hover:bg-[#DDD0B8] dark:hover:bg-[#332920] transition-colors"
                  >
                    <Folder className="w-3.5 h-3.5 text-[#7D5634] dark:text-[#C4A482]" />
                    <span className="truncate max-w-[170px] sm:max-w-[220px] underline decoration-dotted underline-offset-2">
                      {vac.empresaNombre || 'PlataformaML Corporativo'}
                    </span>
                    <span className="text-[#9C7E5E] dark:text-[#7D654F]">·</span>
                    <span className="uppercase text-[10px] font-mono-tabular tracking-wider text-[#6E5236] dark:text-[#CBB399]">
                      {vac.department}
                    </span>
                  </button>
                  <div
                    aria-hidden="true"
                    className="h-2.5 flex-1 -ml-1 rounded-tr-xl bg-[#D8C3A5] dark:bg-[#2A2018] border-t border-r border-[#C4AE8D] dark:border-[#46372B] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,236,200,0.08)]"
                  />
                </div>

                {/* Archivo Cerrado: solo portada y resumen de responsabilidades */}
                <div className="manila-folder-body-3d flex-1 rounded-xl rounded-tl-none p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between gap-4 group-hover:ring-1 group-hover:ring-[#0B5D46]/40 dark:group-hover:ring-[#C8FF45]/40 transition-all">
                  <div
                    aria-hidden="true"
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DFCBB0]/80 via-[#F4E7D2]/90 to-[#D4BE9E]/80 dark:from-[#32271E] dark:via-[#3E3025] dark:to-[#271E17]"
                  />

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#FCFBF8] dark:bg-[#141923] text-[#4A3520] dark:text-[#DEC9A7] border border-[#D5C3A5] dark:border-[#3D3024]">
                        {vac.workMode}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#FCFBF8] dark:bg-[#141923] text-[#4A3520] dark:text-[#DEC9A7] border border-[#D5C3A5] dark:border-[#3D3024]">
                        {vac.type}
                      </span>
                      {vac.openings && (
                        <span className="text-[11px] font-mono-tabular font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/70">
                          {vac.openings} {vac.openings === 1 ? 'plaza' : 'plazas'}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#261A0F] dark:text-[#F8EEE0] tracking-tight group-hover:text-[#0B5D46] dark:group-hover:text-[#C8FF45] transition-colors">
                        {vac.title}
                      </h3>
                      <p className="text-xs text-[#664C34] dark:text-[#BAA085] flex items-center gap-2 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#85613C] dark:text-[#C4A482] shrink-0" />
                        <span className="truncate">{vac.location}</span>
                        <span>·</span>
                        <span className="font-mono-tabular text-[11px] shrink-0">
                          EXP-{(vac.id || '01').slice(0, 6).toUpperCase()}
                        </span>
                      </p>
                    </div>

                    <div className="pt-1 border-t border-[#D5C3A5]/70 dark:border-[#3D3024]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D5634] dark:text-[#C4A482] block mb-1">
                        Resumen de Responsabilidades
                      </span>
                      <p className="text-xs text-[#4A3520] dark:text-[#D5C3AA] line-clamp-3 leading-relaxed">
                        {vac.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-[#7D5634] dark:text-[#BAA085] font-medium inline-flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Expediente cerrado</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E2D2B8] group-hover:bg-[#0B5D46] group-hover:text-white dark:bg-[#2F251D] dark:group-hover:bg-[#C8FF45] dark:group-hover:text-[#090A0C] text-[#3A2818] dark:text-[#F0DFC8] border border-[#C4AE8D] dark:border-[#4A3B2E] font-bold text-xs transition-colors">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Abrir convocatoria</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal con el expediente completo de la convocatoria y botón de postularse abajo */}
      <Modal
        isOpen={Boolean(selectedModalVacancy)}
        onClose={() => setSelectedModalVacancy(null)}
        title={selectedModalVacancy?.title || 'Convocatoria'}
        subtitle={
          selectedModalVacancy
            ? `${selectedModalVacancy.empresaNombre || 'PlataformaML Corporativo'} · ${selectedModalVacancy.department} · EXP-${(selectedModalVacancy.id || '01').slice(0, 6).toUpperCase()}`
            : undefined
        }
        maxWidth="2xl"
        variant="manila"
      >
        {selectedModalVacancy && (
          <div className="space-y-5">
            {/* Metadatos del cargo */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setViewCompanyProfile({
                    id: selectedModalVacancy.empresaId || selectedModalVacancy.companyId,
                    name: selectedModalVacancy.empresaNombre || selectedModalVacancy.companyName || 'PlataformaML Corporativo',
                  })
                }
                className="press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B5D46]/12 hover:bg-[#0B5D46]/20 dark:bg-[#C8FF45]/12 dark:hover:bg-[#C8FF45]/20 text-[#0B5D46] dark:text-[#C8FF45] border border-[#0B5D46]/30 dark:border-[#C8FF45]/35 font-bold cursor-pointer"
                title="Haz clic para ver el perfil de la empresa"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>{selectedModalVacancy.empresaNombre || 'PlataformaML Corporativo'}</span>
                <span className="text-[10px] underline ml-0.5">Ver perfil</span>
              </button>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE5D4] dark:bg-slate-800 text-[#3A2818] dark:text-[#F1F2EC] border border-[#C8B193] dark:border-slate-700 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                {selectedModalVacancy.location}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE5D4] dark:bg-slate-800 text-[#3A2818] dark:text-[#F1F2EC] border border-[#C8B193] dark:border-slate-700 font-semibold">
                <Briefcase className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                {selectedModalVacancy.workMode} · {selectedModalVacancy.type}
              </span>
              {selectedModalVacancy.openings && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/12 text-emerald-800 dark:text-[#C8FF45] border border-emerald-500/30 font-mono-tabular font-bold">
                  {selectedModalVacancy.openings} {selectedModalVacancy.openings === 1 ? 'plaza' : 'plazas'}
                </span>
              )}
              {typeof selectedModalVacancy.minExperienceYears === 'number' && selectedModalVacancy.minExperienceYears > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/12 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold">
                  Mín. {selectedModalVacancy.minExperienceYears} {selectedModalVacancy.minExperienceYears === 1 ? 'año' : 'años'} exp.
                </span>
              )}
            </div>

            {/* Hoja completa del expediente */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-[#DED7C8] dark:border-slate-800 space-y-4 text-xs sm:text-sm leading-relaxed">
              <div>
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#7D5634] dark:text-[#C8FF45] mb-1.5">
                  Resumen de Responsabilidades y Descripción
                </h4>
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedModalVacancy.description}
                </p>
              </div>

              {selectedModalVacancy.requiredSkills && selectedModalVacancy.requiredSkills.length > 0 && (
                <div className="pt-3 border-t border-[#E5DEC9] dark:border-slate-800">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#7D5634] dark:text-[#C8FF45] mb-2">
                    Competencias Evaluadas por el Modelo IA
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedModalVacancy.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/70 px-2.5 py-1 rounded-lg"
                      >
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedModalVacancy.requirements && selectedModalVacancy.requirements.length > 0 && (
                <div className="pt-3 border-t border-[#E5DEC9] dark:border-slate-800">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#7D5634] dark:text-[#C8FF45] mb-1.5">
                    Requisitos Mínimos
                  </h4>
                  <ul className="text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside text-xs sm:text-sm">
                    {selectedModalVacancy.requirements.map((req, rIdx) => (
                      <li key={rIdx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Pie del modal con botón prominente de Postularse */}
            <div className="pt-3 border-t border-[#C8B496]/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                <span>Evaluación ética sin sesgos demográficos</span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedModalVacancy(null)}
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => {
                    const target = selectedModalVacancy;
                    setSelectedModalVacancy(null);
                    onSelectVacancy(target);
                  }}
                >
                  Postularme al cargo
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal público de perfil de empresa (solo lectura, accesible para cualquier persona) */}
      <CompanyPublicProfileModal
        isOpen={Boolean(viewCompanyProfile)}
        onClose={() => setViewCompanyProfile(null)}
        companyId={viewCompanyProfile?.id}
        fallbackName={viewCompanyProfile?.name}
      />

      <Footer />
    </div>
  );
};
