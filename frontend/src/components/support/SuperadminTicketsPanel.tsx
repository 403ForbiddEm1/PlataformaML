import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  LifeBuoy,
  Mail,
  MessageSquareWarning,
  Phone,
  RefreshCw,
  Search,
  Send,
  User as UserIcon,
} from 'lucide-react';
import {
  supportService,
  type SupportStatus,
  type SupportTicket,
} from '@/services/support.service';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

const formatTicketDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: d.toLocaleTimeString('es-DO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    };
  } catch {
    return { date: iso, time: '' };
  }
};

const roleLabel = (role: string) => {
  const r = role.toLowerCase();
  if (r === 'candidato') return 'Candidato';
  if (r === 'rrhh') return 'RRHH';
  if (r === 'admin' || r === 'administrador') return 'Admin Empresa';
  return 'Superadmin';
};

export const SuperadminTicketsPanel: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'Todos' | SupportStatus>('Todos');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supportService.getTickets();
      setTickets(data);
      setSelectedId((prev) => prev || data[0]?.id || null);
      const initialDrafts: Record<string, string> = {};
      data.forEach((t) => {
        if (t.respuestaAdmin) initialDrafts[t.id] = t.respuestaAdmin;
      });
      setReplyDrafts((prev) => ({ ...initialDrafts, ...prev }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const handler = () => loadTickets();
    window.addEventListener('support-tickets-updated', handler);
    return () => window.removeEventListener('support-tickets-updated', handler);
  }, [loadTickets]);

  const counts = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.estado === 'Abierto').length,
      review: tickets.filter((t) => t.estado === 'En Revisión').length,
      resolved: tickets.filter((t) => t.estado === 'Resuelto').length,
    };
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'Todos' && t.estado !== statusFilter) return false;
      if (!q) return true;
      return (
        t.folio.toLowerCase().includes(q) ||
        t.senderName.toLowerCase().includes(q) ||
        t.senderEmail.toLowerCase().includes(q) ||
        (t.empresaNombre || '').toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q) ||
        t.asunto.toLowerCase().includes(q) ||
        t.queja.toLowerCase().includes(q)
      );
    });
  }, [tickets, statusFilter, search]);

  const selectedTicket = useMemo(
    () => filtered.find((t) => t.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  const handleUpdateTicket = async (ticket: SupportTicket, nextStatus: SupportStatus) => {
    setSavingId(ticket.id);
    try {
      const updated = await supportService.updateTicket(ticket.id, {
        estado: nextStatus,
        respuestaAdmin: replyDrafts[ticket.id]?.trim() || ticket.respuestaAdmin,
        atendidoPor: user?.name || 'Superadmin Global',
      });
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast(
        `Ticket ${ticket.folio} actualizado`,
        `Estado cambiado a "${nextStatus}".`,
        'success',
      );
    } catch {
      showToast('Error', 'No se pudo actualizar el ticket.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-8 space-y-6">
      {/* Encabezado y KPIs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#C8B193] dark:border-[#F1F2EC]/12">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B5D46]/15 dark:bg-[#C8FF45]/15 text-[#0B5D46] dark:text-[#C8FF45] text-xs font-bold border border-[#0B5D46]/30 dark:border-[#C8FF45]/30 mb-2">
            <LifeBuoy className="w-3.5 h-3.5" /> MESA CENTRAL DE SOPORTE Y QUEJAS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#3A2818] dark:text-[#F1F2EC] tracking-tight">
            Tickets de Soporte & Reclamos Recibidos
          </h2>
          <p className="text-xs sm:text-sm text-[#70553B] dark:text-[#9A9B94] mt-1">
            Auditoría en tiempo real de formularios de soporte, hora exacta de envío, remitente y detalle de quejas de toda la plataforma.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-[#EFE5D4] dark:bg-[#111622] border border-[#C8B193] dark:border-[#232D42]">
            <span className="text-[10px] font-mono-tabular uppercase text-[#70553B] dark:text-[#9A9B94] block">Total</span>
            <span className="text-xl font-mono-tabular font-black text-[#3A2818] dark:text-[#F1F2EC]">{counts.total}</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <span className="text-[10px] font-mono-tabular uppercase text-rose-700 dark:text-rose-300 block">Abiertos</span>
            <span className="text-xl font-mono-tabular font-black text-rose-700 dark:text-rose-300">{counts.open}</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-[10px] font-mono-tabular uppercase text-amber-800 dark:text-amber-300 block">En Revisión</span>
            <span className="text-xl font-mono-tabular font-black text-amber-800 dark:text-amber-300">{counts.review}</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-[10px] font-mono-tabular uppercase text-[#0B5D46] dark:text-[#C8FF45] block">Resueltos</span>
            <span className="text-xl font-mono-tabular font-black text-[#0B5D46] dark:text-[#C8FF45]">{counts.resolved}</span>
          </div>
        </div>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#EFE5D4] dark:bg-[#111622] border border-[#C8B193] dark:border-[#232D42]">
          <Filter className="w-3.5 h-3.5 ml-2 text-[#70553B] dark:text-[#9A9B94]" />
          {(['Todos', 'Abierto', 'En Revisión', 'Resuelto'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`press px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  active
                    ? 'bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C]'
                    : 'text-[#70553B] dark:text-[#9A9B94] hover:text-[#3A2818] dark:hover:text-[#F1F2EC]'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#70553B] dark:text-[#777873]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por remitente, folio, categoría o queja..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white/85 dark:bg-[#111622] border border-[#C8B193] dark:border-[#232D42] text-[#3A2818] dark:text-[#F1F2EC] placeholder:text-[#777873] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
            />
          </div>
          <button
            type="button"
            onClick={loadTickets}
            className="press p-2 rounded-xl bg-[#EFE5D4] dark:bg-[#111622] border border-[#C8B193] dark:border-[#232D42] text-[#3A2818] dark:text-[#F1F2EC] cursor-pointer"
            title="Actualizar bandeja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Layout Maestro-Detalle de Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Lista izquierda de tickets */}
        <div className="lg:col-span-5 rounded-2xl border border-[#C8B193] dark:border-[#232D42] bg-[#FCFBF8] dark:bg-[#111622] overflow-hidden divide-y divide-[#C8B193]/60 dark:divide-[#232D42]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <LifeBuoy className="w-8 h-8 mx-auto text-[#70553B] dark:text-[#777873]" />
              <p className="text-sm font-bold text-[#3A2818] dark:text-[#F1F2EC]">No hay tickets en esta vista</p>
              <p className="text-xs text-[#70553B] dark:text-[#777873]">
                Los reportes enviados desde el botón "Contactar con Soporte" del sidebar aparecerán aquí.
              </p>
            </div>
          ) : (
            filtered.map((t) => {
              const active = selectedTicket?.id === t.id;
              const dt = formatTicketDateTime(t.createdAt);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`press w-full text-left p-4 cursor-pointer flex flex-col gap-2 ${
                    active
                      ? 'bg-[#0B5D46]/10 dark:bg-[#C8FF45]/10 border-l-4 border-l-[#0B5D46] dark:border-l-[#C8FF45]'
                      : 'hover:bg-[#EFE5D4]/60 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono-tabular font-black px-2 py-0.5 rounded bg-[#3A2818] text-[#EFE5D4] dark:bg-[#090A0C] dark:text-[#C8FF45]">
                        {t.folio}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.estado === 'Abierto'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            : t.estado === 'En Revisión'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-[#0B5D46] dark:text-[#C8FF45] border border-emerald-500/30'
                        }`}
                      >
                        {t.estado}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-tabular text-[#70553B] dark:text-[#9A9B94] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {dt.date} · {dt.time}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#3A2818] dark:text-[#F1F2EC] line-clamp-1">
                      {t.asunto}
                    </h4>
                    <p className="text-xs text-[#70553B] dark:text-[#9A9B94] line-clamp-2 mt-0.5">
                      {t.queja}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <span className="font-semibold text-[#3A2818] dark:text-[#F1F2EC] truncate">
                      {t.senderName} ({roleLabel(t.senderRole)})
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.prioridad === 'Crítica' || t.prioridad === 'Alta'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'bg-[#EFE5D4] dark:bg-white/10 text-[#5C4025] dark:text-slate-300'
                      }`}
                    >
                      Prioridad {t.prioridad}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Expediente completo del ticket seleccionado */}
        <div className="lg:col-span-7">
          {!selectedTicket ? (
            <div className="rounded-2xl border border-[#C8B193] dark:border-[#232D42] bg-[#FCFBF8] dark:bg-[#111622] p-10 text-center text-xs text-[#70553B] dark:text-[#777873]">
              Selecciona un ticket a la izquierda para revisar su formulario y queja detallada.
            </div>
          ) : (
            (() => {
              const dt = formatTicketDateTime(selectedTicket.createdAt);
              return (
                <div className="rounded-2xl border-2 border-[#C8B193] dark:border-[#232D42] bg-[#FCFBF8] dark:bg-[#111622] overflow-hidden shadow-md">
                  {/* Cabecera del expediente */}
                  <div className="p-5 sm:p-6 bg-[#EFE5D4] dark:bg-[#161C2B] border-b border-[#C8B193] dark:border-[#232D42] flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono-tabular font-black px-2.5 py-1 rounded-lg bg-[#3A2818] text-[#EFE5D4] dark:bg-[#090A0C] dark:text-[#C8FF45]">
                          EXPEDIENTE #{selectedTicket.folio}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#0B5D46]/15 text-[#0B5D46] dark:bg-[#C8FF45]/15 dark:text-[#C8FF45]">
                          {selectedTicket.categoria}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300">
                          Prioridad {selectedTicket.prioridad}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-[#3A2818] dark:text-[#F1F2EC] pt-1">
                        {selectedTicket.asunto}
                      </h3>
                    </div>

                    <div className="px-3.5 py-2 rounded-xl bg-white/80 dark:bg-[#090A0C]/80 border border-[#C8B193] dark:border-[#232D42] text-right">
                      <span className="text-[10px] font-mono-tabular uppercase text-[#70553B] dark:text-[#9A9B94] block">
                        Fecha y Hora Exacta de Envío
                      </span>
                      <span className="text-xs font-mono-tabular font-bold text-[#0B5D46] dark:text-[#C8FF45] flex items-center justify-end gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> {dt.date} · {dt.time}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    {/* 1. Quién lo envió */}
                    <div className="p-4 rounded-xl bg-[#F6EEE2] dark:bg-[#0B0F17] border border-[#C8B193]/80 dark:border-[#232D42] space-y-2.5">
                      <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#70553B] dark:text-[#C8FF45] block">
                        1. Datos de Quien Envió el Ticket
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-[#3A2818] dark:text-[#F1F2EC]">
                          <UserIcon className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                          <div>
                            <span className="text-[10px] text-[#70553B] dark:text-[#9A9B94] block">Remitente y Rol</span>
                            <strong>{selectedTicket.senderName}</strong> · {roleLabel(selectedTicket.senderRole)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[#3A2818] dark:text-[#F1F2EC]">
                          <Mail className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-[#70553B] dark:text-[#9A9B94] block">Correo Electrónico</span>
                            <strong className="font-mono-tabular truncate block">{selectedTicket.senderEmail}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[#3A2818] dark:text-[#F1F2EC]">
                          <Building2 className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                          <div>
                            <span className="text-[10px] text-[#70553B] dark:text-[#9A9B94] block">Empresa / Origen</span>
                            <strong>{selectedTicket.empresaNombre || 'Candidato Independiente'}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[#3A2818] dark:text-[#F1F2EC]">
                          <Phone className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                          <div>
                            <span className="text-[10px] text-[#70553B] dark:text-[#9A9B94] block">Teléfono / Telegram</span>
                            <strong className="font-mono-tabular">{selectedTicket.senderPhone || 'No especificado'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Resumen del Formulario */}
                    <div className="p-4 rounded-xl bg-white dark:bg-[#0B0F17] border border-[#C8B193]/70 dark:border-[#232D42] space-y-2">
                      <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#70553B] dark:text-[#C8FF45] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> 2. Formulario Registrado
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                        <div className="p-2.5 rounded-lg bg-[#F6EEE2]/70 dark:bg-[#141923]">
                          <span className="text-[10px] text-[#70553B] dark:text-[#9A9B94] block">Categoría</span>
                          <strong className="text-[#3A2818] dark:text-[#F1F2EC]">{selectedTicket.categoria}</strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F6EEE2]/70 dark:bg-[#141923]">
                          <span className="text-[10px] text-[#70553B] dark:text-[#9A9B94] block">Módulo Afectado</span>
                          <strong className="text-[#3A2818] dark:text-[#F1F2EC]">{selectedTicket.moduloAfectado}</strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F6EEE2]/70 dark:bg-[#141923]">
                          <span className="text-[10px] text-[#70553B] dark:text-[#9A9B94] block">Prioridad Declarada</span>
                          <strong className="text-[#3A2818] dark:text-[#F1F2EC]">{selectedTicket.prioridad}</strong>
                        </div>
                      </div>
                    </div>

                    {/* 3. La Queja / Mensaje Detallado */}
                    <div className="p-4 sm:p-5 rounded-xl bg-[#EFE5D4]/65 dark:bg-[#161C2B] border-l-4 border-l-[#0B5D46] dark:border-l-[#C8FF45] border border-[#C8B193] dark:border-[#232D42] space-y-2">
                      <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#0B5D46] dark:text-[#C8FF45] flex items-center gap-1.5">
                        <MessageSquareWarning className="w-3.5 h-3.5" /> 3. Queja / Descripción Enviada por el Usuario
                      </span>
                      <p className="text-sm text-[#3A2818] dark:text-[#F1F2EC] leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.queja}
                      </p>
                    </div>

                    {/* 4. Respuesta y Resolución del Superadmin */}
                    <div className="space-y-3 pt-2 border-t border-[#C8B193]/60 dark:border-[#232D42]">
                      <label className="block text-xs font-bold text-[#3A2818] dark:text-[#F1F2EC]">
                        Dictamen / Nota de Seguimiento del Superadmin
                      </label>
                      <textarea
                        rows={2}
                        value={replyDrafts[selectedTicket.id] ?? selectedTicket.respuestaAdmin ?? ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [selectedTicket.id]: e.target.value }))
                        }
                        placeholder="Escribe una nota de auditoría o respuesta sobre la resolución de este ticket..."
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-[#0B0F17] border border-[#C8B193] dark:border-[#232D42] text-[#3A2818] dark:text-[#F1F2EC] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant={selectedTicket.estado === 'Abierto' ? 'danger' : 'outline'}
                            isLoading={savingId === selectedTicket.id}
                            onClick={() => handleUpdateTicket(selectedTicket, 'Abierto')}
                            leftIcon={<AlertCircle className="w-3.5 h-3.5" />}
                          >
                            Marcar Abierto
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTicket.estado === 'En Revisión' ? 'primary' : 'outline'}
                            isLoading={savingId === selectedTicket.id}
                            onClick={() => handleUpdateTicket(selectedTicket, 'En Revisión')}
                            leftIcon={<Clock className="w-3.5 h-3.5" />}
                          >
                            En Revisión
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTicket.estado === 'Resuelto' ? 'primary' : 'outline'}
                            isLoading={savingId === selectedTicket.id}
                            onClick={() => handleUpdateTicket(selectedTicket, 'Resuelto')}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Marcar Resuelto
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={savingId === selectedTicket.id}
                          onClick={() => handleUpdateTicket(selectedTicket, selectedTicket.estado)}
                          leftIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          Guardar Nota
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};
