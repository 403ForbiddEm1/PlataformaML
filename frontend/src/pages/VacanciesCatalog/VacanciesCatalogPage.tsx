import React, { useEffect, useState } from 'react';
import { Vacancy } from '@/types';
import { vacanciesService } from '@/services/vacancies.service';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import {
  Search,
  MapPin,
  Building2,
  Clock,
  Briefcase,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface VacanciesCatalogPageProps {
  onNavigate: (view: string) => void;
  onSelectVacancy: (vacancy: Vacancy) => void;
}

export const VacanciesCatalogPage: React.FC<VacanciesCatalogPageProps> = ({
  onNavigate,
  onSelectVacancy,
}) => {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [search, setSearch] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('all');

  useEffect(() => {
    vacanciesService.getAll().then(setVacancies);
  }, []);

  const filtered = vacancies.filter((v) => {
    if (workModeFilter !== 'all' && v.workMode !== workModeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        v.department.toLowerCase().includes(q) ||
        v.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onNavigate={onNavigate} currentView="vacancies" />

      {/* Hero Header */}
      <section className="bg-white border-b border-slate-200/80 py-12 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5" /> Convocatorias Abiertas 2026
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight max-w-2xl mx-auto">
          Encuentra tu próximo desafío profesional en Nexo Tecnología
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Postúlate en minutos. Nuestro sistema con Inteligencia Artificial analiza tu perfil
          de forma transparente y sin sesgos demográficos.
        </p>

        {/* Search bar */}
        <div className="max-w-2xl mx-auto pt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar por cargo o tecnología (Python, SQL, BI...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={workModeFilter}
            onChange={(e) => setWorkModeFilter(e.target.value)}
            className="text-xs font-semibold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none"
          >
            <option value="all">Todas las modalidades</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Presencial">Presencial</option>
            <option value="Remoto">Remoto</option>
          </select>
        </div>
      </section>

      {/* List of Vacancies */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-6">
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>Mostrando {filtered.length} vacantes activas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((vac) => (
            <div
              key={vac.id}
              className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                      {vac.department}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{vac.title}</h3>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shrink-0">
                    {vac.workMode}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vac.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {vac.type}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {vac.description}
                </p>

                {/* Skills pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {vac.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {vac.appliedCount} profesionales postulados
                </span>

                <Button
                  size="sm"
                  onClick={() => onSelectVacancy(vac)}
                  className="font-bold text-xs"
                >
                  Postularme ➔
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};
