import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Application } from '@/types';
import { applicationsService } from '@/services/applications.service';
import { employeesService } from '@/services/employees.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  UserCheck,
  DollarSign,
  Briefcase,
  Building2,
  Calendar,
  Mail,
  Phone,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

/**
 * Determina si una postulación cumple con el requisito previo de haber pasado
 * al menos por Preselección o Entrevista para habilitar la contratación oficial.
 */
export function canHireApplication(app: Application): boolean {
  if (app.status === 'Contratado' || app.status === 'Descartado') return false;
  if (app.status === 'Preseleccionado' || app.status === 'Entrevista') return true;
  return Boolean(
    app.timeline?.some(
      (evt) => evt.stage === 'Preseleccionado' || evt.stage === 'Entrevista'
    )
  );
}

interface HireCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  onHired?: () => void;
}

export const HireCandidateModal: React.FC<HireCandidateModalProps> = ({
  isOpen,
  onClose,
  application,
  onHired,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [salary, setSalary] = useState<string>('88000');
  const [hiredDate, setHiredDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && application) {
      setRoleTitle(application.vacancyTitle || '');
      setDepartment(application.vacancyDepartment || 'General');
      setSalary('88000');
      setHiredDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setDataConfirmed(false);
    }
  }, [isOpen, application]);

  if (!application) return null;

  const numericSalary = Number(salary);
  const isSalaryValid = !Number.isNaN(numericSalary) && numericSalary > 0;
  const isFormValid = isSalaryValid && roleTitle.trim().length > 0 && Boolean(hiredDate) && dataConfirmed;

  const handleConfirmHire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const cleanRole = roleTitle.trim();
      const cleanDept = department.trim() || 'General';
      const formattedSalary = Math.round(numericSalary);
      const cleanNote = notes.trim();

      const structuredNote = [
        'Contratación oficial confirmada.',
        `Cargo: ${cleanRole}`,
        `Departamento: ${cleanDept}`,
        `Sueldo asignado: RD$ ${formattedSalary.toLocaleString('en-US')}`,
        `Ingreso: ${hiredDate}`,
        ...(cleanNote ? [`Nota: ${cleanNote}`] : []),
      ].join(' | ');

      await applicationsService.updateStatus(
        application.id,
        'Contratado',
        user?.name || 'Especialista RRHH',
        structuredNote
      );

      employeesService.saveHiredContractTerms(application.id, {
        salary: formattedSalary,
        role: cleanRole,
        department: cleanDept,
        hiredDate,
      });

      showToast(
        '¡Contratación Oficial Completada!',
        `${application.candidateName} ahora es colaborador activo con sueldo de RD$ ${formattedSalary.toLocaleString('es-DO')}.`,
        'success'
      );

      if (onHired) onHired();
      onClose();
    } catch (err: any) {
      showToast(
        'Error al formalizar contratación',
        err?.message || 'No se pudo completar la contratación del postulante.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar Contratación Oficial"
      subtitle={`Incorporación a Plantilla & Nómina · ${application.vacancyTitle}`}
      maxWidth="xl"
    >
      <form onSubmit={handleConfirmHire} className="space-y-4">
        {/* Pregunta de seguridad */}
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
              ¿Está seguro de contratar oficialmente a {application.candidateName}?
            </p>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
              Al confirmar, la postulación pasará al estado <strong>Contratado</strong>, se registrará el acuerdo
              salarial en el historial de auditoría, se incorporará a <strong>Plantilla &amp; Nómina</strong> y se
              notificará al postulante.
            </p>
          </div>
        </div>

        {/* Confirmación de datos del postulante */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Datos del Postulante a Incorporar
            </span>
            <Badge status={application.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Nombre Completo</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{application.candidateName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{application.candidateEmail}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono-tabular">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{application.candidatePhone || 'Sin teléfono'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Afinidad IA</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {application.mlScore ?? 80}% de compatibilidad
              </span>
            </div>
          </div>
        </div>

        {/* Inputs editables para sueldo y condiciones laborales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              Sueldo Mensual (RD$) *
            </label>
            <input
              type="number"
              min={1000}
              step={500}
              required
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="Ej. 88000"
              className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <p className="text-[10px] text-slate-400 font-mono">
              {isSalaryValid
                ? `Equivalente diario (÷ 23.83): RD$ ${Math.round(numericSalary / 23.83).toLocaleString('es-DO')}`
                : 'Ingresa un sueldo válido mayor a 0'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              Fecha de Ingreso *
            </label>
            <input
              type="date"
              required
              value={hiredDate}
              onChange={(e) => setHiredDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-sky-500" />
              Cargo / Puesto Oficial *
            </label>
            <input
              type="text"
              required
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="Título del puesto"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              Departamento
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Área o departamento"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Observaciones de contratación (opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Contrato indefinido con período de prueba de 3 meses, modalidad híbrida..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        {/* Confirmación explícita de datos y sueldo */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/25 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dataConfirmed}
            onChange={(e) => setDataConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
          />
          <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
            <strong>Confirmo que los datos del colaborador y el sueldo mensual de{' '}
            RD$ {(isSalaryValid ? Math.round(numericSalary) : 0).toLocaleString('es-DO')} son correctos</strong>{' '}
            y autorizo su contratación oficial en la empresa.
          </span>
        </label>

        {!dataConfirmed && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Marca la casilla de confirmación de datos para habilitar el botón de contratación.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="success"
            isLoading={isSubmitting}
            disabled={!isFormValid}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Sí, Contratar Oficialmente
          </Button>
        </div>
      </form>
    </Modal>
  );
};
