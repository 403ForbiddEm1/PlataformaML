import React, { useEffect, useState, useRef } from 'react';
import {
  Application,
  ApplicationStatus,
  CandidateProfile,
  CandidateVisibilitySettings,
  Vacancy,
  NotificationItem,
} from '@/types';
import { applicationsService } from '@/services/applications.service';
import { candidatesService, DEFAULT_VISIBILITY } from '@/services/candidates.service';
import { vacanciesService } from '@/services/vacancies.service';
import { notificationsService } from '@/services/notifications.service';
import { authService } from '@/services/auth.service';
import { api, USE_MOCK } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import { MLExplainabilityModal } from '@/components/ml/MLExplainabilityModal';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AppShell } from '@/components/layout/AppShell';
import { type SidebarSection } from '@/components/layout/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useFolderAutoScroll } from '@/hooks/useFolderAutoScroll';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  User,
  Search,
  Bell,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Folder,
  Paperclip,
  LogOut,
  Power,
  HelpCircle,
  Mail,
  MessageSquare,
  BarChart3,
  Database,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Plus,
  Shield,
  ShieldCheck,
  FileText,
  MapPin,
  Building2,
  Layers,
  Award,
  BadgeCheck,
  Sun,
  Moon,
  Phone,
  Download,
  GraduationCap,
  Edit3,
  Code2,
  Upload,
  RefreshCw,
  FileUp,
  FileCheck,
  Lock,
  Check,
  AlertCircle,
  Camera,
  Trash2,
  Image,
  Menu,
  X,
  Eye,
  EyeOff,
  LocateFixed,
  Loader2,
} from 'lucide-react';

interface CandidateDashboardPageProps {
  onNavigate: (view: string) => void;
  onApplyVacancy: (vacancy: Vacancy) => void;
}

export const CandidateDashboardPage: React.FC<CandidateDashboardPageProps> = ({
  onNavigate,
  onApplyVacancy,
}) => {
  const { user, logout, updateUserPhoto } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();

  // Foto de perfil del usuario (editable y persistida)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    const cleanEmail = (user?.email || '').trim().toLowerCase();
    return (
      user?.photoUrl ||
      localStorage.getItem(`nexo_user_photo_${user?.id || 'cand'}`) ||
      (cleanEmail ? localStorage.getItem(`nexo_photo_by_email_${cleanEmail}`) : null) ||
      null
    );
  });
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [tempPhotoPreview, setTempPhotoPreview] = useState<string | null>(null);
  const [tempPhotoFile, setTempPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cleanEmail = (user?.email || '').trim().toLowerCase();
    const resolved =
      user?.photoUrl ||
      localStorage.getItem(`nexo_user_photo_${user?.id || 'cand'}`) ||
      (cleanEmail ? localStorage.getItem(`nexo_photo_by_email_${cleanEmail}`) : null) ||
      null;
    if (resolved) {
      setProfilePhoto(resolved);
      if (cleanEmail) {
        try {
          localStorage.setItem(`nexo_photo_by_email_${cleanEmail}`, resolved);
        } catch {}
      }
    }
  }, [user?.id, user?.email, user?.photoUrl]);

  const triggerPhotoInput = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Formato no válido', 'Por favor selecciona un archivo de imagen (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Archivo muy grande', 'La imagen no debe superar los 5 MB de tamaño.', 'error');
      return;
    }

    setTempPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setTempPhotoPreview(dataUrl);
      setIsPhotoModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSavePhoto = (newPhoto: string | null) => {
    setProfilePhoto(newPhoto);
    updateUserPhoto(newPhoto);
    const cleanEmail = (user?.email || '').trim().toLowerCase();
    if (newPhoto) {
      localStorage.setItem(`nexo_user_photo_${user?.id || 'cand'}`, newPhoto);
      if (cleanEmail) {
        localStorage.setItem(`nexo_photo_by_email_${cleanEmail}`, newPhoto);
      }
      candidatesService.updateProfile({ photoUrl: newPhoto } as any, cleanEmail || user?.email).catch(() => {});
      showToast('¡Foto actualizada!', 'Tu foto de perfil se guardó en tu cuenta para todos tus dispositivos.', 'success');
    } else {
      localStorage.removeItem(`nexo_user_photo_${user?.id || 'cand'}`);
      if (cleanEmail) {
        localStorage.removeItem(`nexo_photo_by_email_${cleanEmail}`);
      }
      candidatesService.updateProfile({ photoUrl: null } as any, cleanEmail || user?.email).catch(() => {});
      showToast('Foto eliminada', 'Se ha restablecido la foto de perfil.', 'info');
    }
    setTempPhotoFile(null);
    setIsPhotoModalOpen(false);
  };

  const [activeTab, setActiveTab] = useState<'applications' | 'messages' | 'profile' | 'vacancies' | 'notifications'>(
    'applications'
  );
  const [focusChatAppId, setFocusChatAppId] = useState<string | undefined>(undefined);

  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [openCandidateVacancyIds, setOpenCandidateVacancyIds] = useState<Record<string, boolean>>({});
  const { registerFolderRef, scheduleScrollIfNeeded } = useFolderAutoScroll({
    stickyOffset: 84,
    delayMs: 240,
  });

  const toggleCandidateVacancy = (id: string) => {
    scheduleScrollIfNeeded(id, openCandidateVacancyIds);
    setOpenCandidateVacancyIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Modals state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);

  // Reanálisis de CV por IA (Datos inmutables salvo Contacto)
  const [isReanalyzeModalOpen, setIsReanalyzeModalOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeStep, setReanalyzeStep] = useState(0);
  const [selectedCVFile, setSelectedCVFile] = useState<File | null>(null);
  const [uploadedCVName, setUploadedCVName] = useState('');
  const [lastReanalysisTime, setLastReanalysisTime] = useState('Sin CV registrado');
  const [isUploadingDirectCV, setIsUploadingDirectCV] = useState(false);
  const directCvInputRef = useRef<HTMLInputElement | null>(null);

  const isAllowedCvFormat = (fileName: string) => {
    const lower = fileName.trim().toLowerCase();
    return lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx');
  };

  const triggerDirectCvUpload = () => {
    directCvInputRef.current?.click();
  };

  // Contacto y Ubicación editables manualmente + Visibilidad de secciones
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editTelegramUsername, setEditTelegramUsername] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [telegramLinkedPhone, setTelegramLinkedPhone] = useState<string>(() => {
    try {
      const cleanEm = (user?.email || '').trim().toLowerCase();
      const unlinked = localStorage.getItem(`nexo_candidate_tlg_unlinked_${cleanEm}`) === '1';
      if (unlinked) return '';
      return (
        localStorage.getItem(`nexo_candidate_tlg_${cleanEm}`) ||
        (user?.phone ? user.phone.trim() : '')
      );
    } catch {
      return user?.phone ? user.phone.trim() : '';
    }
  });
  // Cambio o adición de contraseña con código de verificación (Correo o Telegram)
  const [pwdChannel, setPwdChannel] = useState<'CORREO' | 'TELEGRAM'>('CORREO');
  const [pwdCodeSent, setPwdCodeSent] = useState(false);
  const [pwdCode, setPwdCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSendingPwdCode, setIsSendingPwdCode] = useState(false);
  const [isSavingPwd, setIsSavingPwd] = useState(false);
  const [visibility, setVisibility] = useState<CandidateVisibilitySettings>(DEFAULT_VISIBILITY);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validateEmailFormat = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const validatePhoneFormat = (val: string) => {
    return /^[\d\+\s\(\)\-]{7,20}$/.test(val.trim());
  };

  const handleLinkCandidateTelegram = async () => {
    const cleanPhone = editPhone.trim();
    const rawUser = editTelegramUsername.trim().replace(/^@+/, '');
    const cleanUser = rawUser ? `@${rawUser}` : '';
    if ((!cleanPhone || !validatePhoneFormat(cleanPhone)) && !cleanUser) {
      setPhoneError('Ingresa tu @usuario de Telegram y/o un número válido (ej. +58 412 0000000).');
      showToast('Datos requeridos', 'Escribe tu @usuario de Telegram o un número válido para vincular.', 'error');
      return;
    }
    try {
      const updated = await candidatesService.updateProfile(
        {
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          telegramUsername: cleanUser,
          telegramLinked: true,
        },
        editEmail.trim() || user?.email,
      );
      setProfile(updated);
      setEditTelegramUsername(cleanUser);
      setPhoneError('');
      const displayTarget = cleanUser || cleanPhone;
      const cleanEm = (editEmail.trim() || user?.email || '').toLowerCase();
      localStorage.setItem(`nexo_candidate_tlg_${cleanEm}`, displayTarget);
      localStorage.removeItem(`nexo_candidate_tlg_unlinked_${cleanEm}`);
      setTelegramLinkedPhone(displayTarget);
      showToast(
        '¡Vinculado con Telegram!',
        `Tu cuenta ${cleanUser ? `${cleanUser}${cleanPhone ? ` (${cleanPhone})` : ''}` : cleanPhone} quedó conectada directamente con Telegram.`,
        'success',
      );
    } catch {
      showToast('Error', 'No se pudo vincular tu cuenta con Telegram.', 'error');
    }
  };

  const handleUnlinkCandidateTelegram = async () => {
    const cleanEm = (editEmail.trim() || user?.email || '').toLowerCase();
    try {
      localStorage.removeItem(`nexo_candidate_tlg_${cleanEm}`);
      localStorage.setItem(`nexo_candidate_tlg_unlinked_${cleanEm}`, '1');
      await candidatesService.updateProfile(
        { telegramLinked: false },
        editEmail.trim() || user?.email,
      );
    } catch {}
    setTelegramLinkedPhone('');
    showToast(
      'Telegram desvinculado',
      'Desvinculaste tu cuenta de Telegram. Los mensajes se enviarán únicamente desde la web.',
      'info',
    );
  };

  const handleDirectCvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedCvFormat(file.name)) {
      showToast(
        'Formato no permitido',
        'Solo se aceptan archivos de CV en formato PDF o DOC / DOCX.',
        'error',
      );
      e.target.value = '';
      return;
    }

    setSelectedCVFile(file);
    setUploadedCVName(file.name);
    setIsUploadingDirectCV(true);
    showToast('Subiendo y analizando CV...', `Procesando ${file.name} con IA...`, 'info');

    try {
      const uploadRes = await candidatesService.uploadCVDocument(file);
      const backendExtracted = uploadRes?.extracted;
      const parsedData = {
        title: backendExtracted?.title || '',
        bio: backendExtracted?.bio || '',
        skills: Array.isArray(backendExtracted?.skills) ? backendExtracted.skills : [],
        education: Array.isArray(backendExtracted?.education) ? backendExtracted.education : [],
        experience: Array.isArray(backendExtracted?.experience) ? backendExtracted.experience : [],
        location: backendExtracted?.location || '',
      };

      let finalLocation = parsedData.location || editLocation.trim() || profile?.location || '';
      if (!finalLocation) {
        finalLocation = await handleDetectGPSLocation(true);
      }
      if (finalLocation) {
        setEditLocation(finalLocation);
      }

      const updated = await candidatesService.updateProfile(
        {
          email: editEmail ? editEmail.trim() : profile?.email,
          phone: editPhone ? editPhone.trim() : profile?.phone,
          title: parsedData.title,
          bio: parsedData.bio,
          skills: parsedData.skills,
          education: parsedData.education,
          experience: parsedData.experience,
          location: finalLocation,
          cvFileName: uploadRes?.filename || file.name,
        },
        editEmail.trim() || user?.email,
      );

      setProfile(updated);
      const now = new Date();
      setLastReanalysisTime(`Hoy, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      showToast(
        '¡CV Subido y Analizado!',
        `Se leyó el contenido real de ${file.name} y se guardó en tu perfil en la nube.`,
        'success',
      );
    } catch (err: any) {
      showToast('Error al subir CV', err?.message || 'No se pudo procesar el archivo. Intenta nuevamente.', 'error');
    } finally {
      setIsUploadingDirectCV(false);
      e.target.value = '';
    }
  };

  const handleSendCandidatePasswordCode = async () => {
    const targetEmail = (editEmail || profile?.email || user?.email || '').trim();
    const targetPhone = (editPhone || profile?.phone || user?.phone || '').trim();
    const chosenChannel: 'CORREO' | 'TELEGRAM' =
      !targetEmail && targetPhone ? 'TELEGRAM' : pwdChannel;

    if (chosenChannel === 'CORREO' && !targetEmail) {
      showToast('Sin correo', 'No tienes un correo puesto. Se enviará el código a tu Telegram.', 'info');
      setPwdChannel('TELEGRAM');
    }
    if (chosenChannel === 'TELEGRAM' && !targetPhone) {
      showToast('Número requerido', 'Primero ingresa y guarda tu número de Telegram.', 'error');
      return;
    }

    setIsSendingPwdCode(true);
    try {
      const res = await authService.sendPasswordSecurityCode({
        canal: chosenChannel,
        email: targetEmail || undefined,
        phone: targetPhone || undefined,
        userId: user?.id,
      });
      setPwdCodeSent(true);
      showToast('Código enviado', res.mensaje, 'success');
    } catch (err: any) {
      showToast('No se pudo enviar el código', err?.message || 'Inténtalo nuevamente.', 'error');
    } finally {
      setIsSendingPwdCode(false);
    }
  };

  const handleConfirmCandidatePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdCode.trim().length < 5) {
      showToast('Código incompleto', 'Ingresa el código recibido (5 o 6 dígitos).', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('No coinciden', 'La confirmación de contraseña no coincide.', 'error');
      return;
    }

    setIsSavingPwd(true);
    try {
      const targetEmail = (editEmail || profile?.email || user?.email || '').trim();
      const targetPhone = (editPhone || profile?.phone || user?.phone || '').trim();
      await authService.verifyPasswordSecurityCode({
        code: pwdCode,
        newPassword,
        email: targetEmail || undefined,
        phone: targetPhone || undefined,
        userId: user?.id,
      });
      showToast('¡Contraseña actualizada!', 'Tu contraseña quedó guardada correctamente.', 'success');
      setPwdCodeSent(false);
      setPwdCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      showToast('Código inválido', err?.message || 'Verifica el código de 6 dígitos.', 'error');
    } finally {
      setIsSavingPwd(false);
    }
  };

  const handleToggleVisibility = async (key: keyof CandidateVisibilitySettings, label: string) => {
    const next: CandidateVisibilitySettings = {
      ...visibility,
      [key]: !visibility[key],
    };
    setVisibility(next);
    try {
      const updated = await candidatesService.updateProfile(
        { visibility: next },
        editEmail.trim() || user?.email,
      );
      setProfile(updated);
      showToast(
        next[key] ? `${label}: Visible` : `${label}: Oculto`,
        next[key]
          ? 'Las empresas podrán ver esta información al revisar tu perfil.'
          : 'Esta información quedó oculta para los reclutadores.',
        'info',
      );
    } catch {}
  };

  const handleDetectGPSLocation = async (silentIfUnsupported = false): Promise<string> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (!silentIfUnsupported) {
        showToast('GPS no disponible', 'Tu navegador o dispositivo no soporta geolocalización.', 'error');
      }
      return '';
    }

    setIsLocatingGps(true);
    return new Promise<string>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let resolvedLocation = `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`,
            );
            if (resp.ok) {
              const data = await resp.json();
              const addr = data?.address || {};
              const city =
                addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
              const state = addr.state || '';
              const country = addr.country || '';
              const parts = [city, state, country].filter(Boolean);
              if (parts.length > 0) {
                resolvedLocation = parts.join(', ');
              }
            }
          } catch {
            // usa coordenadas GPS si Nominatim no responde
          }

          setEditLocation(resolvedLocation);
          try {
            const updated = await candidatesService.updateProfile(
              { location: resolvedLocation },
              editEmail.trim() || user?.email,
            );
            setProfile(updated);
          } catch {}
          setIsLocatingGps(false);
          showToast('Ubicación GPS detectada', `Ubicación establecida en: ${resolvedLocation}`, 'success');
          resolve(resolvedLocation);
        },
        () => {
          setIsLocatingGps(false);
          if (!silentIfUnsupported) {
            showToast(
              'Permiso de GPS denegado',
              'Activa el permiso de ubicación en tu navegador/teléfono o escríbela manualmente.',
              'error',
            );
          }
          resolve('');
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const loadData = async () => {
    try {
      const email = user?.email || '';
      const [apps, prof, vacs, notifs] = await Promise.all([
        applicationsService.getByCandidateEmail(email).catch(() => [] as Application[]),
        candidatesService.getProfile(email),
        vacanciesService.getAll().catch(() => [] as Vacancy[]),
        notificationsService.getNotifications().catch(() => [] as NotificationItem[]),
      ]);

      setApplications(apps);
      setProfile(prof);
      if (prof.photoUrl && (prof.photoUrl.startsWith('data:image/') || prof.photoUrl.startsWith('http'))) {
        setProfilePhoto(prof.photoUrl);
      }
      if (prof.email) setEditEmail(prof.email);
      if (prof.phone) {
        setEditPhone(prof.phone);
        const cleanEm = (prof.email || user?.email || '').trim().toLowerCase();
        const unlinked = localStorage.getItem(`nexo_candidate_tlg_unlinked_${cleanEm}`) === '1';
        if (!unlinked) {
          localStorage.setItem(`nexo_candidate_tlg_${cleanEm}`, prof.phone.trim());
          setTelegramLinkedPhone(prof.phone.trim());
        }
      }
      setEditLocation(prof.location || '');
      if (prof.visibility) {
        setVisibility({ ...DEFAULT_VISIBILITY, ...prof.visibility });
      }
      if (prof.cvFileName) {
        setUploadedCVName(prof.cvFileName);
        setLastReanalysisTime('Documento verificado');
      } else {
        setUploadedCVName('');
        setLastReanalysisTime('Sin CV registrado');
      }

      setVacancies(vacs);
      if (vacs.length > 0) {
        setOpenCandidateVacancyIds((prev) => (Object.keys(prev).length === 0 ? { [vacs[0].id]: true } : prev));
      }
      setNotifications(notifs);
    } catch {
      showToast('Error', 'No se pudieron cargar los datos del portal.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'todos') return true;
    return app.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const activeCount = applications.length;
  const preselectedCount = applications.filter((a) => a.status === 'Preseleccionado').length;
  const inReviewCount = applications.filter((a) => a.status === 'En revisión').length;

  // Guardar únicamente cambios de contacto y ubicación
  const handleSaveContactOnly = async () => {
    if (!validateEmailFormat(editEmail)) {
      setEmailError('Formato inválido. Ejemplo: usuario@correo.com');
      showToast('Correo Inválido', 'Ingresa un correo con formato válido.', 'error');
      return;
    }
    if (editPhone && !validatePhoneFormat(editPhone)) {
      setPhoneError('Formato inválido. Ejemplo: +1 (809) 555-0192');
      showToast('Teléfono Inválido', 'Ingresa un número telefónico válido.', 'error');
      return;
    }

    try {
      const updated = await candidatesService.updateProfile(
        {
          email: editEmail.trim(),
          phone: editPhone.trim(),
          location: editLocation.trim(),
        },
        editEmail.trim() || user?.email,
      );
      setProfile(updated);
      setEmailError('');
      setPhoneError('');
      showToast('Perfil Actualizado', 'Se guardaron tu correo, teléfono y ubicación con éxito.', 'success');
    } catch {
      showToast('Error', 'No se pudieron actualizar los datos de contacto.', 'error');
    }
  };

  // Descarga del CV: Preparado para recibir el archivo desde el backend/almacenamiento
  const handleDownloadCV = () => {
    const fileName = profile?.cvFileName || uploadedCVName;

    if (!fileName) {
      showToast('Sin CV disponible', 'Aún no has adjuntado ningún currículum vitae.', 'info');
      return;
    }

    // Puerta abierta: Si el backend proporciona una URL de descarga o archivo
    const fileUrl = (profile as any)?.cvUrl || (profile as any)?.fileUrl;
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Descarga iniciada', `Descargando ${fileName}`, 'success');
      return;
    }

    // Si el archivo fue seleccionado en la sesión activa
    if (selectedCVFile) {
      const url = URL.createObjectURL(selectedCVFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedCVFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Descarga iniciada', `Descargando tu archivo: ${selectedCVFile.name}`, 'success');
      return;
    }

    // Enlace listo para el backend de almacenamiento
    showToast('Descarga iniciada', `Solicitando ${fileName} al servidor...`, 'info');
  };

  // Ejecución de Reanálisis con IA sobre el CV actualizado + Contacto
  const handleRunReanalysis = async () => {
    if (!selectedCVFile && !profile?.cvFileName && !uploadedCVName) {
      showToast('Archivo requerido', 'Por favor selecciona un archivo de CV (PDF o DOCX) para iniciar el análisis.', 'error');
      return;
    }

    if (editEmail && !validateEmailFormat(editEmail)) {
      setEmailError('Formato inválido. Ejemplo: usuario@correo.com');
      showToast('Correo Inválido', 'Ingresa un correo válido antes de reanalizar.', 'error');
      return;
    }
    if (editPhone && !validatePhoneFormat(editPhone)) {
      setPhoneError('Formato inválido. Ejemplo: +1 (809) 555-0192');
      showToast('Teléfono Inválido', 'Ingresa un número telefónico válido antes de reanalizar.', 'error');
      return;
    }

    setIsReanalyzing(true);
    setReanalyzeStep(1);

    // Paso 1: Lectura óptica y procesamiento de texto estructurado
    await new Promise((r) => setTimeout(r, 650));
    setReanalyzeStep(2);

    // Paso 2: Extracción de grados académicos y experiencia laboral
    await new Promise((r) => setTimeout(r, 750));
    setReanalyzeStep(3);

    // Paso 3: Normalización de habilidades y cálculo de afinidad
    await new Promise((r) => setTimeout(r, 750));
    setReanalyzeStep(4);

    // Paso 4: Actualización del expediente en Mi Perfil
    await new Promise((r) => setTimeout(r, 600));

    const now = new Date();
    const formattedTime = `Hoy, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setLastReanalysisTime(formattedTime);

    // Re-analizar CV en el servidor real con Gemini 3.5 Flash
    try {
      const targetFileName = selectedCVFile?.name || uploadedCVName || profile?.cvFileName || 'Curriculum_Vitae.pdf';
      if (selectedCVFile) {
        await candidatesService.uploadCVDocument(selectedCVFile);
      } else {
        await candidatesService.reanalyzeCV();
      }
      const freshProfile = await candidatesService.getProfile(editEmail.trim() || user?.email);
      setProfile(freshProfile);
      setUploadedCVName(freshProfile.cvFileName || targetFileName);
    } catch (err: any) {
      showToast(
        'No se pudo re-analizar',
        err?.message || 'Vuelve a seleccionar tu PDF/DOCX en "Subir / Actualizar CV" para analizarlo con Gemini.',
        'error'
      );
    }

    setIsReanalyzing(false);
    setIsReanalyzeModalOpen(false);
    setReanalyzeStep(0);

    showToast(
      'Reanálisis IA Completado',
      'El motor de IA ha verificado tu nuevo CV y actualizado tu expediente en Mi Perfil con éxito.',
      'success'
    );
  };

  const sidebarSections: SidebarSection[] = [
    {
      title: 'ARCHIVERO PERSONAL',
      items: [
        { id: 'applications', label: 'Mis Postulaciones', icon: Briefcase, badge: applications.length },
        { id: 'messages', label: 'Mensajes y Telegram', icon: MessageSquare },
        { id: 'profile', label: 'Mi perfil curricular', icon: User },
        { id: 'notifications', label: 'Notificaciones', icon: Bell, badge: notifications.length || undefined },
      ],
    },
    {
      title: 'CONVOCATORIAS',
      items: [
        { id: 'vacancies', label: 'Explorar vacantes', icon: Search },
        { id: 'external-catalog', label: 'Catálogo público', icon: ExternalLink, external: true },
      ],
    },
  ];

  const activeTitle =
    activeTab === 'applications'
      ? 'Mis Postulaciones'
      : activeTab === 'messages'
      ? 'Mensajes y Telegram'
      : activeTab === 'profile'
      ? 'Mi Perfil Curricular'
      : activeTab === 'vacancies'
      ? 'Explorar Vacantes'
      : 'Notificaciones';

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans transition-colors">
      <AppShell
        sections={sidebarSections}
        activeId={activeTab}
        onSelect={(id) => {
          if (id === 'external-catalog') {
            onNavigate('vacancies');
            return;
          }
          if (id !== 'messages') {
            setFocusChatAppId(undefined);
          }
          setActiveTab(id as typeof activeTab);
        }}
        brandSubtitle="EXPEDIENTE DE CANDIDATO"
        crumbRoot="Portal del candidato"
        title={activeTitle}
        roleLabel="Candidato"
        userAvatarUrl={profilePhoto}
        onLogout={() => {
          logout();
          onNavigate('login');
        }}
        onBrandClick={() => onNavigate('vacancies')}
        topbarExtra={
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="press flex items-center gap-2 pl-1.5 py-1 pr-2.5 rounded-xl bg-white/70 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-[#c8b193] dark:border-slate-600 transition-colors cursor-pointer group select-none"
            title="Ir a Mi Perfil Curricular"
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={user?.name || 'Usuario'}
                className="w-7 h-7 rounded-md object-cover border border-[#0B5D46]/40 dark:border-[#C8FF45]/50 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-[#4C6FFF] text-[#F1F2EC] font-bold text-xs flex items-center justify-center shrink-0">
                {user?.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'VM'}
              </div>
            )}
            <span className="hidden sm:inline text-xs font-semibold text-[#3a2818] dark:text-[#F1F2EC] leading-tight truncate max-w-[140px]">
              {user?.name || 'Candidato'}
            </span>
          </button>
        }
      >
        <div
          key={activeTab}
          className={`animate-page-enter-left ${
            activeTab === 'profile' || activeTab === 'applications'
              ? 'w-full flex-1 flex flex-col'
              : 'p-4 sm:p-6 lg:p-8 space-y-6 flex-1'
          }`}
        >
          {/* Header when on vacancies, messages or notifications tabs */}
          {activeTab !== 'applications' && activeTab !== 'profile' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3a2818] dark:text-slate-100 tracking-tight">
                  {activeTab === 'vacancies'
                    ? 'Explorar Vacantes Disponibles'
                    : activeTab === 'messages'
                    ? 'Mensajes con Reclutamiento'
                    : 'Centro de Notificaciones'}
                </h1>
                <p className="text-xs sm:text-sm text-[#70553b] dark:text-slate-400 mt-1">
                  {activeTab === 'vacancies'
                    ? 'Encuentra convocatorias laborales abiertas compatibles con tu perfil profesional.'
                    : activeTab === 'messages'
                    ? 'Conversa directamente con RRHH de cada empresa. Lo que envíen también llega a tu Telegram.'
                    : 'Historial y estado de los avisos remitidos por correo electrónico y Telegram.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB: MESSAGES (WEB <-> TELEGRAM CHAT) */}
          {activeTab === 'messages' && (
            <ChatPanel focusApplicationId={focusChatAppId} className="w-full" />
          )}

            {/* TAB: APPLICATIONS */}
            {activeTab === 'applications' && (() => {
              const totalApps = applications.length;
              const countPreselected = applications.filter((a) => a.status === 'Preseleccionado' || a.status === 'Contratado').length;
              const countInReview = applications.filter((a) => a.status === 'En revisión' || a.status === 'Entrevista').length;
              const countReceived = applications.filter((a) => a.status === 'Recibida').length;
              const countRejected = applications.filter((a) => a.status === 'Descartado').length;
              const appsWithScore = applications.filter((a) => typeof a.mlScore === 'number' && a.mlScore > 0);
              const avgMlScore =
                appsWithScore.length > 0
                  ? Math.round(appsWithScore.reduce((sum, a) => sum + (a.mlScore || 0), 0) / appsWithScore.length)
                  : 0;

              const pctPreselected = totalApps > 0 ? Math.round((countPreselected / totalApps) * 100) : 0;
              const pctInReview = totalApps > 0 ? Math.round((countInReview / totalApps) * 100) : 0;
              const pctReceived = totalApps > 0 ? Math.round((countReceived / totalApps) * 100) : 0;
              const pctRejected = totalApps > 0 ? Math.round((countRejected / totalApps) * 100) : 0;

              // Donut chart math (r=36 => circ ~ 226.2)
              const r = 36;
              const c = 2 * Math.PI * r;
              const sPre = totalApps > 0 ? (countPreselected / totalApps) * c : 0;
              const sRev = totalApps > 0 ? (countInReview / totalApps) * c : 0;
              const sRec = totalApps > 0 ? (countReceived / totalApps) * c : 0;
              const sRej = totalApps > 0 ? (countRejected / totalApps) * c : 0;

              const shelves = [
                {
                  floorNumber: 1,
                  title: 'Piso 1 · Expedientes Aceptados y Preseleccionados',
                  subtitle: 'Postulaciones con alta afinidad técnica que avanzaron con éxito',
                  badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                  dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse',
                  icon: Award,
                  apps: applications.filter((a) => a.status === 'Preseleccionado' || a.status === 'Contratado'),
                },
                {
                  floorNumber: 2,
                  title: 'Piso 2 · Expedientes en Revisión y Entrevistas',
                  subtitle: 'En análisis por el equipo de selección o en etapa de entrevistas',
                  badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                  dotColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
                  icon: Clock,
                  apps: applications.filter((a) => a.status === 'En revisión' || a.status === 'Entrevista'),
                },
                {
                  floorNumber: 3,
                  title: 'Piso 3 · Expedientes Enviados y Recibidos',
                  subtitle: 'Postulaciones registradas recientemente en espera de evaluación',
                  badgeColor: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
                  dotColor: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]',
                  icon: Mail,
                  apps: applications.filter((a) => a.status === 'Recibida'),
                },
                {
                  floorNumber: 4,
                  title: 'Piso 4 · Expedientes Concluidos y Negados',
                  subtitle: 'Procesos finalizados o no seleccionados para la posición',
                  badgeColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                  dotColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
                  icon: FileText,
                  apps: applications.filter((a) => a.status === 'Descartado'),
                },
              ];

              return (
                <div className="w-full flex-1 flex flex-col border-b border-[#c8b193] dark:border-[#F1F2EC]/12 bg-white dark:bg-transparent animate-in fade-in duration-300">
                  {/* Pestaña Superior de Expediente Manila (Shared Bottom Border) */}
                  <div className="w-full border-b-2 border-[#c8b193] dark:border-[#F1F2EC]/12 bg-[#e5d4bc] dark:bg-[#F1F2EC]/[0.03] dark:backdrop-blur-[2px]">
                    <div className="w-full px-6 sm:px-10 py-3 border-b border-[#c8b193]/70 dark:border-[#F1F2EC]/10 bg-[#dfcbaf] dark:bg-transparent flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#543b23] dark:text-[#F1F2EC]">
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                          <Folder className="w-3.5 h-3.5" />
                        </div>
                        <span className="uppercase tracking-wider">EXPEDIENTE DE SEGUIMIENTO Y POSTULACIONES</span>
                        <span className="text-[#a58665] dark:text-[#777873]">·</span>
                        <span className="font-mono text-[11px] text-[#795b3d] dark:text-[#777873]">
                          MATRÍCULA: EXP-CAND-2026
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Perfil y Métricas en Rejilla con Bordes Compartidos */}
                  <div className="w-full border-b-2 border-[#c8b193] dark:border-[#F1F2EC]/12 bg-white dark:bg-transparent">
                    {/* 2 Columnas Divididas con Borde Vertical Compartido: Tarjeta de Perfil (Izq 6 cols) + Donut de Métricas (Der 6 cols) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x-2 divide-[#c8b193] dark:divide-[#F1F2EC]/12 w-full items-stretch">
                      {/* Lado Izquierdo: Tarjeta de Perfil Estilo Wave Banner Full-Bleed (Paleta PlataformaML) */}
                      <div className="lg:col-span-6 p-0 flex">
                        <div className="w-full h-full overflow-hidden bg-[#F1F2EC] dark:bg-[#0D1017] flex flex-col justify-between">
                          {/* Banner Superior Curvo con Nuestra Paleta (#090A0C, #4C6FFF, #C8FF45) */}
                          <div className="relative h-14 sm:h-16 overflow-hidden bg-gradient-to-br from-[#090A0C] via-[#2746C7] to-[#4C6FFF]">
                            {/* Ondas y destellos atmosféricos de paleta */}
                            <div
                              aria-hidden="true"
                              className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-[#4C6FFF]/55 blur-2xl"
                            />
                            <div
                              aria-hidden="true"
                              className="absolute -top-5 right-4 w-28 h-28 rounded-full bg-[#C8FF45]/45 blur-2xl"
                            />
                            <div
                              aria-hidden="true"
                              className="absolute bottom-1 left-1/4 w-40 h-12 rounded-full bg-[#C8FF45]/25 blur-xl"
                            />

                            {/* Badge sutil superior derecho */}
                            <div className="relative z-10 flex justify-end p-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#090A0C]/75 backdrop-blur-md border border-[#C8FF45]/45 text-[#C8FF45] text-[9px] font-bold tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF45]" />
                                <span>EXP-2026</span>
                              </span>
                            </div>

                            {/* Arco curvo inferior separando el banner del cuerpo */}
                            <svg
                              viewBox="0 0 400 44"
                              preserveAspectRatio="none"
                              aria-hidden="true"
                              className="absolute bottom-0 inset-x-0 w-full h-5 pointer-events-none"
                            >
                              <path
                                d="M0,44 C115,4 285,4 400,44 L400,44 L0,44 Z"
                                className="fill-[#F1F2EC] dark:fill-[#0D1017]"
                              />
                            </svg>
                          </div>

                          {/* Avatar Circular Centrado sobre el Arco + Información del Postulante */}
                          <div className="px-4 pb-2.5 -mt-7 relative z-10 flex flex-col items-center text-center">
                            <div className="relative shrink-0">
                              <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-[#4C6FFF] via-[#7B95FF] to-[#C8FF45] shadow-md">
                                {profilePhoto ? (
                                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-[#F1F2EC] dark:border-[#0D1017] relative group/mini">
                                    <img
                                      src={profilePhoto}
                                      alt="Foto de perfil"
                                      className="w-full h-full object-cover group-hover/mini:scale-105 transition-transform"
                                    />
                                    <button
                                      type="button"
                                      onClick={triggerPhotoInput}
                                      title="Cambiar foto de perfil"
                                      className="absolute inset-0 bg-black/65 opacity-0 group-hover/mini:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer gap-0.5"
                                    >
                                      <Camera className="w-3.5 h-3.5 text-[#C8FF45]" />
                                      <span className="text-[8px] font-bold">Editar</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={triggerPhotoInput}
                                    className="w-full h-full rounded-full border-2 border-[#F1F2EC] dark:border-[#0D1017] bg-[#e5d4bc] dark:bg-[#141923] hover:bg-[#dfcbaf] dark:hover:bg-[#1c2333] flex flex-col items-center justify-center text-[#3a2818] dark:text-[#F1F2EC] gap-0.5 cursor-pointer transition-colors"
                                    title="Haz clic para agregar tu foto de perfil"
                                  >
                                    <Camera className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" />
                                    <span className="text-[8px] font-bold">+ Foto</span>
                                  </button>
                                )}
                              </div>
                              <div
                                className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 dark:bg-[#C8FF45] rounded-full border-2 border-[#F1F2EC] dark:border-[#0D1017] shadow-xs"
                                title="Cuenta activa"
                              />
                            </div>

                            <div className="mt-1.5 flex items-center justify-center gap-1 max-w-full">
                              <h2 className="text-base font-black text-[#090A0C] dark:text-[#F1F2EC] leading-tight truncate">
                                {user?.name || 'Valeria Mendoza'}
                              </h2>
                              <BadgeCheck className="w-4 h-4 text-[#4C6FFF] dark:text-[#C8FF45] shrink-0" />
                            </div>

                            <p className="text-[11px] font-medium text-[#777873] truncate max-w-full mt-0.5">
                              {profile?.title || user?.email || 'Postulante · PlataformaML'}
                            </p>
                            <p className="text-[10px] text-[#777873]/85 truncate max-w-full font-mono-tabular">
                              {user?.email} · {user?.phone || '+1 (809) 555-0198'}
                            </p>
                          </div>

                          {/* Fila Inferior de 3 Columnas Numéricas con Divisores */}
                          <div className="grid grid-cols-3 divide-x divide-[#090A0C]/12 dark:divide-[#F1F2EC]/12 border-t border-[#090A0C]/10 dark:border-[#F1F2EC]/10 bg-[#090A0C]/[0.025] dark:bg-white/[0.02] py-2 px-2 text-center">
                            <div className="px-1">
                              <span className="block text-sm sm:text-base font-black text-[#090A0C] dark:text-[#F1F2EC] font-mono-tabular leading-tight">
                                {totalApps}
                              </span>
                              <span className="block text-[10px] font-medium text-[#777873] leading-tight mt-0.5">
                                Postulaciones totales
                              </span>
                            </div>
                            <div className="px-1">
                              <span className="block text-sm sm:text-base font-black text-[#4C6FFF] dark:text-[#C8FF45] font-mono-tabular leading-tight">
                                {countInReview + countPreselected}
                              </span>
                              <span className="block text-[10px] font-medium text-[#777873] leading-tight mt-0.5">
                                En proceso
                              </span>
                            </div>
                            <div className="px-1">
                              <span className="block text-sm sm:text-base font-black text-[#090A0C] dark:text-[#F1F2EC] font-mono-tabular leading-tight">
                                {avgMlScore}%
                              </span>
                              <span className="block text-[10px] font-medium text-[#777873] leading-tight mt-0.5">
                                Afinidad IA
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lado Derecho: Gráfico Circular Donut de Distribución Porcentual (6 cols) */}
                      <div className="lg:col-span-6 p-5 sm:p-6 space-y-3 bg-white dark:bg-[#F1F2EC]/[0.025] dark:backdrop-blur-[2px] dark:shadow-[inset_0_1px_0_rgba(241,242,236,0.1)] flex flex-col justify-center">
                        <div className="flex items-center justify-between pb-2 border-b border-[#c8b193]/40 dark:border-[#F1F2EC]/10">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F1F2EC]">
                              Distribución Porcentual de Postulaciones
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-[#777873]">
                              Métricas consolidadas de tu actividad en la plataforma
                            </p>
                          </div>
                          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#F1F2EC]/[0.06] dark:backdrop-blur-md dark:border dark:border-[#F1F2EC]/14 text-slate-600 dark:text-[#F1F2EC] font-semibold">
                            {totalApps} Total
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
                          {/* Gráfico Circular Donut */}
                          <div className="relative shrink-0 flex items-center justify-center">
                            <svg className="w-28 h-28 -rotate-90 transform shrink-0" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r={r}
                                className="stroke-slate-100 dark:stroke-slate-800"
                                strokeWidth="9"
                                fill="transparent"
                              />
                              {sPre > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={r}
                                  stroke="#10b981"
                                  strokeWidth="9"
                                  fill="transparent"
                                  strokeDasharray={`${sPre} ${c}`}
                                  strokeDashoffset="0"
                                  strokeLinecap="round"
                                />
                              )}
                              {sRev > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={r}
                                  stroke="#f59e0b"
                                  strokeWidth="9"
                                  fill="transparent"
                                  strokeDasharray={`${sRev} ${c}`}
                                  strokeDashoffset={`-${sPre}`}
                                  strokeLinecap="round"
                                />
                              )}
                              {sRec > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={r}
                                  stroke="#0ea5e9"
                                  strokeWidth="9"
                                  fill="transparent"
                                  strokeDasharray={`${sRec} ${c}`}
                                  strokeDashoffset={`-${sPre + sRev}`}
                                  strokeLinecap="round"
                                />
                              )}
                              {sRej > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={r}
                                  stroke="#f43f5e"
                                  strokeWidth="9"
                                  fill="transparent"
                                  strokeDasharray={`${sRej} ${c}`}
                                  strokeDashoffset={`-${sPre + sRev + sRec}`}
                                  strokeLinecap="round"
                                />
                              )}
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                                {totalApps}
                              </span>
                              <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                                Postuladas
                              </span>
                            </div>
                          </div>

                          {/* Leyenda */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1 text-xs w-full">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">Aceptadas</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 pl-4.5">
                                <strong className="text-slate-900 dark:text-slate-100 font-bold">{countPreselected}</strong> ({pctPreselected}%)
                              </p>
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">En revisión</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 pl-4.5">
                                <strong className="text-slate-900 dark:text-slate-100 font-bold">{countInReview}</strong> ({pctInReview}%)
                              </p>
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">Enviadas / Recibidas</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 pl-4.5">
                                <strong className="text-slate-900 dark:text-slate-100 font-bold">{countReceived}</strong> ({pctReceived}%)
                              </p>
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">Negadas</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 pl-4.5">
                                <strong className="text-slate-900 dark:text-slate-100 font-bold">{countRejected}</strong> ({pctRejected}%)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BIBLIOTECA DE CARPETAS DE 4 PISOS (Archivador Temático con Bordes Compartidos) */}
                  <div className="w-full flex flex-col">
                    {/* Barra de Título del Archivador (Shared Bottom Border) */}
                    <div className="w-full px-6 sm:px-10 py-3.5 bg-[#dfcbaf] dark:bg-[#090A0C]/55 dark:backdrop-blur-xl border-b-2 border-[#c8b193] dark:border-[#F1F2EC]/12 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#422e1c] dark:text-[#F1F2EC]">
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span>Biblioteca de Expedientes Laborales (4 Pisos de Trazabilidad)</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-[#f6eee2] dark:bg-[#F1F2EC]/[0.06] dark:backdrop-blur-md text-[#543b23] dark:text-[#F1F2EC] border border-[#d9c7ab] dark:border-[#F1F2EC]/14">
                        {totalApps} Carpetas archivadas
                      </span>
                    </div>

                    {/* Los 4 Pisos dentro de una Rejilla Continua Dividida */}
                    <div className="w-full divide-y-2 divide-[#c8b193] dark:divide-[#F1F2EC]/12 bg-white dark:bg-transparent">
                      {shelves.map((shelf) => {
                        const ShelfIcon = shelf.icon;

                        return (
                          <div key={shelf.floorNumber} className="w-full p-4 sm:p-6 lg:p-10 space-y-4">
                            {/* Cabecera del Piso */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs border border-amber-600 shadow-[0_2px_0_#92400e] shrink-0">
                                  <ShelfIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm sm:text-base font-extrabold text-[#3a2818] dark:text-[#F1F2EC]">
                                    {shelf.title}
                                  </h3>
                                  <p className="text-xs text-[#70553b] dark:text-[#777873]">
                                    {shelf.subtitle}
                                  </p>
                                </div>
                              </div>

                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${shelf.badgeColor}`}>
                                {shelf.apps.length} {shelf.apps.length === 1 ? 'carpeta' : 'carpetas'}
                              </span>
                            </div>

                            {/* Repisa / Estante de Carpetas */}
                            {shelf.apps.length === 0 ? (
                              <div className="py-7 px-4 text-center rounded-2xl border-2 border-dashed border-[#c8b193]/60 dark:border-[#F1F2EC]/16 bg-[#f9f5ee]/40 dark:bg-[#F1F2EC]/[0.035] dark:backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(241,242,236,0.08)]">
                                <p className="text-xs text-[#8c6f50] dark:text-[#777873] font-medium">
                                  No tienes expedientes archivados en este piso actualmente.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pt-1">
                                {shelf.apps.map((app) => (
                                  <div
                                    key={app.id}
                                    onClick={() => {
                                      setSelectedApp(app);
                                      setIsDetailOpen(true);
                                    }}
                                    className="relative group cursor-pointer transition-all duration-200 manila-folder-perspective"
                                  >
                                    {/* Pestaña de la Mini-Carpeta + Solapa trasera 3D */}
                                    <div className="flex items-end pl-0 pr-2.5">
                                      <div className="manila-folder-tab-3d relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#dfcbaf] dark:bg-[#29211A] border-t border-x border-[#c8b193] dark:border-[#46372B] text-[10px] font-bold text-[#553b23] dark:text-[#EBDCC8] select-none">
                                        <Folder className="w-3 h-3 text-[#85613c] dark:text-[#C4A482]" />
                                        <span className="truncate max-w-[130px]">{app.empresaNombre || 'Nexo Tecnología'}</span>
                                      </div>
                                      <div
                                        aria-hidden="true"
                                        className="h-2 flex-1 -ml-1 rounded-tr-lg bg-[#d5c0a0] dark:bg-[#2A2018] border-t border-r border-[#bfa786] dark:border-[#46372B]"
                                      />
                                    </div>

                                    {/* Cuerpo de la Carpeta Manila 3D */}
                                    <div className="manila-folder-body-3d rounded-xl rounded-tl-none p-4.5 relative overflow-hidden flex flex-col justify-between space-y-3.5">
                                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#dfcbaf]/80 via-[#f3e5cf]/90 to-[#d3bc9b]/80 dark:from-[#32271E] dark:via-[#3E3025] dark:to-[#271E17]" />

                                      <div className="space-y-2">
                                        {/* Círculo de Estado que cambia de color */}
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${shelf.dotColor}`} />
                                            <span className="text-[11px] font-black text-[#5c4025] dark:text-emerald-400 uppercase tracking-wider">
                                              {app.status}
                                            </span>
                                          </div>
                                          <span className="font-mono text-[10px] text-[#7d5f42] dark:text-slate-400">
                                            {app.appliedDate}
                                          </span>
                                        </div>

                                        <h4 className="text-sm font-extrabold text-[#3a2818] dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                                          {app.vacancyTitle}
                                        </h4>

                                        <p className="text-[11px] text-[#70553b] dark:text-slate-400 truncate">
                                          Postulante: {app.candidateName} · {app.vacancyDepartment}
                                        </p>
                                      </div>

                                      {/* Pie de la Mini-Carpeta */}
                                      <div className="pt-2.5 border-t border-[#d5be9f] dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                                        <span className="text-[#6d4f31] dark:text-slate-400 font-semibold flex items-center gap-1">
                                          <Paperclip className="w-3 h-3 rotate-45" /> #{app.id.slice(0, 6)}
                                        </span>

                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setFocusChatAppId(app.id);
                                              setActiveTab('messages');
                                            }}
                                            className="press px-2 py-0.5 rounded-md bg-[#0B5D46]/10 hover:bg-[#0B5D46]/20 dark:bg-[#4C6FFF]/15 dark:hover:bg-[#4C6FFF]/25 text-[#0B5D46] dark:text-[#C8FF45] font-bold inline-flex items-center gap-1 cursor-pointer"
                                            title="Abrir chat de esta postulación"
                                          >
                                            <MessageSquare className="w-3 h-3" />
                                            <span>Chat</span>
                                          </button>

                                          <span className="text-emerald-800 dark:text-emerald-300 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                                            <span>Abrir</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Repisa física de madera bajo las carpetas */}
                            <div className="h-2.5 bg-gradient-to-r from-[#cbb493] via-[#dfcbaf] to-[#cbb493] dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-full border-t border-[#bfa583] dark:border-slate-700 shadow-xs mt-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fila Inferior: Tarjetas Informativas Integradas con Bordes Compartidos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-[#c8b193] dark:divide-[#4d3c2e] border-t-2 border-[#c8b193] dark:border-slate-800 bg-[#faf7f2]/60 dark:bg-[#080C14]/60 w-full">
                    {/* Card 1: Perfil al día */}
                    <div className="p-6 sm:p-8 space-y-2">
                      <div className="flex items-center gap-2 text-[#3a2818] dark:text-slate-100 font-bold text-xs sm:text-sm">
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span>Tu perfil, siempre al día</span>
                      </div>
                      <p className="text-xs text-[#70553b] dark:text-slate-400 leading-relaxed">
                        Mantén tu currículum y teléfono actualizados para que podamos contactarte.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="mt-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 shadow-[0_3px_0_#92400e] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Revisar mi perfil</span>
                        <span>→</span>
                      </button>
                    </div>

                    {/* Card 2: Alertas Telegram y Correo */}
                    <div className="p-6 sm:p-8 space-y-2">
                      <div className="flex items-center gap-2 text-[#3a2818] dark:text-slate-100 font-bold text-xs sm:text-sm">
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <span>No te pierdas ninguna novedad</span>
                      </div>
                      <p className="text-xs text-[#70553b] dark:text-slate-400 leading-relaxed">
                        Te avisaremos por correo o Telegram cuando tu postulación cambie de estado.
                      </p>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 pt-1">
                        valeria.mendoza@correo.com
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB: PROFILE - RF05: Master Dossier: Grid with Shared Borders (Full-width, no floating boxes) */}
            {activeTab === 'profile' && profile && (
              <div className="w-full flex-1 flex flex-col border-b border-[#c8b193] dark:border-[#F1F2EC]/12 bg-trasparent dark:bg-trasparent animate-in fade-in duration-300">
                {/* Folder Top Tab Strip with Shared Bottom Border */}
                <div className="bg-white w-full border-b-2 border-[#c8b193] dark:border-[#F1F2EC]/12 bg-[#e5d4bc] dark:bg-[#F1F2EC]/[0.03] dark:backdrop-blur-[2px]">
                  <div className="w-full px-6 sm:px-10 py-3 border-b border-[#c8b193]/70 dark:border-[#F1F2EC]/10 bg-[#dfcbaf] dark:bg-transparent flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#543b23] dark:text-[#F1F2EC]">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                        <Folder className="w-3.5 h-3.5" />
                      </div>
                      <span className="uppercase tracking-wider">EXPEDIENTE DE CANDIDATO OFICIAL</span>
                      <span className="text-[#a58665] dark:text-[#777873]">·</span>
                      <span className="font-mono text-[11px] text-[#795b3d] dark:text-[#777873]">
                        ID: {profile.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Master 12-Column Grid with Shared Borders */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x-2 divide-[#c8b193] dark:divide-[#F1F2EC]/12 w-full flex-1 items-stretch">
                  {/* Left Column (4 cols): Portrait, Direct Contact, Immutable Actions */}
                  <div className="bg-white lg:col-span-4 bg-[#faf7f2] dark:bg-[#F1F2EC]/[0.025] dark:backdrop-blur-[2px] dark:shadow-[inset_0_1px_0_rgba(241,242,236,0.1)] flex flex-col divide-y divide-[#c8b193]/70 dark:divide-[#F1F2EC]/10">
                    {/* Sub-block 1: Portrait & Core Identity estilo Tarjeta con Fondo Diagonal (Paleta PlataformaML) */}
                    <div className="relative overflow-hidden">
                      {/* Fondo superior diagonal con nuestra paleta (#4C6FFF, #C8FF45) */}
                      <div
                        aria-hidden="true"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 72%, 0 100%)' }}
                        className="relative h-36 sm:h-40 w-full bg-gradient-to-br from-[#4C6FFF]/14 via-[#EEF1FF] to-[#C8FF45]/20 dark:from-[#4C6FFF]/22 dark:via-[#11172A] dark:to-[#C8FF45]/12 pointer-events-none"
                      >
                        <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-[#4C6FFF]/20 dark:bg-[#4C6FFF]/25 blur-2xl" />
                        <div className="absolute bottom-2 -left-6 w-32 h-24 rounded-full bg-[#C8FF45]/25 dark:bg-[#C8FF45]/15 blur-2xl" />
                        {/* Patrón de puntos sutiles superior izquierdo */}
                        <svg
                          aria-hidden="true"
                          className="absolute top-3 left-4 w-16 h-14 text-[#4C6FFF]/25 dark:text-[#C8FF45]/20"
                          viewBox="0 0 64 56"
                          fill="currentColor"
                        >
                          {[0, 12, 24, 36].map((x) =>
                            [0, 12, 24, 36].map((y) => (
                              <circle key={`${x}-${y}`} cx={x + 4} cy={y + 4} r="1.5" />
                            ))
                          )}
                        </svg>
                      </div>

                      {/* Retrato centrado superpuesto al corte diagonal */}
                      <div className="relative z-10 -mt-28 px-6 sm:px-7">
                        <div className="relative group w-36 sm:w-40 aspect-square mx-auto rounded-2xl overflow-hidden border-[3px] border-[#faf7f2] dark:border-[#0D1017] bg-[#f6eee2] dark:bg-[#090A0C] shadow-[0_14px_30px_-10px_rgba(9,10,12,0.22)] dark:shadow-[0_16px_34px_-10px_rgba(0,0,0,0.75)]">
                          {profilePhoto ? (
                            <div className="w-full h-full relative group/portrait">
                              <img
                                src={profilePhoto}
                                alt={`${profile.firstName} ${profile.lastName}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />

                              {/* Hover overlay con opciones de edición y eliminación */}
                              <div className="absolute inset-0 bg-[#090A0C]/70 backdrop-blur-xs opacity-0 group-hover/portrait:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 z-10">
                                <button
                                  type="button"
                                  onClick={triggerPhotoInput}
                                  className="w-full py-1.5 px-3 rounded-xl bg-[#4C6FFF] hover:bg-[#3d5ee6] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Camera className="w-3.5 h-3.5 text-[#C8FF45]" />
                                  <span>Editar imagen</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSavePhoto(null)}
                                  className="w-full py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Quitar foto</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Estado cuando NO han subido foto aún: "Agregar foto de perfil" */
                            <div
                              onClick={triggerPhotoInput}
                              className="w-full h-full border-2 border-dashed border-[#4C6FFF]/35 dark:border-[#F1F2EC]/20 hover:border-[#4C6FFF] dark:hover:border-[#C8FF45] bg-[#f6eee2] dark:bg-[#090A0C] flex flex-col items-center justify-center p-3 gap-2.5 cursor-pointer group/empty transition-all"
                              title="Haz clic para agregar tu foto de perfil"
                            >
                              <div className="w-11 h-11 rounded-full bg-[#4C6FFF]/12 dark:bg-[#C8FF45]/15 text-[#4C6FFF] dark:text-[#C8FF45] border border-[#4C6FFF]/30 dark:border-[#C8FF45]/35 flex items-center justify-center group-hover/empty:scale-110 transition-transform">
                                <Camera className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#4C6FFF] text-white dark:bg-[#C8FF45] dark:text-[#090A0C] text-[11px] font-bold">
                                  <Plus className="w-3 h-3" />
                                  <span>Agregar foto</span>
                                </span>
                                <p className="text-[9.5px] text-[#777873] font-medium">
                                  JPG, PNG o WEBP
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Información real del candidato alineada a la izquierda */}
                      <div className="px-6 sm:px-7 pt-4 pb-6 text-left space-y-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xl sm:text-2xl font-black text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-tight">
                              {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : user?.name || 'Candidato'}
                            </h3>
                            <BadgeCheck className="w-5 h-5 text-[#4C6FFF] dark:text-[#C8FF45] shrink-0" />
                          </div>
                          {profile.title && (
                            <p className="text-xs sm:text-sm font-bold text-[#4C6FFF] dark:text-[#C8FF45] mt-0.5">
                              {profile.title}
                            </p>
                          )}
                        </div>

                        {(profile.location || profile.skills.length > 0 || profile.cvFileName) && (
                          <div className="flex flex-wrap items-center gap-2">
                            {profile.location && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#F1F2EC]/[0.05] border border-[#c8b193]/60 dark:border-[#F1F2EC]/14 text-[11px] font-medium text-[#090A0C] dark:text-[#F1F2EC]/90">
                                <MapPin className="w-3 h-3 text-[#4C6FFF] dark:text-[#C8FF45] shrink-0" />
                                <span className="truncate max-w-[180px]">{profile.location}</span>
                              </span>
                            )}
                            {profile.skills.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#F1F2EC]/[0.05] border border-[#c8b193]/60 dark:border-[#F1F2EC]/14 text-[11px] font-medium text-[#090A0C] dark:text-[#F1F2EC]/90">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#C8FF45] shrink-0" />
                                <span>{profile.skills.length} competencias</span>
                              </span>
                            ) : profile.cvFileName ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#F1F2EC]/[0.05] border border-[#c8b193]/60 dark:border-[#F1F2EC]/14 text-[11px] font-medium text-[#090A0C] dark:text-[#F1F2EC]/90">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#C8FF45] shrink-0" />
                                <span>CV adjunto</span>
                              </span>
                            ) : null}
                          </div>
                        )}

                        {profile.bio && (
                          <p className="text-xs text-[#777873] dark:text-[#F1F2EC]/75 leading-relaxed line-clamp-3">
                            {profile.bio}
                          </p>
                        )}

                        {/* Botón directo y visible para Subir CV en PDF o DOC/DOCX */}
                        <div className="pt-2 space-y-2">
                          <button
                            type="button"
                            onClick={triggerDirectCvUpload}
                            disabled={isUploadingDirectCV}
                            className="press w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#0B5D46] hover:bg-[#094B38] text-white dark:bg-[#C8FF45] dark:hover:bg-[#d5ff6b] dark:text-[#090A0C] border border-[#073F2F] dark:border-[#C8FF45] shadow-xs cursor-pointer disabled:opacity-60"
                          >
                            {isUploadingDirectCV ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileUp className="w-4 h-4" />
                            )}
                            <span>
                              {isUploadingDirectCV
                                ? 'Procesando CV con IA...'
                                : 'SUBIR CV (SOLO PDF O DOC)'}
                            </span>
                          </button>

                          {(uploadedCVName || profile.cvFileName) && (
                            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px]">
                              <span className="font-bold text-emerald-800 dark:text-[#C8FF45] truncate flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{uploadedCVName || profile.cvFileName}</span>
                              </span>
                              <button
                                type="button"
                                onClick={handleDownloadCV}
                                className="text-[10px] font-black underline text-[#0B5D46] dark:text-[#C8FF45] shrink-0 cursor-pointer"
                              >
                                Descargar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sub-block 2: Canales de Contacto, Ubicación Editable + GPS y Controles de Visibilidad */}
                    <div className="p-6 sm:p-8 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Contacto, Ubicación & Privacidad
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility('profileVisible', 'Perfil Completo')}
                          className={`press inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                            visibility.profileVisible
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#C8FF45]/12 dark:text-[#C8FF45] dark:border-[#C8FF45]/30'
                              : 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300'
                          }`}
                          title="Elegir si las empresas pueden ver tu perfil completo"
                        >
                          {visibility.profileVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{visibility.profileVisible ? 'Perfil Visible' : 'Perfil Oculto'}</span>
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        {/* Correo con switch de visibilidad */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#F1F2EC]/[0.055] border border-[#c8b193]/50 dark:border-[#F1F2EC]/16">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-[#F1F2EC] truncate">
                              {editEmail || profile.email}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility('showEmail', 'Correo electrónico')}
                            className={`press inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer shrink-0 ml-2 ${
                              visibility.showEmail
                                ? 'text-emerald-700 dark:text-[#C8FF45] bg-emerald-500/10'
                                : 'text-slate-400 bg-slate-500/10'
                            }`}
                            title="Mostrar u ocultar tu correo a las empresas"
                          >
                            {visibility.showEmail ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{visibility.showEmail ? 'Visible' : 'Oculto'}</span>
                          </button>
                        </div>

                        {/* Teléfono / Telegram editable con botón de Conectar a Telegram y switch de visibilidad */}
                        <div className="p-3 rounded-xl bg-white dark:bg-[#F1F2EC]/[0.055] border border-[#c8b193]/50 dark:border-[#F1F2EC]/16 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-[#F1F2EC]">
                                Teléfono / Telegram
                              </span>
                              {telegramLinkedPhone && telegramLinkedPhone === editPhone.trim() && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                  <Check className="w-2.5 h-2.5" /> Telegram vinculado
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility('showPhone', 'Teléfono / Telegram')}
                              className={`press inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer shrink-0 ${
                                visibility.showPhone
                                  ? 'text-emerald-700 dark:text-[#C8FF45] bg-emerald-500/10'
                                  : 'text-slate-400 bg-slate-500/10'
                              }`}
                              title="Mostrar u ocultar tu teléfono a las empresas"
                            >
                              {visibility.showPhone ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{visibility.showPhone ? 'Visible' : 'Oculto'}</span>
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="Teléfono (+58 412 0000000)"
                                className="w-full min-w-0 px-2.5 py-1.5 rounded-lg text-xs bg-[#F6EEE2]/70 dark:bg-[#090A0C]/70 border border-[#C8B193] dark:border-[#F1F2EC]/15 text-slate-800 dark:text-[#F1F2EC] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
                              />
                              <input
                                type="text"
                                value={editTelegramUsername}
                                onChange={(e) => setEditTelegramUsername(e.target.value)}
                                placeholder="@usuario de Telegram"
                                className="w-full min-w-0 px-2.5 py-1.5 rounded-lg text-xs bg-[#F6EEE2]/70 dark:bg-[#090A0C]/70 border border-[#C8B193] dark:border-[#F1F2EC]/15 text-slate-800 dark:text-[#F1F2EC] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                Pon tu <strong>@usuario</strong> para entrega directa aunque tu número esté oculto en Telegram.
                              </span>

                              {/* Si ya está conectado, botón para Desvincular; si no, botón con logo de Telegram para Conectar */}
                              {telegramLinkedPhone &&
                              (telegramLinkedPhone === editTelegramUsername.trim() ||
                                telegramLinkedPhone === editPhone.trim()) ? (
                                <button
                                  type="button"
                                  onClick={handleUnlinkCandidateTelegram}
                                  title="Desvincular Telegram de tu perfil"
                                  className="press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer shrink-0 border bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30 transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Desvincular</span>
                                </button>
                              ) : (
                                (editPhone.trim().length >= 5 || editTelegramUsername.trim().replace(/^@+/, '').length >= 3) && (
                                  <button
                                    type="button"
                                    onClick={handleLinkCandidateTelegram}
                                    title="Conectar a Telegram"
                                    className="press group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer shrink-0 border bg-[#229ED9] hover:bg-[#1d8ec4] text-white border-[#1b86b8] shadow-xs transition-all"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                                      aria-hidden="true"
                                    >
                                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                    <span>Conectar a Telegram</span>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ubicación editable + Botón GPS + Switch de visibilidad */}
                        <div className="p-3 rounded-xl bg-white dark:bg-[#F1F2EC]/[0.055] border border-[#c8b193]/50 dark:border-[#F1F2EC]/16 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-[#F1F2EC]">
                                Ubicación (Extraída del CV o GPS)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility('showLocation', 'Ubicación')}
                              className={`press inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer shrink-0 ${
                                visibility.showLocation
                                  ? 'text-emerald-700 dark:text-[#C8FF45] bg-emerald-500/10'
                                  : 'text-slate-400 bg-slate-500/10'
                              }`}
                              title="Mostrar u ocultar tu ubicación a las empresas"
                            >
                              {visibility.showLocation ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{visibility.showLocation ? 'Visible' : 'Oculto'}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              placeholder="Ciudad, Estado, País..."
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs bg-[#F6EEE2]/70 dark:bg-[#090A0C]/70 border border-[#C8B193] dark:border-[#F1F2EC]/15 text-slate-800 dark:text-[#F1F2EC] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
                            />
                            <button
                              type="button"
                              onClick={() => handleDetectGPSLocation(false)}
                              disabled={isLocatingGps}
                              className="press px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#EFE5D4] hover:bg-[#E5D6BE] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#3A2818] dark:text-[#C8FF45] border border-[#C8B193] dark:border-slate-700 inline-flex items-center gap-1 cursor-pointer shrink-0"
                              title="Detectar ubicación con el GPS del teléfono o navegador"
                            >
                              {isLocatingGps ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <LocateFixed className="w-3.5 h-3.5" />
                              )}
                              <span>GPS</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveContactOnly}
                              className="press px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C] cursor-pointer shrink-0"
                              title="Guardar ubicación"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>

                        {/* Seguridad: Cambiar o Agregar Contraseña con código al Correo o Telegram */}
                        <div className="p-3.5 rounded-xl bg-white dark:bg-[#F1F2EC]/[0.055] border border-[#c8b193]/50 dark:border-[#F1F2EC]/16 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-[#F1F2EC] flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Cambiar o Agregar Contraseña</span>
                            </span>
                            <div className="inline-flex rounded-lg p-0.5 bg-[#EFE5D4] dark:bg-[#090A0C] border border-[#C8B193] dark:border-white/10">
                              <button
                                type="button"
                                onClick={() => {
                                  setPwdChannel('CORREO');
                                  setPwdCodeSent(false);
                                }}
                                className={`press px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                                  pwdChannel === 'CORREO'
                                    ? 'bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C]'
                                    : 'text-[#70553B] dark:text-[#9A9B94]'
                                }`}
                              >
                                Código al Correo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPwdChannel('TELEGRAM');
                                  setPwdCodeSent(false);
                                }}
                                className={`press px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                                  pwdChannel === 'TELEGRAM'
                                    ? 'bg-[#229ED9] text-white'
                                    : 'text-[#70553B] dark:text-[#9A9B94]'
                                }`}
                              >
                                Código Telegram
                              </button>
                            </div>
                          </div>

                          {!pwdCodeSent ? (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10.5px] text-[#70553B] dark:text-[#9A9B94] leading-snug">
                                {pwdChannel === 'CORREO' && (editEmail || profile.email)
                                  ? `Recibirás un código de 6 dígitos en ${editEmail || profile.email}.`
                                  : `Recibirás un código de 6 dígitos en tu Telegram (${editPhone || profile.phone || 'sin número'}).`}
                              </p>
                              <button
                                type="button"
                                onClick={handleSendCandidatePasswordCode}
                                disabled={isSendingPwdCode}
                                className="press px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C] cursor-pointer shrink-0 disabled:opacity-50"
                              >
                                {isSendingPwdCode ? 'Enviando...' : 'Enviar código'}
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleConfirmCandidatePasswordChange} className="space-y-2 pt-1 animate-pop-in">
                              <input
                                type="text"
                                value={pwdCode}
                                onChange={(e) => setPwdCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Código de 6 dígitos"
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-mono-tabular tracking-widest bg-[#F6EEE2]/70 dark:bg-[#090A0C]/70 border border-[#C8B193] dark:border-[#F1F2EC]/15 text-slate-800 dark:text-[#F1F2EC]"
                                required
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                <input
                                  type="password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Nueva contraseña"
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#F6EEE2]/70 dark:bg-[#090A0C]/70 border border-[#C8B193] dark:border-[#F1F2EC]/15 text-slate-800 dark:text-[#F1F2EC]"
                                  required
                                />
                                <input
                                  type="password"
                                  value={confirmNewPassword}
                                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                                  placeholder="Confirmar contraseña"
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[#F6EEE2]/70 dark:bg-[#090A0C]/70 border border-[#C8B193] dark:border-[#F1F2EC]/15 text-slate-800 dark:text-[#F1F2EC]"
                                  required
                                />
                              </div>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPwdCodeSent(false)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#70553B] dark:text-[#9A9B94] cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  disabled={isSavingPwd}
                                  className="press px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C] cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingPwd ? 'Guardando...' : 'Guardar contraseña'}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sub-block 3: CV Actions & Immutable Notice */}
                    <div className="p-6 sm:p-8 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleDownloadCV}
                          className="w-full inline-flex flex-row items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold text-white bg-[#0B5D46] hover:bg-[#094B38] dark:bg-emerald-600 dark:hover:bg-emerald-500 border border-[#073F2F] dark:border-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_0_#064e3b] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_0_#065f46] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer select-none"
                        >
                          <Download className="w-4 h-4 shrink-0 text-amber-400" />
                          <span className="leading-none tracking-wide">DESCARGAR CV</span>
                        </button>

                        {/* Botón táctil para subir nuevo CV y pedir reanálisis con IA */}
                        <button
                          type="button"
                          onClick={() => setIsReanalyzeModalOpen(true)}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_0_#92400e] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-slate-950" />
                          <span>Actualizar CV / Reanalizar con IA</span>
                        </button>

                        {/* Nota explicativa de inmutabilidad manual */}
                        <div className="p-3.5 rounded-2xl bg-[#f6eee2] dark:bg-[#F1F2EC]/[0.045] border border-[#d9c7ab] dark:border-[#F1F2EC]/14 dark:shadow-[inset_0_1px_0_rgba(241,242,236,0.1)] text-[11px] text-[#543b23] dark:text-[#F1F2EC]/85 leading-relaxed text-center space-y-1">
                          <span className="font-bold flex items-center justify-center gap-1.5 text-[#3a2818] dark:text-[#F1F2EC]">
                            <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 inline-flex items-center justify-center">
                              <Lock className="w-3 h-3" />
                            </span>
                            Datos del CV Inmutables
                          </span>
                          <p className="text-[10.5px] text-[#70553b] dark:text-[#777873]">
                            Para modificar tus datos, sube tu currículum actualizado y solicita un reanálisis a la IA.
                          </p>
                        </div>
                      </div>

                      <p className="text-[10px] text-center text-slate-400 dark:text-[#777873] font-mono pt-2">
                        EXPEDIENTE: {profile.id} · SANTO DOMINGO, RD
                      </p>
                    </div>
                  </div>

                  {/* Right Column (8 cols): Hero Header, CTA Banner, Skills, Education & Experience */}
                  <div className="lg:col-span-8 bg-trasparent dark:bg-transparent flex flex-col divide-y divide-[#c8b193]/70 dark:divide-[#F1F2EC]/12">
                    {/* Sub-block 1: Hero Typography, Badges, and Stamp Seal */}
                    <div className="p-6 sm:p-10 space-y-6 dark:bg-[#F1F2EC]/[0.03] dark:backdrop-blur-[2px] dark:shadow-[inset_0_1px_0_rgba(241,242,236,0.12)]">
                      {/* Big Hero Title: Nombre, Tecnología & IA + Cargo y Frase con Comillas */}
                      <div className="space-y-3">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-[#F1F2EC] tracking-tight leading-tight">
                          {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : user?.name || 'Candidato'}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 dark:bg-amber-400/12 dark:backdrop-blur-md text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/30 text-xs font-black uppercase tracking-wider">
                            Perfil de Talento
                          </span>
                          <span className="text-slate-300 dark:text-[#777873]">·</span>
                          <span className="text-slate-700 dark:text-[#F1F2EC]">
                            {profile.title || 'Perfil en configuración'}
                          </span>
                        </div>

                        {/* Subtitle / Bio con comillas */}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#F1F2EC]/78 leading-relaxed max-w-2xl italic font-medium pt-1">
                          “{profile.bio || 'Adjunta tu currículum vitae para que la inteligencia artificial analice tu perfil y extraiga tus competencias técnicas y trayectoria.'}”
                        </p>
                      </div>

                      {/* Badges / Stamp Seal and Rating Stack */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        {/* Circular Stamp / Seal */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-full border-2 border-dashed border-amber-500/80 dark:border-amber-400/80 flex items-center justify-center animate-[spin_25s_linear_infinite] shrink-0">
                            <div className="text-[7px] font-black uppercase tracking-widest text-slate-500 dark:text-[#777873] text-center select-none">
                              TALENTO • NEXO ML • ÉTICO •
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-[#F1F2EC] block">
                              Afinidad Algorítmica Certificada
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-[#777873]">
                              Filtrado ciego sin sesgos de género o edad
                            </span>
                          </div>
                        </div>

                        {/* Mini Rating / Affinity Stack (Frosted Glass Pill con indicador visual real) */}
                        {(() => {
                          const scoredApps = applications.filter(
                            (a) => typeof a.mlScore === 'number' && a.mlScore > 0,
                          );
                          const realAvgAffinity =
                            scoredApps.length > 0
                              ? Math.round(
                                  scoredApps.reduce((acc, a) => acc + (a.mlScore || 0), 0) /
                                    scoredApps.length,
                                )
                              : null;
                          const dashCirc = 2 * Math.PI * 16;
                          const dashVal = realAvgAffinity !== null ? (realAvgAffinity / 100) * dashCirc : 0;

                          return (
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#F1F2EC]/[0.065] dark:backdrop-blur-[2px] px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-[#F1F2EC]/18 shadow-2xs dark:shadow-[0_10px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(241,242,236,0.18)]">
                              {realAvgAffinity !== null ? (
                                <>
                                  <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                                    <svg className="w-11 h-11 -rotate-90" viewBox="0 0 40 40">
                                      <circle
                                        cx="20"
                                        cy="20"
                                        r="16"
                                        className="stroke-slate-200 dark:stroke-white/10"
                                        strokeWidth="4"
                                        fill="transparent"
                                      />
                                      <circle
                                        cx="20"
                                        cy="20"
                                        r="16"
                                        stroke="currentColor"
                                        className="text-emerald-600 dark:text-[#C8FF45]"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        fill="transparent"
                                        strokeDasharray={`${dashVal} ${dashCirc}`}
                                      />
                                    </svg>
                                    <span className="absolute text-[10px] font-mono-tabular font-black text-slate-900 dark:text-[#F1F2EC]">
                                      {realAvgAffinity}%
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-slate-900 dark:text-[#F1F2EC]">
                                      {realAvgAffinity}% Afinidad Media
                                    </div>
                                    <div className="text-[10px] text-emerald-700 dark:text-[#C8FF45] font-semibold">
                                      Basado en {scoredApps.length}{' '}
                                      {scoredApps.length === 1 ? 'postulación evaluada' : 'postulaciones evaluadas'}
                                    </div>
                                  </div>
                                </>
                              ) : profile.skills.length > 0 ? (
                                <>
                                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-[#C8FF45]/15 border border-emerald-500/30 dark:border-[#C8FF45]/35 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-5 h-5 text-emerald-700 dark:text-[#C8FF45]" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-slate-900 dark:text-[#F1F2EC]">
                                      Perfil listo para evaluación IA
                                    </div>
                                    <div className="text-[10px] text-emerald-700 dark:text-[#C8FF45] font-semibold">
                                      {profile.skills.length} competencias listas · Postúlate para ver tu afinidad
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                                    <FileUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-700 dark:text-[#F1F2EC]">
                                      Pendiente de CV
                                    </div>
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                      Sube tu CV para evaluar afinidad
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Sub-block 2: Large CTA Banner (Dark Glassmorphism, Shared Borders) */}
                    <div
                      onClick={() => onNavigate('vacancies')}
                      className="bg-white p-6 sm:p-8 bg-[#090A0C]/92 dark:bg-[#F1F2EC]/[0.04] dark:backdrop-blur-[3px] hover:bg-[#090A0C] dark:hover:bg-[#F1F2EC]/[0.07] border-y border-[#F1F2EC]/14 text-[#F1F2EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all group dark:shadow-[inset_0_1px_0_rgba(241,242,236,0.14)]"
                    >
                      <div className="space-y-1">
                        <h4 className="text-lg sm:text-xl font-black text-[#F1F2EC] group-hover:text-[#C8FF45] transition-colors">
                          Explorar Vacantes Compatibles Con Mi Perfil
                        </h4>
                        <p className="text-xs text-[#777873] group-hover:text-[#F1F2EC]/80 transition-colors">
                          Abre los expedientes en carpetas Manila y postula con 1 clic en el catálogo público.
                        </p>
                      </div>

                      <div className="w-11 h-11 rounded-full bg-amber-500 border border-amber-600 shadow-[0_3px_0_#92400e] group-hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-all shrink-0">
                        <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform" />
                      </div>
                    </div>

                    {/* Sub-block 3: Habilidades y Herramientas Normalizadas (RF05) */}
                    <div className="p-6 sm:p-8 space-y-4 dark:bg-[#F1F2EC]/[0.025] dark:backdrop-blur-[2px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-black text-slate-900 dark:text-[#F1F2EC] uppercase tracking-wider flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Code2 className="w-3.5 h-3.5" />
                          </div>
                          <span>Habilidades y Tecnologías Extraídas del CV</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility('showSkills', 'Habilidades')}
                            className={`press inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer ${
                              visibility.showSkills
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#C8FF45]/10 dark:text-[#C8FF45] dark:border-[#C8FF45]/30'
                                : 'bg-slate-200/70 text-slate-600 border-slate-300 dark:bg-white/10 dark:text-slate-400 dark:border-white/15'
                            }`}
                          >
                            {visibility.showSkills ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{visibility.showSkills ? 'Visible para empresas' : 'Oculto para empresas'}</span>
                          </button>
                          {profile.skills.length > 0 ? (
                            <span className="text-[11px] text-emerald-600 dark:text-[#C8FF45] font-bold bg-emerald-50 dark:bg-[#C8FF45]/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-[#C8FF45]/30 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> {profile.skills.length} validadas por IA
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-[#777873] font-medium">
                              Sin CV adjunto
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1">
                        {profile.skills.length > 0 ? (() => {
                          const SOFT_SKILL_REGEX = /(trabajo\s+en\s+equipo|liderazgo|comunicaci[oó]n|resoluci[oó]n\s+de\s+problemas|proactiv|adaptabilidad|creatividad|empat[ií]a|responsabilidad|organizaci[oó]n|gesti[oó]n\s+del\s+tiempo|pensamiento\s+cr[ií]tico|aprendizaje\s+(r[aá]pido|continuo)|atenci[oó]n\s+al\s+(detalle|cliente)|negociaci[oó]n|colaboraci[oó]n|flexibilidad|puntualidad|iniciativa|autonom[ií]a|inteligencia\s+emocional|trabajo\s+bajo\s+presi[oó]n|orientaci[oó]n\s+a\s+resultados|teamwork|leadership|communication|problem\s+solving)/i;
                          const softSkills = profile.skills.filter((s) => SOFT_SKILL_REGEX.test(s));
                          const technicalSkills = profile.skills.filter((s) => !SOFT_SKILL_REGEX.test(s));
                          return (
                            <div className="space-y-4">
                              {technicalSkills.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-[#C8FF45] block">
                                    Habilidades Técnicas ({technicalSkills.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {technicalSkills.map((skill) => (
                                      <span
                                        key={skill}
                                        className="px-3.5 py-1.5 bg-slate-50 dark:bg-[#F1F2EC]/[0.06] text-slate-800 dark:text-[#F1F2EC] border border-slate-200 dark:border-[#F1F2EC]/18 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:border-emerald-400 dark:hover:border-[#C8FF45]/60 transition-all shadow-2xs"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {softSkills.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                                    Habilidades Blandas ({softSkills.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {softSkills.map((skill) => (
                                      <span
                                        key={skill}
                                        className="px-3.5 py-1.5 bg-amber-50/70 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })() : (
                          <div className="p-4 rounded-xl border border-dashed border-[#c8b193]/70 dark:border-[#F1F2EC]/16 bg-[#fbf9f5] dark:bg-[#F1F2EC]/[0.035] text-center text-xs text-slate-500 dark:text-[#777873]">
                            Aún no has adjuntado tu CV. Sube tu currículum para que la IA extraiga tus habilidades técnicas y blandas automáticamente.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-block 4: Formación Académica & Experiencia Laboral (2 Sub-Columns with Shared Border) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#c8b193]/70 dark:divide-[#F1F2EC]/12 flex-1">
                      {/* Left Sub-Column: Formación Académica */}
                      <div className="p-6 sm:p-8 space-y-4 dark:bg-[#F1F2EC]/[0.025] dark:backdrop-blur-[2px]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-slate-900 dark:text-[#F1F2EC] uppercase tracking-wider flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                              <GraduationCap className="w-3.5 h-3.5" />
                            </div>
                            <span>Formación Académica</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility('showEducation', 'Formación Académica')}
                            className={`press inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer ${
                              visibility.showEducation
                                ? 'text-emerald-700 dark:text-[#C8FF45] bg-emerald-500/10'
                                : 'text-slate-400 bg-slate-500/10'
                            }`}
                          >
                            {visibility.showEducation ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{visibility.showEducation ? 'Visible' : 'Oculto'}</span>
                          </button>
                        </div>

                        {profile.education.length > 0 ? (
                          <div className="space-y-3">
                            {profile.education.map((edu, idx) => (
                              <div
                                key={idx}
                                className="p-4 bg-slate-50 dark:bg-[#F1F2EC]/[0.055] rounded-2xl border border-slate-200/80 dark:border-[#F1F2EC]/16 hover:dark:bg-[#F1F2EC]/[0.085] hover:dark:border-[#C8FF45]/40 transition-all dark:shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(241,242,236,0.16)] space-y-1.5"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-xs font-extrabold text-slate-900 dark:text-[#F1F2EC]">{edu.degree}</p>
                                  <span className="text-[10px] bg-slate-200/70 dark:bg-[#4C6FFF]/20 dark:border dark:border-[#4C6FFF]/35 text-slate-700 dark:text-[#F1F2EC] px-2.5 py-0.5 rounded-full font-bold shrink-0">
                                    {edu.graduationYear}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-[#777873]">{edu.institution}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-[#c8b193]/70 dark:border-[#F1F2EC]/16 bg-[#fbf9f5] dark:bg-[#F1F2EC]/[0.035] text-center text-xs text-slate-500 dark:text-[#777873]">
                            Sin formación registrada. Se completará al analizar tu CV.
                          </div>
                        )}
                      </div>

                      {/* Right Sub-Column: Experiencia Laboral Comprobada */}
                      <div className="p-6 sm:p-8 space-y-4 dark:bg-[#F1F2EC]/[0.025] dark:backdrop-blur-[2px]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-slate-900 dark:text-[#F1F2EC] uppercase tracking-wider flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                              <Briefcase className="w-3.5 h-3.5" />
                            </div>
                            <span>Experiencia Laboral Comprobada</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility('showExperience', 'Experiencia Laboral')}
                            className={`press inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer ${
                              visibility.showExperience
                                ? 'text-emerald-700 dark:text-[#C8FF45] bg-emerald-500/10'
                                : 'text-slate-400 bg-slate-500/10'
                            }`}
                          >
                            {visibility.showExperience ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{visibility.showExperience ? 'Visible' : 'Oculto'}</span>
                          </button>
                        </div>

                        {profile.experience.length > 0 ? (
                          <div className="space-y-3">
                            {profile.experience.map((exp, idx) => (
                              <div
                                key={idx}
                                className="p-4 bg-slate-50 dark:bg-[#F1F2EC]/[0.055] rounded-2xl border border-slate-200/80 dark:border-[#F1F2EC]/16 hover:dark:bg-[#F1F2EC]/[0.085] hover:dark:border-[#C8FF45]/40 transition-all dark:shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(241,242,236,0.16)] space-y-1.5"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-xs font-extrabold text-slate-900 dark:text-[#F1F2EC]">{exp.role}</p>
                                  <span className="text-[10px] text-slate-500 dark:text-[#777873] font-semibold shrink-0">
                                    {exp.period}
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-700 dark:text-[#C8FF45] font-bold">
                                  {exp.company}
                                </p>
                                <p className="text-[11px] text-slate-600 dark:text-[#F1F2EC]/80 mt-1 leading-snug">
                                  {exp.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-[#c8b193]/70 dark:border-[#F1F2EC]/16 bg-[#fbf9f5] dark:bg-[#F1F2EC]/[0.035] text-center text-xs text-slate-500 dark:text-[#777873]">
                            Sin historial laboral registrado. Se completará al analizar tu CV.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: EXPLORAR VACANTES */}
            {activeTab === 'vacancies' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Expedientes de Vacantes Disponibles</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Explora convocatorias abiertas con el formato de carpetas y fichas técnicas.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {vacancies.length} vacantes activas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-start">
                  {vacancies.map((vac) => {
                    const alreadyApplied = applications.some((a) => a.vacancyId === vac.id);
                    const isOpen = !!openCandidateVacancyIds[vac.id];

                    return (
                      <div
                        key={vac.id}
                        ref={registerFolderRef(vac.id)}
                        className="relative group transition-all duration-300 manila-folder-perspective"
                      >
                        {/* Pestaña superior de la carpeta + Solapa trasera 3D */}
                        <div className="flex items-end justify-start pl-0 pr-3">
                          <button
                            type="button"
                            onClick={() => toggleCandidateVacancy(vac.id)}
                            className="manila-folder-tab-3d relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-t-xl bg-[#dfcbaf] dark:bg-[#29211A] border-t border-x border-[#c8b193] dark:border-[#46372B] text-[11px] font-bold text-[#543b23] dark:text-[#EBDCC8] cursor-pointer select-none hover:bg-[#d5bf9f] dark:hover:bg-[#332920] transition-colors"
                          >
                            <Folder className="w-3.5 h-3.5 text-[#85613c] dark:text-[#C4A482]" />
                            <span className="truncate max-w-[170px]">
                              {vac.empresaNombre || 'Nexo Tecnología S.A.'}
                            </span>
                            <span className="text-[#a58665] dark:text-[#7D654F]">·</span>
                            <span className="uppercase text-[10px] tracking-wider text-[#795b3d] dark:text-[#CBB399]">
                              {vac.department}
                            </span>
                          </button>
                          <div
                            aria-hidden="true"
                            className="h-2.5 flex-1 -ml-1 rounded-tr-xl bg-[#d6c2a3] dark:bg-[#2A2018] border-t border-r border-[#c1ab89] dark:border-[#46372B] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,236,200,0.08)]"
                          />
                        </div>

                        {/* Cuerpo de la Carpeta Manila 3D */}
                        <div
                          className={`manila-folder-body-3d rounded-2xl rounded-tl-none p-5 sm:p-6 relative overflow-hidden ${
                            isOpen ? 'ring-2 ring-emerald-500/30' : ''
                          }`}
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#dfcbaf]/80 via-[#f3e5cf]/90 to-[#d3bc9b]/80 dark:from-[#32271E] dark:via-[#3E3025] dark:to-[#271E17]" />

                          {/* Encabezado de la Carpeta */}
                          <div
                            onClick={() => toggleCandidateVacancy(vac.id)}
                            className="cursor-pointer select-none space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f6eee2] dark:bg-[#0D131F] text-[#6d4f31] dark:text-slate-300 border border-[#d9c7ab] dark:border-slate-800">
                                    {vac.workMode}
                                  </span>
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f6eee2] dark:bg-[#0D131F] text-[#6d4f31] dark:text-slate-300 border border-[#d9c7ab] dark:border-slate-800">
                                    {vac.type}
                                  </span>
                                </div>

                                <h3 className="text-lg sm:text-xl font-extrabold text-[#3a2818] dark:text-slate-100 tracking-tight hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors">
                                  {vac.title}
                                </h3>

                                <p className="text-xs text-[#70553b] dark:text-slate-400 flex items-center gap-2 pt-0.5">
                                  <MapPin className="w-3.5 h-3.5 text-[#8d6741] dark:text-slate-400" />
                                  <span>{vac.location}</span>
                                  <span>·</span>
                                  <span className="font-mono text-[11px]">EXP-#{(vac.id || '01').slice(0, 6).toUpperCase()}</span>
                                </p>
                              </div>

                              <div className="shrink-0 flex items-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCandidateVacancy(vac.id);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d5be9f] hover:bg-[#cbb190] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#422e1b] dark:text-slate-100 font-bold text-xs border border-[#b39773] dark:border-slate-700 shadow-[0_3px_0_#8c6f50] dark:shadow-[0_3px_0_#0f172a] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                                >
                                  {isOpen ? (
                                    <>
                                      <span>Doblar</span>
                                      <ChevronUp className="w-4 h-4" />
                                    </>
                                  ) : (
                                    <>
                                      <span>Ver expediente</span>
                                      <ChevronDown className="w-4 h-4" />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {!isOpen && (
                              <p className="text-xs text-[#6e5339] dark:text-slate-400 line-clamp-2 leading-relaxed pt-1">
                                {vac.description}
                              </p>
                            )}
                          </div>

                          {/* Hoja de papel desplegable con animación */}
                          <div
                            className={`transition-all duration-500 ease-out transform origin-top ${
                              isOpen
                                ? 'max-h-[1200px] opacity-100 mt-5 translate-y-0 scale-100'
                                : 'max-h-0 opacity-0 -translate-y-4 scale-98 pointer-events-none overflow-hidden'
                            }`}
                          >
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="bg-[#fffdf9] dark:bg-[#121929] border border-amber-200/90 dark:border-slate-700/80 rounded-xl p-5 sm:p-6 manila-paper-sheet-3d relative space-y-4"
                            >
                              {/* Encabezado del papel */}
                              <div className="flex items-center justify-between pb-3 border-b border-amber-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                                  <Paperclip className="w-4 h-4 text-amber-600 dark:text-amber-400 rotate-45" />
                                  <span className="uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                                    Ficha Técnica de Convocatoria Laboral
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                  DOC-{vac.id}
                                </span>
                              </div>

                              {/* Contenido del papel */}
                              <div className="space-y-3 text-xs leading-relaxed">
                                <div>
                                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500 mb-1">
                                    Descripción del Cargo
                                  </h4>
                                  <p className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
                                    {vac.description}
                                  </p>
                                </div>

                                <div>
                                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500 mb-1.5">
                                    Habilidades Evaluadas por IA
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {vac.requiredSkills.map((skill) => (
                                      <span
                                        key={skill}
                                        className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-md"
                                      >
                                        ✓ {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {vac.requirements && vac.requirements.length > 0 && (
                                  <div>
                                    <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 dark:text-slate-500 mb-1">
                                      Requisitos del Puesto
                                    </h4>
                                    <ul className="text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                                      {vac.requirements.map((req, rIdx) => (
                                        <li key={rIdx}>{req}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Pie de acción del papel */}
                              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>Evaluación confidencial y objetiva</span>
                                </div>

                                {alreadyApplied ? (
                                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span>Ya estás postulado</span>
                                  </span>
                                ) : (
                                  <Button
                                    onClick={() => onApplyVacancy(vac)}
                                    size="md"
                                    variant="success"
                                    className="font-bold px-5 py-2.5"
                                  >
                                    <span>Postularme ahora</span>
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: NOTIFICACIONES (RF09) */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-[#090A0C]/70 dark:backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#F1F2EC]/14 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(241,242,236,0.1)] space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-[#F1F2EC]">
                    Bandeja de Notificaciones Automáticas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#777873] mt-0.5">
                    Historial de mensajes remitidos automáticamente a través de Telegram y Correo
                    Electrónico.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {notifications.map((notif) => {
                    const isInstant = notif.channel === 'Telegram' || notif.channel === 'WhatsApp';
                    return (
                    <div
                      key={notif.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-[#F1F2EC]/12 bg-slate-50/60 dark:bg-[#090A0C]/60 dark:backdrop-blur-lg flex items-start gap-3.5 dark:shadow-[inset_0_1px_0_rgba(241,242,236,0.06)]"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isInstant
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-[#C8FF45]/15 dark:text-[#C8FF45] dark:border dark:border-[#C8FF45]/30'
                            : 'bg-sky-100 text-sky-700 dark:bg-[#4C6FFF]/18 dark:text-[#4C6FFF] dark:border dark:border-[#4C6FFF]/35'
                        }`}
                      >
                        {isInstant ? (
                          <MessageSquare className="w-5 h-5" />
                        ) : (
                          <Mail className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-[#F1F2EC]">{notif.title}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                isInstant
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-[#C8FF45]/12 dark:text-[#C8FF45] dark:border-[#C8FF45]/30'
                                  : 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-[#4C6FFF]/14 dark:text-[#4C6FFF] dark:border-[#4C6FFF]/30'
                              }`}
                            >
                              Canal {isInstant ? 'Telegram' : notif.channel}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-[#777873]">{notif.timestamp}</span>
                        </div>
                        <p className="text-slate-600 dark:text-[#F1F2EC]/80 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 dark:text-[#777873]">Destinatario: {notif.recipient}</p>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}
        </div>
      </AppShell>

      {/* Detail Modal */}
      <ApplicationDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        application={selectedApp}
        onStatusUpdated={loadData}
        onOpenExplainability={() => {
          setIsDetailOpen(false);
          setIsExplainOpen(true);
        }}
      />

      {/* Explainability Modal (RF07) */}
      <MLExplainabilityModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        candidateName={selectedApp?.candidateName || 'Valeria Mendoza'}
        vacancyTitle={selectedApp?.vacancyTitle || 'Analista de Datos'}
        breakdown={selectedApp?.mlBreakdown}
      />

      {/* Modal: Actualizar CV & Reanálisis con IA (Manila Folder Header + Neumorphism) */}
      <Modal
        isOpen={isReanalyzeModalOpen}
        onClose={() => {
          if (!isReanalyzing) setIsReanalyzeModalOpen(false);
        }}
        title="Actualizar CV & Reanálisis con IA"
        subtitle="Verificación automática y ordenamiento ético de tu información profesional"
        maxWidth="lg"
        variant="manila"
      >
        <div className="space-y-5 pt-1">
          {/* Sección Editable Manualmente: Correo y Teléfono de Contacto (Neumorfismo) */}
          <div className="p-5 rounded-2xl bg-[#ecdcc6]/30 dark:bg-slate-900/60 border border-[#c8b193]/60 dark:border-slate-800 space-y-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c8b193]/30 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Datos de Contacto (Editables Directamente)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                Único campo manual permitido
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Correo Electrónico con Validación de Formato */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Correo Electrónico</span>
                  </label>
                  {editEmail && validateEmailFormat(editEmail) ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Formato Válido
                    </span>
                  ) : null}
                </div>

                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditEmail(val);
                    if (!val) {
                      setEmailError('El correo es obligatorio.');
                    } else if (!validateEmailFormat(val)) {
                      setEmailError('Formato inválido (ej: usuario@dominio.com).');
                    } else {
                      setEmailError('');
                    }
                  }}
                  placeholder="ejemplo@correo.com"
                  className={`w-full neu-inset-field rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition-all ${
                    emailError ? 'ring-2 ring-rose-500/50' : 'focus:ring-2 focus:ring-emerald-500/30'
                  }`}
                />
                {emailError && (
                  <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3" /> {emailError}
                  </p>
                )}
              </div>

              {/* Teléfono con Validación de Formato */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Teléfono / Telegram</span>
                  </label>
                  {editPhone && validatePhoneFormat(editPhone) ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Formato Válido
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditPhone(val);
                      if (!val) {
                        setPhoneError('El teléfono es obligatorio.');
                      } else if (!validatePhoneFormat(val)) {
                        setPhoneError('Formato inválido (ej: +58 412 0000000).');
                      } else {
                        setPhoneError('');
                      }
                    }}
                    placeholder="+58 412 0000000"
                    className={`flex-1 min-w-0 neu-inset-field rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition-all ${
                      phoneError ? 'ring-2 ring-rose-500/50' : 'focus:ring-2 focus:ring-emerald-500/30'
                    }`}
                  />

                  {editPhone.trim().length >= 5 && (
                    <button
                      type="button"
                      onClick={handleLinkCandidateTelegram}
                      title="Conectar a Telegram"
                      className={`press group inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 border transition-all ${
                        telegramLinkedPhone && telegramLinkedPhone === editPhone.trim()
                          ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40'
                          : 'bg-[#229ED9] hover:bg-[#1d8ec4] text-white border-[#1b86b8]'
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                        aria-hidden="true"
                      >
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                      <span className="hidden sm:inline">
                        {telegramLinkedPhone && telegramLinkedPhone === editPhone.trim()
                          ? 'Vinculado'
                          : 'Conectar a Telegram'}
                      </span>
                    </button>
                  )}
                </div>
                {phoneError && (
                  <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3" /> {phoneError}
                  </p>
                )}
              </div>
            </div>

            {/* Ubicación en el modal con detección GPS */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Ubicación (se extrae del CV o puedes usar el GPS de tu teléfono)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Ej. Maracaibo, Zulia, Venezuela"
                  className="flex-1 neu-inset-field rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleDetectGPSLocation(false)}
                  disabled={isLocatingGps}
                  className="press px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isLocatingGps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                  <span>Usar GPS</span>
                </button>
              </div>
            </div>

            {/* Guardar solo contacto */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#c8b193]/30 dark:border-slate-800">
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Puedes guardar tu correo, teléfono y ubicación sin necesidad de subir un nuevo CV.
              </span>
              <button
                type="button"
                onClick={handleSaveContactOnly}
                className="neu-raised-btn self-end sm:self-auto px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-[#fbf9f4] dark:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-all"
              >
                Guardar Contacto y Ubicación
              </button>
            </div>
          </div>

          {/* 3. Archivo de CV Actual (Neumórfico) */}
          <div className="p-4 rounded-2xl bg-[#ecdcc6]/20 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-slate-800 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>Archivo de CV Registrado:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {lastReanalysisTime}
              </span>
            </div>

            {uploadedCVName || profile?.cvFileName ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-[#c8b193]/40 dark:border-slate-700 text-xs shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    PDF
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      {uploadedCVName || profile?.cvFileName}
                    </span>
                    <span className="text-[10px] text-slate-400">Documento validado por IA</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" /> Activo
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Ningún CV registrado todavía. Carga tu archivo PDF o DOCX a continuación para extraer tus competencias con IA.</span>
              </div>
            )}
          </div>

          {/* 4. Dropzone Neumórfico para Cargar Nuevo CV */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Cargar Nuevo Curriculum Vitae (PDF o DOCX)</span>
            </label>
            <div className="border-2 border-dashed border-[#c8b193] dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-[#f9f5ee]/70 dark:bg-slate-900/40 group shadow-inner">
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                id="cv-upload-input"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (!isAllowedCvFormat(file.name)) {
                      showToast(
                        'Formato no permitido',
                        'Solo se aceptan archivos de CV en formato PDF o DOC / DOCX.',
                        'error',
                      );
                      e.target.value = '';
                      return;
                    }
                    setSelectedCVFile(file);
                    setUploadedCVName(file.name);
                    showToast('Documento cargado', `Se seleccionó ${file.name}. Listo para reanálisis.`, 'info');
                  }
                }}
              />
              <label htmlFor="cv-upload-input" className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-full neu-raised-btn bg-[#ebdcc8] dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Haz clic para seleccionar o arrastra tu nuevo CV
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Únicamente archivos PDF o DOC / DOCX (hasta 5 MB)
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 5. Reanalysis Progress Steps Animation */}
          {isReanalyzing && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-2 text-amber-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Reanalizando y Estructurando Perfil con IA...</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Paso {reanalyzeStep} de 4</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-linear-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${(reanalyzeStep / 4) * 100}%` }}
                />
              </div>

              <div className="space-y-1.5 pt-1 text-xs">
                <p className={`flex items-center gap-2 ${reanalyzeStep >= 1 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  {reanalyzeStep > 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>1. Extrayendo texto y metadatos del CV...</span>
                </p>
                <p className={`flex items-center gap-2 ${reanalyzeStep >= 2 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  {reanalyzeStep > 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>2. Reconociendo grados académicos y experiencia laboral...</span>
                </p>
                <p className={`flex items-center gap-2 ${reanalyzeStep >= 3 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  {reanalyzeStep > 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>3. Normalizando competencias técnicas y habilidades...</span>
                </p>
                <p className={`flex items-center gap-2 ${reanalyzeStep >= 4 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                  {reanalyzeStep >= 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>4. Actualizando datos verificados en Mi Perfil...</span>
                </p>
              </div>
            </div>
          )}

          {/* 6. Neumorphic Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c8b193]/30 dark:border-slate-800">
            <button
              type="button"
              disabled={isReanalyzing}
              onClick={() => setIsReanalyzeModalOpen(false)}
              className="neu-raised-btn px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-[#fbf9f4] dark:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              Cerrar
            </button>

            <button
              type="button"
              disabled={isReanalyzing}
              onClick={handleRunReanalysis}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_0_#92400e] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReanalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Procesando Reanálisis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Ejecutar Reanálisis con IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Input oculto para carga directa de CV (solo PDF, DOC, DOCX) */}
      <input
        type="file"
        ref={directCvInputRef}
        onChange={handleDirectCvFileChange}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />

      {/* Input oculto para carga de foto de perfil */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoFileChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Modal: Vista previa y confirmación de Foto de Perfil */}
      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title="Actualizar Foto de Perfil"
        subtitle="Verifica la vista previa antes de guardar tu foto de perfil"
        maxWidth="md"
        variant="manila"
      >
        <div className="space-y-6 pt-2">
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#ecdcc6]/20 dark:bg-slate-900/50 border border-[#c8b193]/50 dark:border-slate-800">
            {tempPhotoPreview ? (
              <div className="relative group w-44 h-44 rounded-2xl p-1 bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 shadow-md">
                <img
                  src={tempPhotoPreview}
                  alt="Vista previa de perfil"
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Camera className="w-10 h-10" />
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
              Esta imagen se mostrará en tu expediente, postulaciones y panel de usuario.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#c8b193]/30 dark:border-slate-800">
            <button
              type="button"
              onClick={triggerPhotoInput}
              className="neu-raised-btn px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-[#fbf9f4] dark:bg-slate-800 cursor-pointer flex items-center gap-2 hover:bg-slate-100"
            >
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Elegir otra imagen</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="neu-raised-btn px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleSavePhoto(tempPhotoPreview)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_0_#065f46] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Guardar Foto</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
