import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Globe,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Send,
  Send as TelegramIcon,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import {
  chatService,
  type ChatConversationDto,
  type ChatMessageDto,
} from '@/services/chat.service';

const POLL_MS = 5000;

const roleLabel = (rol?: string) =>
  rol === 'ADMIN' ? 'Administrador' : rol === 'RRHH' ? 'Recursos Humanos' : rol === 'CANDIDATO' ? 'Candidato' : 'Plataforma';

const timeLabel = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
};

interface ChatPanelProps {
  /** Si se indica, abre directamente la conversación de esa postulación */
  focusApplicationId?: string;
  className?: string;
}

/**
 * Chat por postulación. Candidato y personal de la empresa (RRHH / Admin) conversan aquí.
 * Cada mensaje que escribe la empresa también llega al Telegram del candidato firmado con
 * "— Nombre (Rol)", y lo que el candidato responda desde Telegram aparece en este chat.
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ focusApplicationId, className = '' }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isCandidate = user?.role === 'candidato';

  const [conversations, setConversations] = useState<ChatConversationDto[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [mobileThread, setMobileThread] = useState(false);

  // Mini perfil deslizable a la izquierda al hacer clic en candidato o empresa
  const [miniProfileOpen, setMiniProfileOpen] = useState(false);
  const [miniProfileLoading, setMiniProfileLoading] = useState(false);
  const [miniProfileData, setMiniProfileData] = useState<any>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const list = await chatService.getConversations();
      setConversations(list);
      setListError(null);
    } catch (err: any) {
      if (!silent) setListError(err?.message || 'No se pudieron cargar las conversaciones.');
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingThread(true);
    try {
      const list = await chatService.getMessages(id);
      if (activeIdRef.current === id) setMessages(list);
    } catch (err: any) {
      if (!silent) showToast('Chat', err?.message || 'No se pudieron cargar los mensajes.', 'error');
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Abrir la conversación de una postulación concreta
  useEffect(() => {
    if (!focusApplicationId || conversations.length === 0) return;
    const match = conversations.find((c) => c.postulacionId === focusApplicationId);
    if (match) {
      setActiveId(match.id);
      setMobileThread(true);
    }
  }, [focusApplicationId, conversations]);

  // Cargar hilo al seleccionar + marcar como leído
  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    loadMessages(activeId);
    chatService
      .markAsRead(activeId)
      .then(() => loadConversations(true))
      .catch(() => {});
  }, [activeId, loadMessages, loadConversations]);

  // Polling silencioso mientras la pestaña esté visible
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      loadConversations(true);
      const id = activeIdRef.current;
      if (id) {
        loadMessages(id, true);
        chatService.markAsRead(id).catch(() => {});
      }
    };
    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, activeId]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.vacanteTitulo.toLowerCase().includes(q) ||
        c.empresaNombre.toLowerCase().includes(q) ||
        c.candidatoNombre.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      const created = await chatService.sendMessage(activeId, text);
      setMessages((prev) => [...prev, created]);
      setDraft('');
      loadConversations(true);
    } catch (err: any) {
      showToast('No se envió el mensaje', err?.message || 'Inténtalo de nuevo.', 'error');
    } finally {
      setSending(false);
    }
  };

  const counterpartName = (c: ChatConversationDto) => (isCandidate ? c.empresaNombre : c.candidatoNombre);

  const openMiniProfile = async (conv: ChatConversationDto) => {
    setMiniProfileOpen(true);
    setMiniProfileLoading(true);
    setMiniProfileData(null);
    try {
      if (isCandidate) {
        const res = await api.get<any>(`/company/public/${conv.empresaId}`);
        setMiniProfileData({ kind: 'company', ...(res.data || {}), nombre: res.data?.nombre || conv.empresaNombre });
      } else if (conv.postulacionId) {
        const res = await api.get<any>(`/applications/${conv.postulacionId}`);
        setMiniProfileData({ kind: 'candidate', ...(res.data || {}), candidateName: res.data?.candidateName || conv.candidatoNombre });
      } else {
        setMiniProfileData({ kind: 'candidate', candidateName: conv.candidatoNombre, vacancyTitle: conv.vacanteTitulo });
      }
    } catch {
      setMiniProfileData(
        isCandidate
          ? { kind: 'company', nombre: conv.empresaNombre, vacanteTitulo: conv.vacanteTitulo }
          : { kind: 'candidate', candidateName: conv.candidatoNombre, vacancyTitle: conv.vacanteTitulo }
      );
    } finally {
      setMiniProfileLoading(false);
    }
  };

  useEffect(() => {
    setMiniProfileOpen(false);
  }, [activeId]);

  return (
    <div
      className={`relative flex h-[calc(100dvh-9rem)] min-h-[460px] overflow-hidden rounded-2xl border border-[#DED7C8] dark:border-[#232D42] bg-[#FCFBF8] dark:bg-[#111622] ${className}`}
    >
      {/* Mini Perfil Deslizable a la Izquierda (Candidato o Empresa) */}
      {miniProfileOpen && activeConversation && (
        <aside className="absolute inset-y-0 left-0 z-30 w-full sm:w-[320px] bg-[#FCFBF8] dark:bg-[#0E1420] border-r-2 border-[#0B5D46]/40 dark:border-[#C8FF45]/40 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
          <div className="px-4 py-3 border-b border-[#DED7C8] dark:border-[#232D42] flex items-center justify-between gap-2 bg-[#EFE5D4]/60 dark:bg-[#141C2E]">
            <div className="flex items-center gap-2 min-w-0">
              {isCandidate ? (
                <Building2 className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
              ) : (
                <User className="w-4 h-4 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
              )}
              <span className="text-xs font-black uppercase tracking-wider text-[#3A2818] dark:text-[#F1F2EC] truncate">
                {isCandidate ? 'Mini Perfil de Empresa' : 'Mini Perfil del Candidato'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMiniProfileOpen(false)}
              className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Cerrar mini perfil"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {miniProfileLoading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-[#0B5D46] dark:text-[#C8FF45]" />
                <span>Cargando perfil...</span>
              </div>
            ) : miniProfileData?.kind === 'company' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0B5D46] text-white font-black text-base flex items-center justify-center shrink-0">
                    {(miniProfileData.nombre || 'EM').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-[#090A0C] dark:text-[#F1F2EC] truncate">
                      {miniProfileData.nombre}
                    </h4>
                    <p className="text-[11px] text-[#0B5D46] dark:text-[#C8FF45] font-semibold truncate">
                      {miniProfileData.sector || 'Empresa afiliada'}
                    </p>
                  </div>
                </div>
                {miniProfileData.descripcion && (
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {miniProfileData.descripcion}
                  </p>
                )}
                <div className="space-y-2 pt-1">
                  {miniProfileData.correoContacto && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      <span className="truncate">{miniProfileData.correoContacto}</span>
                    </div>
                  )}
                  {miniProfileData.telefonoContacto && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      <span>{miniProfileData.telefonoContacto}</span>
                    </div>
                  )}
                  {miniProfileData.sitioWeb && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Globe className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      <span className="truncate">{miniProfileData.sitioWeb}</span>
                    </div>
                  )}
                  {miniProfileData.direccion && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      <span>{miniProfileData.direccion}</span>
                    </div>
                  )}
                </div>
                {Array.isArray(miniProfileData.vacantesActivas) && miniProfileData.vacantesActivas.length > 0 && (
                  <div className="pt-2 border-t border-[#DED7C8] dark:border-[#232D42] space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Vacantes activas ({miniProfileData.vacantesActivas.length})
                    </span>
                    {miniProfileData.vacantesActivas.slice(0, 5).map((v: any) => (
                      <div key={v.id} className="p-2 rounded-lg bg-white dark:bg-white/[0.04] border border-[#DED7C8]/70 dark:border-white/10">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{v.titulo}</p>
                        <p className="text-[10px] text-slate-500 truncate">{v.departamento || 'General'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0">
                    {(miniProfileData?.candidateName || activeConversation.candidatoNombre).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-[#090A0C] dark:text-[#F1F2EC] truncate">
                      {miniProfileData?.candidateName || activeConversation.candidatoNombre}
                    </h4>
                    <p className="text-[11px] text-[#0B5D46] dark:text-[#C8FF45] font-semibold truncate">
                      {miniProfileData?.vacancyTitle || activeConversation.vacanteTitulo}
                    </p>
                  </div>
                </div>
                {typeof miniProfileData?.mlScore === 'number' && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Afinidad ML
                    </span>
                    <span className="font-mono font-black text-sm text-emerald-700 dark:text-[#C8FF45]">
                      {miniProfileData.mlScore}%
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {miniProfileData?.candidateEmail && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      <span className="truncate">{miniProfileData.candidateEmail}</span>
                    </div>
                  )}
                  {miniProfileData?.candidatePhone && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45] shrink-0" />
                      <span>{miniProfileData.candidatePhone}</span>
                    </div>
                  )}
                  {miniProfileData?.status && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Estado:</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-bold text-[10px] uppercase">
                        {miniProfileData.status}
                      </span>
                    </div>
                  )}
                </div>
                {Array.isArray(miniProfileData?.mlBreakdown?.matchingSkills) &&
                  miniProfileData.mlBreakdown.matchingSkills.length > 0 && (
                    <div className="pt-2 border-t border-[#DED7C8] dark:border-[#232D42] space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500 block">
                        Competencias clave
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {miniProfileData.mlBreakdown.matchingSkills.slice(0, 10).map((sk: string) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </aside>
      )}
      {/* Lista de conversaciones */}
      <aside
        className={`${mobileThread ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] shrink-0 flex-col border-r border-[#DED7C8] dark:border-[#232D42]`}
      >
        <div className="p-3 border-b border-[#DED7C8] dark:border-[#232D42]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777873]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isCandidate ? 'Buscar empresa o vacante' : 'Buscar candidato o vacante'}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-[#0B0F17] border border-[#DED7C8] dark:border-[#232D42] text-[#090A0C] dark:text-[#F1F2EC] placeholder:text-[#777873] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16" />
              ))}
            </div>
          ) : listError ? (
            <div className="p-5 text-center space-y-3">
              <p className="text-sm text-rose-600 dark:text-rose-300">{listError}</p>
              <button
                type="button"
                onClick={() => loadConversations()}
                className="press px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#DED7C8] dark:border-[#232D42] cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-[#777873]" />
              <p className="text-sm font-semibold text-[#090A0C] dark:text-[#F1F2EC]">Sin conversaciones</p>
              <p className="text-xs text-[#777873] leading-relaxed">
                {isCandidate
                  ? 'Se habilita un chat con cada empresa a la que te postulas.'
                  : 'Se crea un chat automáticamente cuando alguien se postula a una vacante de tu empresa.'}
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const active = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    setMobileThread(true);
                  }}
                  className={`press w-full text-left px-4 py-3 border-b border-[#DED7C8]/70 dark:border-[#232D42]/70 cursor-pointer ${
                    active
                      ? 'bg-[#0B5D46]/8 dark:bg-[#C8FF45]/8'
                      : 'hover:bg-[#EFE5D4]/50 dark:hover:bg-[#F1F2EC]/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-[#090A0C] dark:text-[#F1F2EC] truncate">
                      {counterpartName(c)}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-[#777873] shrink-0 mt-0.5">
                      {timeLabel(c.ultimoMensajeEn)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#0B5D46] dark:text-[#C8FF45] truncate mt-0.5">
                    {c.vacanteTitulo}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-[#777873] truncate">
                      {c.ultimoMensaje?.contenido || 'Aún no hay mensajes'}
                    </p>
                    {c.noLeidos > 0 && (
                      <span className="shrink-0 min-w-[20px] text-center text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded-full bg-[#0B5D46] dark:bg-[#C8FF45] text-white dark:text-[#090A0C]">
                        {c.noLeidos}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Hilo de mensajes */}
      <section className={`${mobileThread ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-2">
            <MessageSquare className="w-10 h-10 text-[#777873]" />
            <p className="font-heading font-bold text-[#090A0C] dark:text-[#F1F2EC]">Selecciona una conversación</p>
            <p className="text-xs text-[#777873] max-w-xs leading-relaxed">
              Los mensajes de la empresa llegan también al Telegram del candidato, y sus respuestas aparecen aquí.
            </p>
          </div>
        ) : (
          <>
            <header className="px-4 py-3 border-b border-[#DED7C8] dark:border-[#232D42] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileThread(false)}
                className="press md:hidden p-1.5 rounded-lg border border-[#DED7C8] dark:border-[#232D42] cursor-pointer"
                aria-label="Volver a conversaciones"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => openMiniProfile(activeConversation)}
                className="min-w-0 flex-1 flex items-center gap-2.5 text-left group cursor-pointer rounded-xl px-1.5 py-1 -mx-1.5 hover:bg-[#EFE5D4]/60 dark:hover:bg-white/[0.06] transition-colors"
                title={isCandidate ? 'Ver mini perfil de la empresa' : 'Ver mini perfil del candidato'}
              >
                <div className="w-8 h-8 rounded-full bg-[#0B5D46] text-white font-black text-xs flex items-center justify-center shrink-0">
                  {counterpartName(activeConversation).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#090A0C] dark:text-[#F1F2EC] group-hover:text-[#0B5D46] dark:group-hover:text-[#C8FF45] truncate transition-colors">
                    {counterpartName(activeConversation)}
                  </p>
                  <p className="text-[11px] text-[#0B5D46] dark:text-[#C8FF45] truncate">
                    {activeConversation.vacanteTitulo} · <span className="underline decoration-dotted">Ver perfil</span>
                  </p>
                </div>
              </button>
              {activeConversation.telegramVinculado ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-wider px-2 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                  <TelegramIcon className="w-3 h-3" /> También por Telegram
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-wider px-2 py-1 rounded-lg bg-[#EFE5D4] text-[#5C4025] dark:bg-white/[0.06] dark:text-[#9A9B94] border border-[#C8B193] dark:border-white/15">
                  <MessageSquare className="w-3 h-3" /> Enviado desde web (Telegram no vinculado)
                </span>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingThread && messages.length === 0 ? (
                <div className="space-y-3">
                  <div className="skeleton h-12 w-2/3" />
                  <div className="skeleton h-12 w-1/2 ml-auto" />
                  <div className="skeleton h-12 w-3/5" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-[#777873] pt-10">
                  Aún no hay mensajes. {isCandidate ? 'Escribe a la empresa para empezar.' : 'Escribe al candidato para empezar.'}
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.autorId === user?.id;
                  const author = m.autor ? `${m.autor.nombre} ${m.autor.apellido}`.trim() : '';
                  const viaTelegram = m.canalEnvio === 'TELEGRAM' && activeConversation.telegramVinculado;
                  return (
                    <div key={m.id} className={`flex animate-message-in ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!mine && author && (
                          <span className="text-[10px] font-semibold text-[#777873] mb-1 px-1">
                            {author} · {roleLabel(m.autor?.rol)}
                          </span>
                        )}
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            mine
                              ? 'bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C] rounded-br-md'
                              : 'bg-[#EFE5D4] text-[#3A2818] dark:bg-[#1B2233] dark:text-[#F1F2EC] rounded-bl-md'
                          }`}
                        >
                          {m.contenido}
                        </div>
                        <span className="text-[10px] font-mono-tabular text-[#777873] mt-1 px-1">
                          {timeLabel(m.creadoEn)}
                          {' · '}
                          {viaTelegram ? 'Enviado también por Telegram' : 'Enviado desde web'}
                          {mine && m.leidoEn ? ' · visto' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {activeConversation.cerradaEn ? (
              <div className="px-4 py-3 border-t border-[#DED7C8] dark:border-[#232D42] flex items-center gap-2 text-xs text-[#777873] bg-[#EFE5D4]/40 dark:bg-[#0B0F17]">
                <Lock className="w-3.5 h-3.5" /> Esta conversación finalizó y quedó en modo lectura.
              </div>
            ) : (
              <form onSubmit={handleSend} className="p-3 border-t border-[#DED7C8] dark:border-[#232D42] flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Escribe un mensaje…"
                  className="flex-1 resize-none max-h-32 px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-[#0B0F17] border border-[#DED7C8] dark:border-[#232D42] text-[#090A0C] dark:text-[#F1F2EC] placeholder:text-[#777873] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="press shrink-0 h-10 w-10 rounded-xl bg-[#0B5D46] hover:bg-[#0F7358] dark:bg-[#C8FF45] dark:hover:bg-[#D5FF6B] text-white dark:text-[#090A0C] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
};
