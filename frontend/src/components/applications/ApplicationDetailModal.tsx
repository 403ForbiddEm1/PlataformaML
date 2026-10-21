import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Application, ApplicationStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { MLScoreBadge } from '@/components/ml/MLScoreBadge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Clock,
  Send,
  MessageSquare,
  Shield,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { applicationsService } from '@/services/applications.service';

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

  if (!application) return null;

  const isRecruiterOrAdmin = user?.role === 'rrhh' || user?.role === 'administrador';

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
        `Se envió notificación automática por WhatsApp/Email al candidato.`,
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
      title="Detalle de Postulación"
      subtitle={`Referencia #${application.id.toUpperCase()} · ${application.vacancyTitle}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h4 className="text-base font-bold text-slate-900">{application.candidateName}</h4>
              <Badge status={application.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{application.vacancyDepartment}</p>
          </div>

          {application.mlScore && (
            <div className="flex items-center gap-2">
              <MLScoreBadge
                score={application.mlScore}
                onClick={onOpenExplainability}
              />
            </div>
          )}
        </div>

        {/* Contact & Submitted Documents Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Datos de Contacto</span>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{application.candidateEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{application.candidatePhone}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Documentos Adjuntos</span>
            <div className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{application.cvFileName || 'Curriculum_Vitae.pdf'}</span>
              </div>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">CV</span>
            </div>

            <div className="flex items-center justify-between text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 truncate">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{application.idCardFileName || 'Cedula_Identidad.pdf'}</span>
              </div>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">ID</span>
            </div>
          </div>
        </div>

        {/* Recruiter Decision Panel (RF08) */}
        {isRecruiterOrAdmin && (
          <div className="p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/20 space-y-3">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Decisión Humana & Cambio de Estado (RF08)
            </h5>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 font-medium">
                Nota u observación de talento humano (opcional):
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ej. Cumple con los requisitos técnicos. Se procede a coordinar entrevista preliminar..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                variant="danger"
                isLoading={isUpdating}
                onClick={() => handleStatusChange('Descartado')}
              >
                Descartar
              </Button>
            </div>
          </div>
        )}

        {/* Audit Trail & Timeline (RF10) */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Historial y Trazabilidad del Proceso (RF10)
          </h5>

          <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 pl-4 py-1">
            {application.timeline.map((event) => (
              <div key={event.id} className="relative group">
                <span className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-xs" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{event.title}</span>
                  <span className="text-[11px] text-slate-400">{event.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{event.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Por: {event.actor}</span>
                  {event.channel && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                      {event.channel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
