import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Application, ApplicationStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { MLScoreBadge } from '@/components/ml/MLScoreBadge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Phone,
  Mail,
  UserCheck,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { applicationsService } from '@/services/applications.service';
import { HireCandidateModal, canHireApplication } from './HireCandidateModal';

interface ApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  onStatusUpdated?: () => void;
  onOpenExplainability?: () => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  isOpen,
  onClose,
  application,
  onStatusUpdated,
  onOpenExplainability,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [noteText, setNoteText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);

  if (!application) return null;

  const isRecruiterOrAdmin =
    user?.role === 'rrhh' || user?.role === 'admin' || user?.role === 'superadmin';
  const hireEnabled = canHireApplication(application);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setIsUpdating(true);
    try {
      await applicationsService.updateStatus(
        application.id,
        newStatus,
        user?.name || 'Analista RRHH',
        noteText ? noteText : undefined
      );
      showToast(
        `Estado actualizado a "${newStatus}"`,
        `Se envió notificación automática por Telegram/Email al candidato.`,
        'success'
      );
      setNoteText('');
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch {
      showToast('Error', 'No se pudo actualizar el estado de la postulación.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Expediente de Postulación"
      subtitle={`Referencia #${application.id.toUpperCase()} · ${application.vacancyTitle}`}
      maxWidth="2xl"
      variant="manila"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl bg-[#F4EFE4] dark:bg-slate-800/80 border border-[#C8B496] dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {application.candidateName}
              </h4>
              <Badge status={application.status} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {application.vacancyDepartment}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <MLScoreBadge
              score={typeof application.mlScore === 'number' ? application.mlScore : null}
              pending={Boolean(
                application.mlBreakdown?.explanation &&
                  /pendiente de evaluaci/i.test(application.mlBreakdown.explanation)
              )}
              onClick={onOpenExplainability}
            />
          </div>
        </div>

        {/* Contact & Submitted Documents Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#DED7C8] dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Datos de Contacto Verificados
            </span>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{application.candidateEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono-tabular">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{application.candidatePhone}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#DED7C8] dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Respaldo Documental
            </span>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 bg-[#F8F6F1] dark:bg-slate-800/80 p-2 rounded-lg border border-[#E5DEC9] dark:border-slate-700">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-3.5 h-3.5 text-[#0B5D46] dark:text-emerald-400 shrink-0" />
                <span className="truncate font-medium">
                  {application.cvFileName || 'Sin CV adjunto'}
                </span>
              </div>
              <span className="text-[10px] font-mono-tabular bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 shrink-0">
                CV
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 bg-[#F8F6F1] dark:bg-slate-800/80 p-2 rounded-lg border border-[#E5DEC9] dark:border-slate-700">
              <div className="flex items-center gap-2 truncate">
                <FileCheck className="w-3.5 h-3.5 text-[#0B5D46] dark:text-emerald-400 shrink-0" />
                <span className="truncate font-medium">
                  {application.idCardFileName || 'Documento_Identidad.pdf'}
                </span>
              </div>
              <span className="text-[10px] font-mono-tabular bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 shrink-0">
                ID
              </span>
            </div>
          </div>
        </div>

        {/* RF08: Recruiter Decision Panel */}
        {isRecruiterOrAdmin && (
          <div className="p-4 rounded-xl border border-[#C8B496] dark:border-slate-700 bg-[#F4EFE4]/60 dark:bg-slate-800/50 space-y-3">
            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0B5D46] dark:text-emerald-400" />
              Sello de Decisión Humana & Cambio de Estado
            </h5>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Observación oficial de talento humano (opcional):
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ej. Cumple con los requisitos técnicos. Se procede a coordinar entrevista técnica..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-[#CFC8B8] dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-[#0B5D46]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="primary"
                isLoading={isUpdating}
                onClick={() => handleStatusChange('Preseleccionado')}
              >
                Preseleccionar
              </Button>

              <Button
                size="sm"
                variant="secondary"
                isLoading={isUpdating}
                onClick={() => handleStatusChange('Entrevista')}
              >
                Convocar a Entrevista
              </Button>

              <Button
                size="sm"
                variant="success"
                disabled={!hireEnabled || isUpdating}
                title={
                  application.status === 'Contratado'
                    ? 'El candidato ya fue contratado'
                    : !hireEnabled
                    ? 'Requiere Preselección o Entrevista previa para habilitar Contratar'
                    : 'Formalizar contratación oficial y asignar sueldo'
                }
                onClick={() => setIsHireModalOpen(true)}
              >
                {application.status === 'Contratado' ? 'Contratado ✓' : 'Contratar'}
              </Button>

              <Button
                size="sm"
                variant="danger"
                isLoading={isUpdating}
                onClick={() => handleStatusChange('Descartado')}
              >
                Descartar
              </Button>
            </div>
            {!hireEnabled && application.status !== 'Contratado' && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                El botón <strong>Contratar</strong> se habilitará después de registrar al menos una{' '}
                <strong>Preselección</strong> o <strong>Entrevista</strong>.
              </p>
            )}
          </div>
        )}

        {/* RF10: Audit Trail & Timeline */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Historial y Trazabilidad del Expediente
          </h5>

          <div className="relative border-l border-[#C8B496] dark:border-slate-700 ml-3 space-y-4 pl-4 py-1">
            {application.timeline.map((event) => (
              <div key={event.id} className="relative group">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 bg-[#0B5D46] dark:bg-emerald-500" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{event.title}</span>
                  <span className="text-[11px] font-mono-tabular text-slate-400">{event.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{event.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Responsable: {event.actor}</span>
                  {event.channel && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium border border-slate-200 dark:border-slate-700">
                      {event.channel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <HireCandidateModal
        isOpen={isHireModalOpen}
        onClose={() => setIsHireModalOpen(false)}
        application={application}
        onHired={() => {
          setIsHireModalOpen(false);
          if (onStatusUpdated) onStatusUpdated();
          onClose();
        }}
      />
    </Modal>
  );
};
