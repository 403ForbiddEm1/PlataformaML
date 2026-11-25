import React, { useEffect, useMemo, useState } from 'react';
import { Application, ApplicationStatus, Vacancy, MLFactorBreakdown, Employee, TerminationDetails } from '@/types';
import { applicationsService } from '@/services/applications.service';
import { vacanciesService } from '@/services/vacancies.service';
import { employeesService } from '@/services/employees.service';
import { catalogService, type CatalogData, type CatalogOptionType } from '@/services/catalog.service';
import { api, USE_MOCK } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { MLScoreBadge } from '@/components/ml/MLScoreBadge';
import { MLExplainabilityModal } from '@/components/ml/MLExplainabilityModal';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import { HireCandidateModal, canHireApplication } from '@/components/applications/HireCandidateModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { AppShell } from '@/components/layout/AppShell';
import { type SidebarSection } from '@/components/layout/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { EmailTemplatesEditor } from '@/components/company/EmailTemplatesEditor';
import { CandidateProfileDrawer } from '@/components/candidates/CandidateProfileDrawer';
import { QuickNotifyRowBar } from '@/components/applications/QuickNotifyRowBar';
import { type NotifyChannel } from '@/services/applications.service';
import {
  Users,
  Briefcase,
  Sparkles,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Brain,
  ShieldCheck,
  Building2,
  Clock,
  Phone,
  Mail,
  SlidersHorizontal,
  Sun,
  Moon,
  MoreVertical,
  UserX,
  AlertTriangle,
  Calculator,
  DollarSign,
  Calendar,
  Send,
  ShieldAlert,
  Award,
  FileSpreadsheet,
  UserMinus,
  Check,
  FolderPlus,
  Folder,
  X,
  ArrowLeft,
  MapPin,
  Eye,
  LogOut,
  Hourglass,
  RotateCcw,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

const parseCalendarDateMs = (raw?: string): number | null => {
  if (!raw) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0).getTime();
  }
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const HRDashboardPage: React.FC<{ onNavigate: (view: string, initialTab?: string) => void; initialTab?: string }> = ({
  onNavigate,
  initialTab,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  // Active top tab: candidates (ranking), employees (plantilla), messages (chat), templates (plantillas)
  const [activeTab, setActiveTab] = useState<'candidates' | 'employees' | 'messages' | 'templates'>(() =>
    initialTab === 'employees' || initialTab === 'messages' || initialTab === 'templates'
      ? initialTab
      : 'candidates'
  );

  useEffect(() => {
    if (
      initialTab === 'candidates' ||
      initialTab === 'employees' ||
      initialTab === 'messages' ||
      initialTab === 'templates'
    ) {
      setActiveTab(initialTab);
      if (initialTab === 'candidates') {
        setSelectedVacancyForRanking(null);
      }
    }
  }, [initialTab]);
  const [profileDrawerApp, setProfileDrawerApp] = useState<Application | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancyForRanking, setSelectedVacancyForRanking] = useState<Vacancy | null>(null);
  const [vacancyStatusTab, setVacancyStatusTab] = useState<'activas' | 'inactivas' | 'todas'>('activas');
  const [vacancySearchQuery, setVacancySearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByML, setSortByML] = useState(true);
  const [expandedNotifyAppId, setExpandedNotifyAppId] = useState<string | null>(null);
  const [autoNotifyChannel, setAutoNotifyChannel] = useState<NotifyChannel>('AMBOS');
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const [isHrCandidateFiltersOpen, setIsHrCandidateFiltersOpen] = useState(false);
  const [isHrEmployeeFiltersOpen, setIsHrEmployeeFiltersOpen] = useState(false);

  // Employees state (affiliated to RRHH company)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('all');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'Activo' | 'Despedido'>('all');
  const [openMenuEmployeeId, setOpenMenuEmployeeId] = useState<string | null>(null);
  // Historical timeline scrubber for employee stats (0 = Tiempo Actual on Left -> 100 = Account Creation on Right)
  const [timelineStep, setTimelineStep] = useState(0);
  const [isScrubbingTimeline, setIsScrubbingTimeline] = useState(false);
  const [hoveredTimelineNodeIdx, setHoveredTimelineNodeIdx] = useState<number | null>(null);
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | undefined>(user?.createdAt);

  // Active modals
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [selectedAppForHire, setSelectedAppForHire] = useState<Application | null>(null);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);

  // Dismissal modal state
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [selectedEmployeeForDismiss, setSelectedEmployeeForDismiss] = useState<Employee | null>(null);
  const [dismissReason, setDismissReason] = useState('Desahucio por el empleador (Sin justa causa)');
  const [dismissNoticeGiven, setDismissNoticeGiven] = useState<'pagado' | 'trabajado'>('pagado');
  const [dismissNoticeDays, setDismissNoticeDays] = useState(28);
  const [dismissVacationDays, setDismissVacationDays] = useState(14);
  const [dismissDate, setDismissDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dismissAnnouncement, setDismissAnnouncement] = useState('');
  const [dismissSendEmail, setDismissSendEmail] = useState(true);
  const [isProcessingDismiss, setIsProcessingDismiss] = useState(false);

  // Settlement view modal state (for already dismissed employees)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [viewingSettlementEmployee, setViewingSettlementEmployee] = useState<Employee | null>(null);

  // Create vacancy modal state (RF02)
  const [isCreateVacancyOpen, setIsCreateVacancyOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('Tecnología & Desarrollo de Software');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newCareer, setNewCareer] = useState('');
  const [catalog, setCatalog] = useState<CatalogData>({
    departamentos: [
      'Tecnología & Desarrollo de Software',
      'Datos, Analítica & Machine Learning',
      'Talento Humano & Recursos Humanos',
      'Administración & Finanzas',
      'Marketing Digital & Comunicaciones',
      'Operaciones, Logística & Cadena de Suministro',
    ],
    especialidades: [],
    carreras: [],
  });
  const [addingCatalogType, setAddingCatalogType] = useState<CatalogOptionType | null>(null);
  const [newCatalogOptionName, setNewCatalogOptionName] = useState('');
  const [isSavingCatalogOption, setIsSavingCatalogOption] = useState(false);
  const [newLocation, setNewLocation] = useState('Santo Domingo, RD');
  const [newWorkMode, setNewWorkMode] = useState<'Híbrido' | 'Presencial' | 'Remoto'>('Híbrido');
  const [newType, setNewType] = useState<'Tiempo completo' | 'Medio tiempo' | 'Pasantía'>('Tiempo completo');
  const [newDescription, setNewDescription] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newMinExperienceYears, setNewMinExperienceYears] = useState(2);
  const [newOpenings, setNewOpenings] = useState(1);
  const [isCreatingVacancy, setIsCreatingVacancy] = useState(false);

  const loadData = async () => {
    try {
      const [apps, vacs, emps, cat] = await Promise.all([
        applicationsService.getAll(),
        vacanciesService.getAll(),
        employeesService.getAll(user?.empresaId || user?.companyId || undefined),
        catalogService.getCatalog().catch(() => null),
      ]);
      setApplications(apps);
      setVacancies(vacs);
      setEmployees(emps);
      if (cat && cat.departamentos.length > 0) {
        setCatalog(cat);
        setNewDepartment((prev) => (cat.departamentos.includes(prev) ? prev : cat.departamentos[0]));
      }
    } catch {
      showToast('Error', 'No se pudieron cargar los datos de talento humano.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    setAccountCreatedAt(user?.createdAt);
    if (USE_MOCK || !user) return;
    const token = localStorage.getItem('nexo_auth_token');
    if (!token || token.startsWith('mock-') || token.startsWith('local-')) return;

    let cancelled = false;
    api
      .get<{ createdAt?: string }>('/auth/me')
      .then((res) => {
        if (!cancelled && res.data?.createdAt) {
          setAccountCreatedAt(res.data.createdAt);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Read-only historical snapshot of employee statistics along [0 = Hoy (right) ... 100 = HR Account Creation (left)]
  const employeeTimelineData = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const nowEndOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const rawCreatedMs = parseCalendarDateMs(accountCreatedAt || user?.createdAt);
    const validCreatedMs = rawCreatedMs !== null && rawCreatedMs <= nowMs ? rawCreatedMs : nowStartOfDay;
    const createdDate = new Date(validCreatedMs);
    const createdStartOfDay = new Date(
      createdDate.getFullYear(),
      createdDate.getMonth(),
      createdDate.getDate(),
      0,
      0,
      0,
      0
    ).getTime();

    const isSameDayAccount = createdStartOfDay >= nowStartOfDay;
    const anchorNowMs = isSameDayAccount ? nowMs : nowEndOfDay;
    const earliestEventMs = isSameDayAccount
      ? Math.min(validCreatedMs, nowMs - 60000)
      : createdStartOfDay;

    const totalSpanMs = Math.max(anchorNowMs - earliestEventMs, 60000);
    const eventMarks: { percent: number; type: 'hire' | 'dismissal'; label: string }[] = [];

    for (const emp of employees) {
      const hireMs = parseCalendarDateMs(emp.hiredDate);
      if (hireMs !== null && hireMs >= earliestEventMs && hireMs <= anchorNowMs) {
        const pct = Math.min(100, Math.max(0, ((anchorNowMs - hireMs) / totalSpanMs) * 100));
        eventMarks.push({ percent: pct, type: 'hire', label: `Ingreso: ${emp.name}` });
      }
      if (emp.status === 'Despedido') {
        const termMs = parseCalendarDateMs(emp.terminationDetails?.terminationDate);
        if (termMs !== null && termMs >= earliestEventMs && termMs <= anchorNowMs) {
          const pct = Math.min(100, Math.max(0, ((anchorNowMs - termMs) / totalSpanMs) * 100));
          eventMarks.push({ percent: pct, type: 'dismissal', label: `Baja: ${emp.name}` });
        }
      }
    }

    const clampedStep = Math.min(100, Math.max(0, timelineStep));
    const selectedMs = anchorNowMs - (clampedStep / 100) * totalSpanMs;
    const selectedDateObj = new Date(selectedMs);
    const cutoffMs = isSameDayAccount
      ? selectedMs
      : new Date(
          selectedDateObj.getFullYear(),
          selectedDateObj.getMonth(),
          selectedDateObj.getDate(),
          23,
          59,
          59,
          999
        ).getTime();

    const daysAgo = Math.max(0, Math.round((anchorNowMs - cutoffMs) / 86400000));
    const dateFormatter = new Intl.DateTimeFormat('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const dateTimeFormatter = new Intl.DateTimeFormat('es-DO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const monthFormatter = new Intl.DateTimeFormat('es-DO', {
      month: 'short',
      year: 'numeric',
    });
    const axisFormatter = totalSpanMs <= 2 * 86400000
      ? dateTimeFormatter
      : totalSpanMs >= 90 * 86400000
      ? monthFormatter
      : dateFormatter;

    const computeSnapshotAt = (pct: number) => {
      if (pct <= 0) {
        const currentActive = employees.filter((e) => e.status === 'Activo');
        const currentDismissed = employees.filter((e) => e.status === 'Despedido');
        return {
          dateObj: now,
          label: 'Hoy',
          fullDate: 'Tiempo Actual (Hoy)',
          total: employees.length,
          active: currentActive.length,
          dismissed: currentDismissed.length,
          payroll: currentActive.reduce((acc, c) => acc + (c.salary || 0), 0),
        };
      }

      const ptMs = anchorNowMs - (pct / 100) * totalSpanMs;
      const ptDateObj = new Date(ptMs);
      const ptCutoffMs = new Date(
        ptDateObj.getFullYear(),
        ptDateObj.getMonth(),
        ptDateObj.getDate(),
        23,
        59,
        59,
        999
      ).getTime();

      let act = 0;
      let dis = 0;
      let pay = 0;

      for (const emp of employees) {
        const hireMs = parseCalendarDateMs(emp.hiredDate);
        if (hireMs !== null && hireMs > ptCutoffMs) continue;

        let dismissedAtPct = false;
        if (emp.status === 'Despedido') {
          const termMs = parseCalendarDateMs(emp.terminationDetails?.terminationDate);
          dismissedAtPct = termMs !== null ? termMs <= ptCutoffMs : true;
        }

        if (dismissedAtPct) {
          dis += 1;
        } else {
          act += 1;
          pay += emp.salary || 0;
        }
      }

      const formattedPtDate = isSameDayAccount
        ? dateTimeFormatter.format(ptDateObj)
        : dateFormatter.format(ptDateObj);

      return {
        dateObj: ptDateObj,
        label: formattedPtDate,
        fullDate: formattedPtDate,
        total: act + dis,
        active: act,
        dismissed: dis,
        payroll: pay,
      };
    };

    // Build clean chronological series containing ONLY start, real change points, and end
    const candidatePercents: number[] = [clampedStep, 100];
    if (isSameDayAccount) {
      for (const m of eventMarks) {
        const p = Math.min(100, Math.max(clampedStep, Number(m.percent.toFixed(2))));
        candidatePercents.push(p);
        candidatePercents.push(Math.min(100, Number((p + 0.5).toFixed(2))));
      }
    } else {
      const spanDays = Math.max(1, Math.round((anchorNowMs - earliestEventMs) / 86400000));
      const dayStep = Math.max(1, Math.ceil(spanDays / 45));
      for (let d = 1; d < spanDays; d += dayStep) {
        const dayEndMs = anchorNowMs - d * 86400000;
        const pct = Math.min(100, Math.max(clampedStep, ((anchorNowMs - dayEndMs) / totalSpanMs) * 100));
        candidatePercents.push(Number(pct.toFixed(2)));
      }
      for (const m of eventMarks) {
        const p = Math.min(100, Math.max(clampedStep, Number(m.percent.toFixed(2))));
        candidatePercents.push(p);
      }
    }

    const sortedCandidatePercents = Array.from(
      new Set(
        candidatePercents
          .filter((p) => p >= clampedStep && p <= 100)
          .map((p) => Number(p.toFixed(2)))
      )
    ).sort((a, b) => a - b);

    const sampledSeries = sortedCandidatePercents.map((pct) => ({
      percent: pct,
      ...computeSnapshotAt(pct),
    }));

    const hasMetricChange = (
      a: { total: number; active: number; dismissed: number; payroll: number },
      b: { total: number; active: number; dismissed: number; payroll: number }
    ) =>
      a.total !== b.total ||
      a.active !== b.active ||
      a.dismissed !== b.dismissed ||
      a.payroll !== b.payroll;

    const spanRemaining = Math.max(100 - clampedStep, 1);
    const minSpacingPct = Math.max(3.5, spanRemaining * 0.06);

    const visibleSeries: Array<(typeof sampledSeries)[number] & { isCursorAnchor: boolean }> = [];
    for (let i = 0; i < sampledSeries.length; i++) {
      const pt = sampledSeries[i];
      const isFirst = i === 0;
      const isLast = i === sampledSeries.length - 1;
      const changed = i > 0 && hasMetricChange(pt, sampledSeries[i - 1]);

      if (isFirst) {
        visibleSeries.push({ ...pt, isCursorAnchor: true });
      } else if (isLast) {
        const prev = visibleSeries[visibleSeries.length - 1];
        if (prev && Math.abs(pt.percent - prev.percent) < 0.01) {
          visibleSeries[visibleSeries.length - 1] = { ...pt, isCursorAnchor: false };
        } else {
          visibleSeries.push({ ...pt, isCursorAnchor: false });
        }
      } else if (changed) {
        const prevKept = visibleSeries[visibleSeries.length - 1];
        const farEnoughFromStart = !prevKept || pt.percent - prevKept.percent >= minSpacingPct;
        const farEnoughFromEnd = 100 - pt.percent >= minSpacingPct;
        if (farEnoughFromStart && farEnoughFromEnd) {
          visibleSeries.push({ ...pt, isCursorAnchor: false });
        }
      }
    }

    if (visibleSeries.length === 1 && clampedStep < 100) {
      visibleSeries.push({ percent: 100, ...computeSnapshotAt(100), isCursorAnchor: false });
    }

    const maxHeadcount = Math.max(1, ...sampledSeries.map((p) => p.total));
    const maxPayroll = Math.max(1, ...sampledSeries.map((p) => p.payroll));

    const isCritical = (arr: number[], idx: number, maxVal: number) => {
      const v = arr[idx];
      if (v <= 0) return false;
      if (v === maxVal) return true;
      const prev = idx > 0 ? arr[idx - 1] : v;
      const next = idx < arr.length - 1 ? arr[idx + 1] : v;
      return v > prev && v >= next;
    };

    const totalsArr = visibleSeries.map((s) => s.total);
    const activesArr = visibleSeries.map((s) => s.active);
    const dismissedArr = visibleSeries.map((s) => s.dismissed);
    const payrollsArr = visibleSeries.map((s) => s.payroll);
    const currentSnapshot = visibleSeries[0] || computeSnapshotAt(clampedStep);

    const chartNodes = visibleSeries
      .map((pt, idx) => {
        const rawNorm = clampedStep >= 99.5 ? (idx === 0 ? 1 : 0) : (pt.percent - clampedStep) / spanRemaining;
        const xNorm = 1 - rawNorm;
        return {
          ...pt,
          xNorm,
          peakTotal: isCritical(totalsArr, idx, maxHeadcount),
          peakActive: isCritical(activesArr, idx, maxHeadcount),
          peakDismissed: isCritical(dismissedArr, idx, maxHeadcount),
          peakPayroll: isCritical(payrollsArr, idx, maxPayroll),
        };
      })
      .sort((a, b) => a.xNorm - b.xNorm);

    const selectedFormatted = isSameDayAccount
      ? dateTimeFormatter.format(selectedDateObj)
      : dateFormatter.format(selectedDateObj);

    return {
      isLive: clampedStep === 0,
      selectedLabel: clampedStep === 0 ? 'Tiempo Actual (Hoy)' : selectedFormatted,
      daysAgo: clampedStep === 0 ? 0 : daysAgo,
      earliestLabel: axisFormatter.format(new Date(earliestEventMs)),
      midLabel: axisFormatter.format(new Date(anchorNowMs - totalSpanMs * 0.5)),
      total: currentSnapshot.total,
      active: currentSnapshot.active,
      dismissed: currentSnapshot.dismissed,
      payroll: currentSnapshot.payroll,
      eventMarks,
      chartNodes,
      totalSeriesCount: visibleSeries.length,
      prunedNodesCount: 0,
      maxHeadcount,
      maxPayroll,
    };
  }, [employees, timelineStep, accountCreatedAt, user?.createdAt]);

  // Calculation of termination settlement (Cuadre de Liquidación Laboral)
  const calculateSettlement = (emp: Employee) => {
    const salary = emp.salary || 80000;
    const dailySalary = salary / 23.83; // Standard statutory daily wage factor

    // Notice (Preaviso)
    const isNoticePaid =
      dismissNoticeGiven === 'pagado' &&
      dismissReason !== 'Despido con causa justificada (Art. 88 Código de Trabajo)';
    const noticeAmount = isNoticePaid ? Math.round(dismissNoticeDays * dailySalary) : 0;

    // Severance (Auxilio de Cesantía)
    const isSeveranceApplicable =
      dismissReason !== 'Despido con causa justificada (Art. 88 Código de Trabajo)' &&
      dismissReason !== 'Mutuo consentimiento / Conclusión de contrato';
    const severanceDays = 28;
    const severanceAmount = isSeveranceApplicable ? Math.round(severanceDays * dailySalary) : 0;

    // Unused Vacation (Vacaciones proporcionales)
    const vacationAmount = Math.round(dismissVacationDays * dailySalary);

    // Christmas salary (Salario de Navidad / Regalía Pascual acumulada)
    const currentMonth = new Date(dismissDate).getMonth() + 1;
    const christmasSalaryAmount = Math.round((salary / 12) * currentMonth);

    const totalSettlement = noticeAmount + severanceAmount + vacationAmount + christmasSalaryAmount;

    return {
      dailySalary: Math.round(dailySalary),
      noticeAmount,
      severanceAmount,
      severanceDays,
      vacationAmount,
      christmasSalaryAmount,
      totalSettlement,
    };
  };

  const handleOpenDismissModal = (emp: Employee) => {
    setSelectedEmployeeForDismiss(emp);
    setOpenMenuEmployeeId(null);
    setDismissReason('Desahucio por el empleador (Sin justa causa)');
    setDismissNoticeGiven('pagado');
    setDismissNoticeDays(28);
    setDismissVacationDays(14);
    setDismissDate(new Date().toISOString().split('T')[0]);
    setDismissAnnouncement(
      `Por medio de la presente, la empresa ${emp.empresaNombre} le notifica formalmente la conclusión de sus labores en el puesto de ${emp.role}. Se adjunta el desglose del finiquito y cuadre de liquidación legal correspondiente.`
    );
    setDismissSendEmail(true);
    setIsDismissModalOpen(true);
  };

  const handleConfirmDismissal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForDismiss) return;

    setIsProcessingDismiss(true);
    try {
      const calc = calculateSettlement(selectedEmployeeForDismiss);
      const details: TerminationDetails = {
        terminationDate: dismissDate,
        reason: dismissReason,
        noticePeriodDays: dismissNoticeDays,
        noticeAmount: calc.noticeAmount,
        severanceAmount: calc.severanceAmount,
        vacationAmount: calc.vacationAmount,
        christmasSalaryAmount: calc.christmasSalaryAmount,
        totalSettlement: calc.totalSettlement,
        processedBy: user?.name || 'Lic. Carlos Arismendi (RRHH)',
        notifiedViaEmail: dismissSendEmail,
        announcementNote: dismissAnnouncement,
      };

      await employeesService.dismissEmployee(selectedEmployeeForDismiss.id, details);

      showToast(
        'Despido Formalizado',
        `Se ha procesado la baja de ${selectedEmployeeForDismiss.name}. Cuadre total de liquidación: RD$ ${calc.totalSettlement.toLocaleString('es-DO')}.`,
        'success'
      );

      setIsDismissModalOpen(false);
      setSelectedEmployeeForDismiss(null);
      loadData();
    } catch {
      showToast('Error', 'No se pudo formalizar el despido.', 'error');
    } finally {
      setIsProcessingDismiss(false);
    }
  };

  // 1. Company vacancies (Scoped to RRHH company with status division)
  const currentEmpId = user?.empresaId || user?.companyId;
  const currentEmpName = (user?.empresaNombre || user?.companyName || '').trim().toLowerCase();

  const companyVacancies = vacancies.filter((v) => {
    if (user?.role === 'superadmin') return true;
    if (!currentEmpId && !currentEmpName) return true;

    const vacEmpId = v.empresaId || v.companyId;
    if (currentEmpId && vacEmpId && vacEmpId === currentEmpId) return true;

    const vacEmpName = (v.empresaNombre || v.companyName || '').trim().toLowerCase();
    if (
      currentEmpName &&
      vacEmpName &&
      (vacEmpName === currentEmpName ||
        vacEmpName.includes(currentEmpName) ||
        currentEmpName.includes(vacEmpName))
    ) {
      return true;
    }

    if (!vacEmpId && !vacEmpName) return true;
    return false;
  });

  const activeVacancies = companyVacancies.filter((v) => v.status === 'Abierta');
  const inactiveVacancies = companyVacancies.filter(
    (v) => v.status === 'Cerrada' || v.status === 'Pausada'
  );

  const displayedVacancies = (
    vacancyStatusTab === 'activas'
      ? activeVacancies
      : vacancyStatusTab === 'inactivas'
      ? inactiveVacancies
      : companyVacancies
  ).filter((v) => {
    if (!vacancySearchQuery) return true;
    const q = vacancySearchQuery.toLowerCase();
    return (
      v.title.toLowerCase().includes(q) ||
      v.department.toLowerCase().includes(q) ||
      v.workMode.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q)
    );
  });

  // Toggle Vacancy Status (Activar / Pausar / Cerrar)
  const handleToggleVacancyStatus = async (vacId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await vacanciesService.toggleStatus(vacId);
      showToast(
        'Estado actualizado',
        `La vacante "${updated.title}" ahora está ${
          updated.status === 'Abierta' ? 'Activa' : 'Inactiva / Cerrada'
        }.`,
        'success'
      );
      if (selectedVacancyForRanking && selectedVacancyForRanking.id === vacId) {
        setSelectedVacancyForRanking(updated);
      }
      await loadData();
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo actualizar el estado de la vacante.', 'error');
    }
  };

  // 2. Candidate applications scoped to the selected vacancy (when viewing its intelligent AI ranking)
  const currentVacancyApplications = selectedVacancyForRanking
    ? applications.filter((app) => app.vacancyId === selectedVacancyForRanking.id)
    : [];

  const filteredCandidates = currentVacancyApplications
    .filter((app) => {
      if (selectedStatus !== 'all' && app.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          app.candidateName.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q) ||
          app.candidatePhone.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortByML) {
        return (b.mlScore || 0) - (a.mlScore || 0); // Ranked by ML Affinity
      }
      return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
    });

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription) {
      showToast('Campos requeridos', 'Ingresa al menos el título y la descripción del cargo.', 'error');
      return;
    }

    setIsCreatingVacancy(true);
    try {
      const companyId = user?.empresaId || user?.companyId || 'emp-local';
      const companyName = user?.empresaNombre || user?.companyName || 'Comercio1';

      const extraRequirements: string[] = [];
      if (newSpecialty) extraRequirements.push(`Especialidad: ${newSpecialty}`);
      if (newCareer) extraRequirements.push(`Carrera / Formación: ${newCareer}`);

      const baseRequirements = newRequirements
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      const created = await vacanciesService.create({
        empresaId: companyId,
        companyId: companyId,
        empresaNombre: companyName,
        companyName: companyName,
        title: newTitle.trim(),
        department: newDepartment,
        location: newLocation.trim(),
        workMode: newWorkMode,
        type: newType,
        status: 'Abierta',
        description: newDescription.trim(),
        requirements: [...extraRequirements, ...baseRequirements],
        requiredSkills: newSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        minExperienceYears: newMinExperienceYears,
        openings: newOpenings,
      });

      // RF02: Vacante creada
      showToast('Vacante Creada', `La posición "${newTitle}" ya está disponible para recibir postulaciones.`, 'success');
      setIsCreateVacancyOpen(false);
      // Reset form
      setNewTitle('');
      setNewSpecialty('');
      setNewCareer('');
      setNewDescription('');
      setNewSkills('');
      setNewRequirements('');
      setNewMinExperienceYears(2);
      setNewOpenings(1);
      await loadData();
      // Open the newly created vacancy's ranking view
      setSelectedVacancyForRanking(created);
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo crear la vacante.', 'error');
    } finally {
      setIsCreatingVacancy(false);
    }
  };

  const handleQuickDecision = async (app: Application, status: ApplicationStatus) => {
    try {
      await applicationsService.updateStatus(
        app.id,
        status,
        user?.name || 'Carlos Arismendi (RRHH)',
        `Decisión rápida desde el panel de clasificación.`
      );
      // RF08 & RF09: Decisión humana y notificación automática
      showToast(
        `Candidato ${status}`,
        `Se registró la decisión y se notificó a ${app.candidateName} vía Telegram/Email.`,
        'success'
      );
      loadData();
    } catch {
      showToast('Error', 'No se pudo actualizar el estado.', 'error');
    }
  };

  const handleSwitchTab = (nextTab: 'candidates' | 'employees' | 'messages' | 'templates') => {
    if (nextTab === 'candidates') {
      setSelectedVacancyForRanking(null);
    }
    setActiveTab(nextTab);
  };

  const sidebarSections: SidebarSection[] = [
    {
      title: 'TALENTO HUMANO',
      items: [
        { id: 'candidates', label: 'Convocatorias & Ranking IA', icon: Briefcase, badge: companyVacancies.length },
        { id: 'employees', label: 'Plantilla & Nómina', icon: Users, badge: employees.length },
        { id: 'messages', label: 'Mensajes y Telegram', icon: MessageSquare },
        { id: 'templates', label: 'Plantillas de Avisos', icon: Mail },
      ],
    },
    {
      title: 'EXPLORAR',
      items: [
        { id: 'external-vacancies', label: 'Catálogo público', icon: ExternalLink, external: true },
      ],
    },
  ];

  const activeTitle =
    activeTab === 'candidates'
      ? selectedVacancyForRanking
        ? `Ranking: ${selectedVacancyForRanking.title}`
        : 'Convocatorias & Ranking IA'
      : activeTab === 'employees'
      ? 'Plantilla & Nómina'
      : activeTab === 'messages'
      ? 'Mensajes con Postulantes'
      : 'Plantillas de Notificación';

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans transition-colors">
      <AppShell
        sections={sidebarSections}
        activeId={activeTab}
        onSelect={(id) => {
          if (id === 'external-vacancies') {
            onNavigate('vacancies');
            return;
          }
          handleSwitchTab(id as typeof activeTab);
        }}
        brandSubtitle="MESA DE EVALUACIÓN · RRHH"
        crumbRoot="Talento Humano"
        title={activeTitle}
        roleLabel="RRHH"
        contextLabel={user?.empresaNombre || 'Empresa Afiliada'}
        onLogout={() => {
          logout();
          onNavigate('login');
        }}
        onBrandClick={() => onNavigate('vacancies')}
        topbarExtra={
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-[#F1F2EC]/6 border border-[#c8b193] dark:border-[#F1F2EC]/12 text-xs text-[#3a2818] dark:text-[#F1F2EC]">
              <Building2 className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#4C6FFF]" />
              <span className="font-semibold">{user?.empresaNombre || 'Empresa Afiliada'}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#3a2818] dark:bg-[#090A0C] text-xs font-mono-tabular text-[#EFE5D4] dark:text-[#C8FF45] font-semibold">
                ID: {(user?.empresaId || 'emp-01').slice(0, 8)}
              </span>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCreateVacancyOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs press"
            >
              Nueva Vacante
            </Button>
          </div>
        }
      >
        <div
          className="w-full flex-1"
          onClick={() => {
            if (openMenuEmployeeId) setOpenMenuEmployeeId(null);
          }}
        >
          {/* PANEL 1: CONVOCATORIAS & RANKING IA */}
          {activeTab === 'candidates' && (
            <div
              key={selectedVacancyForRanking?.id || 'list'}
              className="animate-page-enter-left max-w-[1680px] mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6"
            >
            {/* VISTA A: LISTADO Y GESTIÓN DE CONVOCATORIAS (ACTIVAS / INACTIVAS) */}
            {!selectedVacancyForRanking ? (
              <div className="space-y-6">
                {/* Glassmorphic Header Banner */}
                <div className="glass-panel-dark text-[#F1F2EC] rounded-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C8FF45]/15 border border-[#C8FF45]/35 text-[#C8FF45] text-[11px] font-mono-tabular font-semibold uppercase tracking-wider">
                      <Briefcase className="w-3.5 h-3.5 text-[#C8FF45]" /> REGISTRO DE CONVOCATORIAS & EVALUACIÓN XAI
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#F1F2EC]">
                      Convocatorias y Vacantes de {user?.empresaNombre || 'la Empresa'}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#777873] leading-relaxed">
                      Administra las plazas abiertas y cerradas. Selecciona cualquier convocatoria para abrir su <strong className="text-[#F1F2EC]">Acta de Clasificación Inteligente</strong> con puntajes tabulares de afinidad y factores auditables.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-[#F1F2EC]/12 w-full md:w-auto md:min-w-[330px] shrink-0 bg-[#090A0C]/80 backdrop-blur-md py-3.5 px-2 sm:p-4 rounded-xl border border-[#F1F2EC]/12">
                    <div className="text-center px-2 sm:px-4 min-w-0">
                      <span className="text-xl sm:text-2xl font-mono-tabular font-bold block text-[#C8FF45]">{activeVacancies.length}</span>
                      <span className="block text-[10px] sm:text-xs font-mono-tabular uppercase tracking-normal sm:tracking-wider text-[#777873] truncate">Activas</span>
                    </div>
                    <div className="text-center px-2 sm:px-4 min-w-0">
                      <span className="text-xl sm:text-2xl font-mono-tabular font-bold block text-[#F1F2EC]">{inactiveVacancies.length}</span>
                      <span className="block text-[10px] sm:text-xs font-mono-tabular uppercase tracking-normal sm:tracking-wider text-[#777873] truncate">Inactivas</span>
                    </div>
                    <div className="text-center px-2 sm:px-4 min-w-0">
                      <span className="text-xl sm:text-2xl font-mono-tabular font-bold block text-[#4C6FFF]">{applications.length}</span>
                      <span className="block text-[10px] sm:text-xs font-mono-tabular uppercase tracking-normal sm:tracking-wider text-[#777873] truncate">Postulaciones</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Navbar: Tabs for Activas / Inactivas / Todas + Search & Create */}
                <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-between">
                  {/* Segmented status selector pills */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={() => setVacancyStatusTab('activas')}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        vacancyStatusTab === 'activas'
                          ? 'bg-emerald-500 text-white border border-emerald-600 shadow-[0_3px_0_#065f46] active:translate-y-[2px] active:shadow-none'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 active:translate-y-[1px]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                      <span>Vacantes Activas ({activeVacancies.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVacancyStatusTab('inactivas')}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        vacancyStatusTab === 'inactivas'
                          ? 'bg-slate-700 text-white border border-slate-600 shadow-[0_3px_0_#1e293b] active:translate-y-[2px] active:shadow-none'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 active:translate-y-[1px]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Inactivas ({inactiveVacancies.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVacancyStatusTab('todas')}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        vacancyStatusTab === 'todas'
                          ? 'bg-slate-900 dark:bg-slate-700 text-white border border-slate-700 shadow-[0_3px_0_#020617] active:translate-y-[2px] active:shadow-none'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 active:translate-y-[1px]'
                      }`}
                    >
                      <span>Todas ({companyVacancies.length})</span>
                    </button>
                  </div>

                  {/* Search and Action */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Buscar por cargo, área o ubicación..."
                        value={vacancySearchQuery}
                        onChange={(e) => setVacancySearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => setIsCreateVacancyOpen(true)}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      className="shrink-0"
                    >
                      Nueva Vacante
                    </Button>
                  </div>
                </div>

                {/* Grid of Vacancies (Inspired by Plugin / Compatible With Cards Grid in image) */}
                {displayedVacancies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
                    {displayedVacancies.map((vac) => {
                      const vacApps = applications.filter((a) => a.vacancyId === vac.id);
                      const isAbierta = vac.status === 'Abierta';

                      return (
                        <div
                          key={vac.id}
                          onClick={() => setSelectedVacancyForRanking(vac)}
                          className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden"
                        >
                          {/* Accent glow on hover */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all pointer-events-none" />

                          <div className="space-y-4">
                            {/* Card Top: Status & Applications badge */}
                            <div className="flex items-center justify-between gap-2">
                              {isAbierta ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  Activa (Abierta)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                                  Inactiva ({vac.status})
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <Users className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{vacApps.length} postulantes</span>
                              </span>
                            </div>

                            {/* Job Title & Department */}
                            <div>
                              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                                {vac.title}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                <span>{vac.department}</span>
                                <span>·</span>
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{vac.location}</span>
                              </p>
                            </div>

                            {/* Tags: WorkMode, Contract, Openings */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                                {vac.workMode}
                              </span>
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                                {vac.type}
                              </span>
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {vac.openings} {vac.openings === 1 ? 'vacante' : 'vacantes'}
                              </span>
                            </div>

                            {/* Required Skills tags */}
                            {vac.requiredSkills && vac.requiredSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {vac.requiredSkills.slice(0, 3).map((skill, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-2 py-0.5 rounded text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {vac.requiredSkills.length > 3 && (
                                  <span className="px-1.5 py-0.5 text-xs text-slate-400 font-semibold">
                                    +{vac.requiredSkills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Card Footer: Status toggle & Tactile CTA Button */}
                          <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                            {/* Toggle status button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleVacancyStatus(vac.id, e)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                isAbierta
                                  ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-amber-500 hover:border-amber-500 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none'
                                  : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-600 text-white shadow-[0_3px_0_#065f46] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none'
                              }`}
                              title={isAbierta ? 'Pausar o cerrar vacante' : 'Reabrir vacante para postulaciones'}
                            >
                              {isAbierta ? 'Pausar' : 'Reactivar'}
                            </button>

                            {/* Tactile Action Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVacancyForRanking(vac);
                              }}
                              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                            >
                              Ver Ranking IA
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty state for vacancies */
                  <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-xl mx-auto shadow-xs">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-[#0B5D46] dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                      <Briefcase className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {vacancyStatusTab === 'activas'
                          ? 'No tienes vacantes activas en este momento'
                          : vacancyStatusTab === 'inactivas'
                          ? 'No hay vacantes inactivas o pausadas'
                          : 'No se encontraron vacantes con ese criterio'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {vacancyStatusTab === 'activas'
                          ? 'Actualmente tu empresa no tiene convocatorias abiertas para recibir postulantes. Crea una nueva vacante para iniciar la recepción y clasificación con Inteligencia Artificial.'
                          : 'Todas las convocatorias de la empresa se encuentran actualmente abiertas o puedes crear una nueva.'}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => setIsCreateVacancyOpen(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Crear Nueva Vacante
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* VISTA B: RANKING INTELIGENTE DE LA VACANTE SELECCIONADA */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Return breadcrumb button */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedVacancyForRanking(null)}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#FCFBF8] dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#D8D2C5] dark:border-slate-700 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer group"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#0B5D46] dark:text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Volver a Convocatorias de la Empresa</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>Convocatorias</span>
                    <span>/</span>
                    <strong className="text-slate-900 dark:text-slate-200">{selectedVacancyForRanking.title}</strong>
                  </div>
                </div>

                {/* Vacancy Dossier Header Card */}
                <div className="bg-[#0D131F] text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 relative z-10 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono-tabular font-semibold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> ACTA DE CLASIFICACIÓN INTELIGENTE
                      </span>
                      {selectedVacancyForRanking.status === 'Abierta' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-tabular font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          VACANTE ACTIVA
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-tabular font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          INACTIVA ({selectedVacancyForRanking.status})
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {selectedVacancyForRanking.title}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span><strong className="text-white">Área:</strong> {selectedVacancyForRanking.department}</span>
                      <span>·</span>
                      <span><strong className="text-white">Modalidad:</strong> {selectedVacancyForRanking.workMode}</span>
                      <span>·</span>
                      <span><strong className="text-white">Ubicación:</strong> {selectedVacancyForRanking.location}</span>
                      <span>·</span>
                      <span className="font-mono-tabular"><strong className="text-white">Plazas:</strong> {selectedVacancyForRanking.openings}</span>
                    </p>
                  </div>

                  {/* Vacancy KPI Counters */}
                  <div className="flex items-center gap-5 shrink-0 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                    <div className="text-center px-1">
                      <span className="text-2xl font-mono-tabular font-bold block text-white">{currentVacancyApplications.length}</span>
                      <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">Postulantes</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800" />
                    <div className="text-center px-1">
                      <span className="text-2xl font-mono-tabular font-bold block text-emerald-400">
                        {currentVacancyApplications.filter((a) => a.status === 'Preseleccionado').length}
                      </span>
                      <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">Preseleccionados</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800" />
                    <div className="text-center px-1">
                      <span className="text-2xl font-mono-tabular font-bold block text-amber-300">
                        {currentVacancyApplications.filter((a) => a.status === 'Entrevista').length}
                      </span>
                      <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-400">Entrevistas</span>
                    </div>
                  </div>
                </div>

                {/* Filter & Search Toolbar Scoped to this Vacancy */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch sm:items-center">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="Buscar postulante por nombre, teléfono o correo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full min-h-[42px] pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsHrCandidateFiltersOpen((prev) => !prev)}
                      className="sm:hidden inline-flex items-center justify-between gap-2 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      aria-expanded={isHrCandidateFiltersOpen}
                    >
                      <span className="inline-flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Filtros y Notificación</span>
                      </span>
                      {isHrCandidateFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className={`${isHrCandidateFiltersOpen ? 'flex' : 'hidden sm:flex'} flex-col md:flex-row gap-3 items-stretch md:items-center justify-between`}>
                    {/* Status selector */}
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full sm:w-auto min-h-[42px] text-xs font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="Recibida">Recibida</option>
                      <option value="En revisión">En revisión</option>
                      <option value="Preseleccionado">Preseleccionado</option>
                      <option value="Entrevista">Entrevista</option>
                      <option value="Contratado">Contratado</option>
                      <option value="Descartado">Descartado</option>
                    </select>

                    {/* Sort toggle + Auto-notify channel + Bulk reject <50% */}
                    <div className="shrink-0 flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                      <select
                        value={autoNotifyChannel}
                      onChange={(e) => setAutoNotifyChannel(e.target.value as NotifyChannel)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer"
                      title="Canal automático de notificaciones"
                    >
                      <option value="AMBOS">Auto: Telegram + Correo</option>
                      <option value="TELEGRAM">Auto: Solo Telegram / Chat</option>
                      <option value="CORREO">Auto: Solo Correo</option>
                    </select>

                    {(() => {
                      const below50 = filteredCandidates.filter(
                        (a) =>
                          typeof a.mlScore === 'number' &&
                          a.mlScore < 50 &&
                          a.status !== 'Descartado' &&
                          a.status !== 'Contratado'
                      );
                      const companyLogoLocal =
                        typeof window !== 'undefined'
                          ? localStorage.getItem(`nexo_company_logo_${user?.empresaId || user?.companyId || user?.empresaNombre || ''}`) ||
                            localStorage.getItem(`nexo_company_logo_${user?.empresaNombre || user?.companyName || ''}`)
                          : null;
                      return (
                        <button
                          type="button"
                          disabled={below50.length === 0 || isBulkRejecting}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `¿Descartar automáticamente a los ${below50.length} candidatos con afinidad menor a 50% y notificarles (${autoNotifyChannel})?`
                              )
                            ) {
                              return;
                            }
                            setIsBulkRejecting(true);
                            try {
                              const res = await applicationsService.bulkRejectBelow50({
                                vacancyId: selectedVacancyForRanking?.id,
                                threshold: 50,
                                channel: autoNotifyChannel,
                                companyLogoUrl: companyLogoLocal || undefined,
                              });
                              showToast(
                                'Descarte masivo completado',
                                `Se descartaron y notificaron ${res.rejectedCount} postulantes por debajo del 50%.`,
                                'success'
                              );
                              await loadData();
                            } catch (err: any) {
                              showToast('Error', err?.message || 'No se pudo completar el descarte masivo.', 'error');
                            } finally {
                              setIsBulkRejecting(false);
                            }
                          }}
                          className="press inline-flex items-center gap-1.5 min-h-[42px] sm:min-h-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 cursor-pointer shadow-2xs"
                          title="Cancela y notifica automáticamente a todos los candidatos con menos de 50% de afinidad ML"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>
                            {isBulkRejecting ? 'Descartando...' : `Descartar < 50% (${below50.length})`}
                          </span>
                        </button>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => setSortByML(!sortByML)}
                      className={`inline-flex items-center gap-1.5 min-h-[42px] sm:min-h-0 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        sortByML
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{sortByML ? 'Orden: Afinidad ML (Desc)' : 'Orden: Fecha Reciente'}</span>
                    </button>
                  </div>
                  </div>
                </div>

                {/* Candidate Ranking List for this Vacancy */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                    <span>
                      Mostrando <strong className="text-slate-800 dark:text-slate-200">{filteredCandidates.length}</strong> postulantes para esta convocatoria
                      {sortByML && ' ordenados por puntaje predictivo de afinidad'}
                    </span>
                    <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400 font-medium">
                      <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Cero sesgo demográfico
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {filteredCandidates.map((app, index) => {
                      const isNotifyOpen = expandedNotifyAppId === app.id;
                      const companyLogoLocal =
                        typeof window !== 'undefined'
                          ? localStorage.getItem(`nexo_company_logo_${user?.empresaId || user?.companyId || user?.empresaNombre || ''}`) ||
                            localStorage.getItem(`nexo_company_logo_${user?.empresaNombre || user?.companyName || ''}`)
                          : null;
                      return (
                      <div
                        key={app.id}
                        onClick={() => setExpandedNotifyAppId(isNotifyOpen ? null : app.id)}
                        className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 shadow-2xs transition-all space-y-4 cursor-pointer ${
                          isNotifyOpen
                            ? 'border-[#0B5D46] dark:border-[#C8FF45]/60 ring-1 ring-[#0B5D46]/20 dark:ring-[#C8FF45]/20'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                        title="Clic en nombre/foto para abrir perfil · Clic en cualquier otro lado para notificación rápida"
                      >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Candidate Info & Position */}
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Rank number badge if sorted by ML */}
                          {sortByML && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                              #{index + 1}
                            </div>
                          )}

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProfileDrawerApp(app);
                                }}
                                className="press text-base font-bold text-slate-900 dark:text-slate-100 hover:text-[#0B5D46] dark:hover:text-[#C8FF45] truncate flex items-center gap-2 cursor-pointer text-left"
                                title="Abrir perfil del candidato desde la izquierda (Solo lectura)"
                              >
                                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {app.candidateName.slice(0, 2).toUpperCase()}
                                </span>
                                <span className="underline decoration-[#C8B193] dark:decoration-[#C8FF45]/40 underline-offset-4">
                                  {app.candidateName}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {app.candidateAge || 26} años
                                </span>
                              </button>
                              <Badge status={app.status} />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProfileDrawerApp(app);
                                }}
                                className="press px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#EFE5D4] hover:bg-[#E5D6BE] dark:bg-white/10 dark:hover:bg-white/15 text-[#3A2818] dark:text-[#C8FF45] border border-[#C8B193] dark:border-white/15 cursor-pointer"
                              >
                                Ver Perfil ➔
                              </button>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              Postulante para: <strong className="text-emerald-700 dark:text-emerald-400">{app.vacancyTitle}</strong> · {app.vacancyDepartment}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-400 pt-1">
                              <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                                Edad: <strong className="text-slate-800 dark:text-slate-100">{app.candidateAge || 26} años</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {app.candidateEmail}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" /> {app.candidatePhone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Postulado:{' '}
                                {app.updatedDate
                                  ? (() => {
                                      try {
                                        const d = new Date(app.updatedDate);
                                        if (!isNaN(d.getTime())) {
                                          return d.toLocaleString('es-DO', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                          });
                                        }
                                      } catch {}
                                      return app.appliedDate;
                                    })()
                                  : app.appliedDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Center: ML Score & Explainability Button */}
                        <div className="flex items-center gap-4 shrink-0 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="text-right">
                            <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-400 block">
                              Afinidad Algorítmica
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 justify-end">
                              <MLScoreBadge
                                score={app.mlScore || 80}
                                size="lg"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setIsExplainOpen(true);
                                }}
                              />
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApp(app);
                              setIsExplainOpen(true);
                            }}
                            className="text-xs bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-emerald-300 dark:border-emerald-500 text-emerald-800 dark:text-white shadow-[0_3px_0_#065f46]"
                          >
                            Ver Factores de IA
                          </Button>
                        </div>

                        {/* Right: Human Decision Action Controls */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleQuickDecision(app, 'Preseleccionado')}
                            disabled={app.status === 'Preseleccionado'}
                            className="text-xs"
                          >
                            Preseleccionar
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickDecision(app, 'Entrevista')}
                            disabled={app.status === 'Entrevista'}
                            className="text-xs"
                          >
                            Entrevista
                          </Button>

                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              setSelectedAppForHire(app);
                              setIsHireModalOpen(true);
                            }}
                            disabled={!canHireApplication(app)}
                            title={
                              app.status === 'Contratado'
                                ? 'El candidato ya fue contratado'
                                : !canHireApplication(app)
                                ? 'Requiere Preselección o Entrevista previa para habilitar Contratar'
                                : 'Formalizar contratación oficial y asignar sueldo'
                            }
                            className="text-xs"
                          >
                            {app.status === 'Contratado' ? 'Contratado ✓' : 'Contratar'}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickDecision(app, 'Descartado')}
                            disabled={app.status === 'Descartado'}
                            className="text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-600 dark:hover:bg-rose-500 text-rose-700 dark:text-white border-rose-300 dark:border-rose-500 shadow-[0_3px_0_#881337]"
                          >
                            Descartar
                          </Button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                              setIsDetailOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all ml-1 cursor-pointer"
                            title="Ver expediente completo e historial"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      {isNotifyOpen && (
                        <QuickNotifyRowBar
                          application={app}
                          defaultChannel={autoNotifyChannel}
                          companyLogoUrl={companyLogoLocal}
                          onSuccess={() => loadData()}
                          onClose={() => setExpandedNotifyAppId(null)}
                        />
                      )}
                      </div>
                      );
                    })}

                    {filteredCandidates.length === 0 && (
                      <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                          {currentVacancyApplications.length === 0
                            ? 'Esta vacante aún no cuenta con postulaciones recibidas'
                            : 'No se encontraron postulantes con los filtros seleccionados'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                          {currentVacancyApplications.length === 0
                            ? 'Tan pronto como los candidatos se postulen a esta convocatoria, el algoritmo de IA evaluará su afinidad ética y los posicionará en este ranking.'
                            : 'Prueba cambiando los filtros de estado o el término de búsqueda.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          )}

          {/* PANEL 2: PLANTILLA DE EMPLEADOS CONTRATADOS */}
          {activeTab === 'employees' && (
            <div className="animate-page-enter-left max-w-[1680px] mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Header Metrics Banner for Employees */}
            <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-7 text-white space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                    <Building2 className="w-3.5 h-3.5" /> Colaboradores Vinculados a {user?.empresaNombre || 'PlataformaML Corporativo'}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Directorio de Plantilla & Expedientes Laborales
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Consulta a los colaboradores activos, salarios asignados y gestiona formalizaciones de cese
                    laboral con cálculo automático de liquidación de ley y notificación al trabajador.
                  </p>
                </div>

                {/* 4 Metric counters + Compact Transparent Timeline Lines (Controlled in read-only mode by the timeline scrubber below) */}
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div
                      className={`bg-slate-800/80 border p-3 rounded-xl text-center transition-all duration-300 ${
                        employeeTimelineData.isLive
                          ? 'border-slate-700/80'
                          : 'border-amber-500/45 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase text-slate-400 block">Total</span>
                      <span className="text-xl font-black text-white tabular-nums transition-all duration-200">
                        {employeeTimelineData.total}
                      </span>
                    </div>
                    <div
                      className={`bg-slate-800/80 border p-3 rounded-xl text-center transition-all duration-300 ${
                        employeeTimelineData.isLive
                          ? 'border-slate-700/80'
                          : 'border-amber-500/45 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase text-emerald-400 block">Activos</span>
                      <span className="text-xl font-black text-emerald-400 tabular-nums transition-all duration-200">
                        {employeeTimelineData.active}
                      </span>
                    </div>
                    <div
                      className={`bg-slate-800/80 border p-3 rounded-xl text-center transition-all duration-300 ${
                        employeeTimelineData.isLive
                          ? 'border-slate-700/80'
                          : 'border-amber-500/45 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase text-rose-400 block">Bajas</span>
                      <span className="text-xl font-black text-rose-400 tabular-nums transition-all duration-200">
                        {employeeTimelineData.dismissed}
                      </span>
                    </div>
                    <div
                      className={`bg-slate-800/80 border p-3 rounded-xl text-center transition-all duration-300 ${
                        employeeTimelineData.isLive
                          ? 'border-slate-700/80'
                          : 'border-amber-500/45 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase text-amber-400 block">Nómina Mes</span>
                      <span className="text-xs font-mono font-black text-amber-300 block mt-1 tabular-nums transition-all duration-200">
                        RD$ {(employeeTimelineData.payroll / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>

                  {/* Compact Backgroundless Timeline Node Lines (Directly Below the 4 Metric Cards) */}
                  {(() => {
                    const nodes = employeeTimelineData.chartNodes;
                    const yBase = 48;
                    const ySpan = 36;
                    const xLeft = 8;
                    const xSpan = 344;

                    const mappedPoints = nodes.map((pt) => {
                      const x = xLeft + pt.xNorm * xSpan;
                      return {
                        ...pt,
                        x,
                        yTotal: yBase - (pt.total / employeeTimelineData.maxHeadcount) * ySpan,
                        yActive: yBase - (pt.active / employeeTimelineData.maxHeadcount) * ySpan,
                        yDismissed: yBase - (pt.dismissed / employeeTimelineData.maxHeadcount) * ySpan,
                        yPayroll: yBase - (pt.payroll / employeeTimelineData.maxPayroll) * ySpan,
                      };
                    });

                    const buildPointsStr = (selector: (p: (typeof mappedPoints)[number]) => number) =>
                      mappedPoints.map((p) => `${p.x.toFixed(1)},${selector(p).toFixed(1)}`).join(' ');

                    const seriesConfigs = [
                      {
                        key: 'payroll',
                        stroke: '#fbbf24',
                        glow: 'rgba(251, 191, 36, 0.55)',
                        yKey: 'yPayroll' as const,
                        peakKey: 'peakPayroll' as const,
                      },
                      {
                        key: 'dismissed',
                        stroke: '#fb7185',
                        glow: 'rgba(251, 113, 133, 0.55)',
                        yKey: 'yDismissed' as const,
                        peakKey: 'peakDismissed' as const,
                      },
                      {
                        key: 'active',
                        stroke: '#34d399',
                        glow: 'rgba(52, 211, 153, 0.55)',
                        yKey: 'yActive' as const,
                        peakKey: 'peakActive' as const,
                      },
                      {
                        key: 'total',
                        stroke: '#f8fafc',
                        glow: 'rgba(248, 250, 252, 0.45)',
                        yKey: 'yTotal' as const,
                        peakKey: 'peakTotal' as const,
                      },
                    ];

                    const hoveredNode =
                      hoveredTimelineNodeIdx !== null && mappedPoints[hoveredTimelineNodeIdx]
                        ? mappedPoints[hoveredTimelineNodeIdx]
                        : null;

                    return (
                      <div
                        className="relative w-full pt-0.5"
                        onMouseLeave={() => setHoveredTimelineNodeIdx(null)}
                      >
                        {hoveredNode && (
                          <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 z-30 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 px-2.5 py-1.5 text-xs shadow-xl space-y-1 min-w-[160px]">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-0.5">
                              <span className="font-mono font-bold text-amber-300">{hoveredNode.fullDate}</span>
                              {(hoveredNode.peakTotal ||
                                hoveredNode.peakActive ||
                                hoveredNode.peakDismissed ||
                                hoveredNode.peakPayroll) && (
                                <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[8px] font-black uppercase">
                                  Pico
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 font-mono">
                              <span className="text-slate-200">Total: <strong>{hoveredNode.total}</strong></span>
                              <span className="text-emerald-400">Act: <strong>{hoveredNode.active}</strong></span>
                              <span className="text-rose-400">Bajas: <strong>{hoveredNode.dismissed}</strong></span>
                              <span className="text-amber-300">RD$ <strong>{(hoveredNode.payroll / 1000).toFixed(0)}k</strong></span>
                            </div>
                          </div>
                        )}

                        <svg
                          viewBox="0 0 360 56"
                          className="w-full h-14 overflow-visible select-none"
                          role="img"
                          aria-label="Líneas temporales de estadísticas con nodos"
                        >
                          {mappedPoints.length > 1 &&
                            seriesConfigs.map((cfg) => {
                              const ptsStr = buildPointsStr((p) => p[cfg.yKey]);
                              return (
                                <g key={cfg.key}>
                                  <polyline
                                    points={ptsStr}
                                    fill="none"
                                    stroke={cfg.stroke}
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-150"
                                    style={{ filter: `drop-shadow(0 0 4px ${cfg.glow})` }}
                                  />
                                  <polyline
                                    points={ptsStr}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeOpacity="0.32"
                                    strokeWidth="1.1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="animate-chart-line-flow"
                                  />
                                </g>
                              );
                            })}

                          {mappedPoints.map((pt, idx) => (
                            <g key={`${pt.percent.toFixed(1)}-${idx}`} className="transition-all duration-150">
                              {seriesConfigs.map((cfg) => {
                                const cy = pt[cfg.yKey];
                                const isPeak = pt[cfg.peakKey];
                                const isHovered = hoveredTimelineNodeIdx === idx;

                                return (
                                  <g key={`${cfg.key}-${idx}`}>
                                    {isPeak && (
                                      <circle
                                        cx={pt.x}
                                        cy={cy}
                                        r={5.5}
                                        fill="none"
                                        stroke={cfg.stroke}
                                        strokeWidth="1.15"
                                        strokeOpacity="0.55"
                                        className="animate-pulse"
                                      />
                                    )}
                                    <circle
                                      cx={pt.x}
                                      cy={cy}
                                      r={isHovered ? 4 : isPeak ? 3.2 : pt.isCursorAnchor ? 3 : 2.1}
                                      fill={cfg.stroke}
                                      stroke="#090A0C"
                                      strokeWidth="1.2"
                                      className="transition-all duration-150"
                                      style={isPeak ? { filter: `drop-shadow(0 0 5px ${cfg.glow})` } : undefined}
                                    />
                                  </g>
                                );
                              })}

                              <rect
                                x={pt.x - 11}
                                y={4}
                                width={22}
                                height={48}
                                fill="transparent"
                                className="cursor-crosshair"
                                onMouseEnter={() => setHoveredTimelineNodeIdx(idx)}
                              />
                            </g>
                          ))}
                        </svg>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Interactive Historical Stats Timeline Bar (Left = Más Pasado / Right = Tiempo Actual) */}
              <div className="pt-5 border-t border-slate-800/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                        isScrubbingTimeline
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.75)] scale-110'
                          : 'bg-slate-800 text-amber-400 border-amber-500/35 shadow-[0_2px_0_#020617]'
                      }`}
                      title="Arenilla del tiempo · Arrastra el nodo hacia la izquierda para viajar al pasado"
                    >
                      <Hourglass
                        className="w-4 h-4 transition-transform duration-150 ease-out"
                        style={{ transform: `rotate(${(100 - timelineStep) * 7.2}deg)` }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">Línea Temporal de Estadísticas</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            employeeTimelineData.isLive
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/45'
                          }`}
                        >
                          {employeeTimelineData.isLive
                            ? 'Tiempo Real'
                            : `Histórico · Hace ${employeeTimelineData.daysAgo} ${employeeTimelineData.daysAgo === 1 ? 'día' : 'días'}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Solo lectura estadística: arrastra el nodo hacia la izquierda para inspeccionar fechas pasadas sin alterar los registros.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-amber-300">
                      {employeeTimelineData.selectedLabel}
                    </span>

                    {!employeeTimelineData.isLive && (
                      <button
                        type="button"
                        onClick={() => setTimelineStep(0)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#C8FF45] hover:bg-[#D5FF6E] text-[#090A0C] border border-[#84cc16] shadow-[0_3px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Volver a Hoy</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Animated Track & Draggable Node (Left 0% = Más Pasado -> Right 100% = Hoy) */}
                <div className="relative pt-3 pb-1 select-none">
                  <div className="relative h-3.5 rounded-full bg-slate-800/95 border border-slate-700/90 overflow-hidden shadow-inner">
                    {/* Continuous animated base shimmer across the entire bar */}
                    <div
                      className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-timeline-sweep pointer-events-none"
                    />

                    {/* Active animated gradient fill from Left (Más Pasado = 0%) to Node Position (100 - timelineStep)% */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-500 animate-timeline-flow transition-[width] duration-75"
                      style={{ width: `calc(${100 - timelineStep}% * 0.96 + 2%)` }}
                    />

                    {/* Historical Hire / Dismissal milestone markers along the bar */}
                    {employeeTimelineData.eventMarks.map((mark, idx) => (
                      <span
                        key={`${mark.type}-${idx}`}
                        title={mark.label}
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-slate-950 pointer-events-none ${
                          mark.type === 'hire' ? 'bg-emerald-300' : 'bg-rose-400'
                        }`}
                        style={{ left: `calc(${100 - mark.percent}% * 0.96 + 2%)` }}
                      />
                    ))}
                  </div>

                  {/* Visual Draggable 2D-3D Node with Rotating Hourglass */}
                  <div
                    className={`pointer-events-none absolute top-[19px] -translate-y-1/2 -translate-x-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-transform duration-100 ${
                      isScrubbingTimeline
                        ? 'bg-amber-400 border-white scale-115 shadow-[0_3px_0_#92400e,0_0_20px_rgba(251,191,36,0.85)]'
                        : 'bg-amber-500 border-amber-100 shadow-[0_3px_0_#92400e,0_0_12px_rgba(245,158,11,0.45)]'
                    }`}
                    style={{ left: `calc(${100 - timelineStep}% * 0.96 + 2%)` }}
                  >
                    <Hourglass
                      className="w-3.5 h-3.5 text-slate-950 transition-transform duration-100 ease-linear"
                      style={{ transform: `rotate(${(100 - timelineStep) * 7.2}deg)` }}
                    />
                  </div>

                  {/* Interactive accessible range input covering the whole track */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={100 - timelineStep}
                    onChange={(e) => setTimelineStep(100 - Number(e.target.value))}
                    onPointerDown={() => setIsScrubbingTimeline(true)}
                    onPointerUp={() => setIsScrubbingTimeline(false)}
                    onPointerCancel={() => setIsScrubbingTimeline(false)}
                    onMouseUp={() => setIsScrubbingTimeline(false)}
                    onTouchEnd={() => setIsScrubbingTimeline(false)}
                    aria-label="Línea temporal de estadísticas de plantilla y nómina (izquierda pasado, derecha actual)"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-20"
                  />
                </div>

                {/* Midpoint Reference Label */}
                <div className="flex items-center justify-center text-xs font-mono font-bold text-slate-500">
                  <span className="hidden sm:inline">{employeeTimelineData.midLabel}</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar for Employees */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch sm:items-center">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador por nombre, cargo o correo..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full min-h-[42px] pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsHrEmployeeFiltersOpen((prev) => !prev)}
                  className="sm:hidden inline-flex items-center justify-between gap-2 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  aria-expanded={isHrEmployeeFiltersOpen}
                >
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Filtros de Plantilla</span>
                  </span>
                  {isHrEmployeeFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              <div className={`${isHrEmployeeFiltersOpen ? 'flex' : 'hidden sm:flex'} flex-wrap items-center justify-between gap-2 w-full`}>
                <select
                  value={employeeDepartmentFilter}
                  onChange={(e) => setEmployeeDepartmentFilter(e.target.value)}
                  className="w-full sm:w-auto min-h-[42px] text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">Todos los Departamentos</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Datos y Analítica">Datos y Analítica</option>
                  <option value="Infraestructura">Infraestructura</option>
                  <option value="Producto Digital">Producto Digital</option>
                  <option value="Finanzas & Riesgo">Finanzas & Riesgo</option>
                </select>

                <div className="flex gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEmployeeStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      employeeStatusFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617]'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shadow-[0_2px_0_#cbd5e1] dark:shadow-[0_2px_0_#0f172a]'
                    } hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeStatusFilter('Activo')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      employeeStatusFilter === 'Activo'
                        ? 'bg-emerald-600 text-white border border-emerald-700 shadow-[0_3px_0_#065f46]'
                        : 'text-slate-500 hover:text-emerald-600 shadow-[0_2px_0_#cbd5e1] dark:shadow-[0_2px_0_#0f172a]'
                    } hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none`}
                  >
                    Activos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeStatusFilter('Despedido')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      employeeStatusFilter === 'Despedido'
                        ? 'bg-rose-600 text-white border border-rose-700 shadow-[0_3px_0_#9f1239]'
                        : 'text-slate-500 hover:text-rose-600 shadow-[0_2px_0_#cbd5e1] dark:shadow-[0_2px_0_#0f172a]'
                    } hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none`}
                  >
                    Despedidos
                  </button>
                </div>
              </div>
            </div>

            {/* Modular Employee Grid (Exact pattern from the user reference photo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
              {employees
                .filter((emp) => {
                  if (employeeStatusFilter !== 'all' && emp.status !== employeeStatusFilter) return false;
                  if (employeeDepartmentFilter !== 'all' && emp.department !== employeeDepartmentFilter) return false;
                  if (employeeSearch) {
                    const q = employeeSearch.toLowerCase();
                    return (
                      emp.name.toLowerCase().includes(q) ||
                      emp.role.toLowerCase().includes(q) ||
                      emp.department.toLowerCase().includes(q) ||
                      emp.email.toLowerCase().includes(q)
                    );
                  }
                  return true;
                })
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between items-center text-center transition-all group shadow-sm min-h-[225px]"
                  >
                    {/* Top right: 3-dots button and context menu */}
                    <div className="absolute top-2.5 right-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuEmployeeId(openMenuEmployeeId === emp.id ? null : emp.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Opciones de expediente laboral"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu (solid opaque surface anchored above trigger so it never covers the avatar) */}
                      {openMenuEmployeeId === emp.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-1.5 z-40 w-max min-w-[184px] bg-white dark:bg-[#0D1119] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 text-left animate-in fade-in zoom-in-95"
                        >
                          {emp.status === 'Activo' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDismissModal(emp)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <UserX className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                              <span>Formalizar Despido</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingSettlementEmployee(emp);
                                setIsSettlementModalOpen(true);
                                setOpenMenuEmployeeId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Calculator className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                              <span>Ver Cuadre de Liquidación</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Centered Avatar with status indicator */}
                    <div className="relative mb-3 mt-1">
                      {emp.avatar &&
                      (emp.avatar.startsWith('data:image/') ||
                        emp.avatar.startsWith('http') ||
                        emp.avatar.startsWith('/')) ? (
                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-emerald-500/40 transition-all shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-100 font-black text-lg flex items-center justify-center ring-2 ring-slate-700 group-hover:ring-emerald-500/40 transition-all shadow-md select-none">
                          {emp.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase() || 'CO'}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          emp.status === 'Activo' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500'
                        }`}
                        title={emp.status === 'Activo' ? 'Colaborador Activo' : 'Colaborador Despedido'}
                      />
                    </div>

                    {/* Employee Name & Company Role */}
                    <div className="space-y-1 w-full px-1">
                      <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                        {emp.name} {emp.age ? `· ${emp.age} años` : ''}
                      </h4>
                      <p className="text-xs font-medium text-slate-400 truncate">
                        {emp.role}
                      </p>
                      <span className="inline-block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {emp.department}
                      </span>
                    </div>

                    {/* Footer strip: Status Badge & Monthly Salary */}
                    <div className="w-full pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          emp.status === 'Activo'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                        }`}
                      >
                        {emp.status === 'Activo' ? 'Activo' : 'Despedido'}
                      </span>

                      <span className="font-mono text-slate-300 font-bold">
                        RD$ {(emp.salary || 80000).toLocaleString('es-DO')}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {employees.length === 0 && (
              <div className="bg-slate-900 p-12 text-center rounded-xl border border-slate-800 space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-200">No hay colaboradores registrados</h4>
                <p className="text-xs text-slate-400">
                  Los postulantes que alcancen el estado "Contratado" o sean incorporados por RRHH se mostrarán aquí.
                </p>
              </div>
            )}
            </div>
          )}

          {/* PANEL 3: MENSAJES WEB <-> TELEGRAM */}
          {activeTab === 'messages' && (
            <div className="animate-page-enter-left max-w-[1680px] mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#3a2818] dark:text-[#F1F2EC] tracking-tight">
                  Mensajes con Candidatos
                </h2>
                <p className="text-xs sm:text-sm text-[#70553b] dark:text-slate-400 mt-1">
                  Conversa directamente por postulación. Tus mensajes llevan firma de RRHH y llegan al Telegram del candidato.
                </p>
              </div>
              <ChatPanel />
            </div>
          )}

          {/* PANEL 4: PLANTILLAS DE NOTIFICACIÓN */}
          {activeTab === 'templates' && (
            <div className="animate-page-enter-left max-w-[1680px] mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
              <EmailTemplatesEditor companyName={user?.empresaNombre} />
            </div>
          )}
        </div>
      </AppShell>

      {/* ============================================================
          NEUMORPHIC MANILA DOSSIER MODAL: CREAR NUEVA VACANTE
          Forma de Carpeta Manila con Hoja de Documento Editable
          ============================================================ */}
      {isCreateVacancyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop with smooth blur */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md modal-animate-backdrop"
            onClick={() => setIsCreateVacancyOpen(false)}
          />

          {/* Neumorphic Manila Folder Shell */}
          <div className="relative w-full max-w-4xl my-auto z-10 flex flex-col modal-animate-card">
            {/* Folder Tab at Top Left */}
            <div className="flex items-end justify-between px-3 sm:px-6 -mb-[1px] relative z-20">
              <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-t-2xl neu-manila-surface border-t border-l border-r border-[#c8b193]/70 dark:border-[#4d3c2e]/70">
                <FolderPlus className="w-4 h-4 text-[#7d5634] dark:text-[#dfc3a1]" />
                <span className="text-xs font-black uppercase tracking-widest text-[#422e1c] dark:text-[#f3e7d6]">
                  EXPEDIENTE DE CONVOCATORIA
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#cbb597]/40 dark:bg-[#3d2e21] text-[#553920] dark:text-[#eedec9]">
                  {user?.empresaNombre || 'PLATAFORMAML'} · VAC-NUEVA
                </span>
              </div>

              {/* Neumorphic Close Button */}
              <button
                type="button"
                onClick={() => setIsCreateVacancyOpen(false)}
                className="neu-raised-btn p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-300 bg-[#dfccb0] dark:bg-[#2c221a] cursor-pointer hover:rotate-90 transition-transform duration-200"
                title="Cerrar expediente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Manila Folder Body Sleeve */}
            <div className="neu-manila-surface rounded-3xl rounded-tl-none p-4 sm:p-7 border border-[#c8b193]/60 dark:border-[#4d3c2e]/60 relative shadow-2xl space-y-4">
              {/* Top Crease & Dossier Tag Line */}
              <div className="flex items-center justify-between text-[11px] text-[#6d4f31] dark:text-[#dec9a7] font-semibold px-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>PLANTILLA OFICIAL DE REQUERIMIENTOS PARA APRENDIZAJE AUTOMÁTICO</span>
                </div>
                <span className="font-mono text-xs">ID FORMULARIO: ML-VAC-{Date.now().toString().slice(-4)}</span>
              </div>

              {/* THE NEUMORPHIC DOCUMENT SHEET (Hoja de Papel con campos editables integrados) */}
              <div className="neu-paper-surface rounded-2xl p-5 sm:p-8 space-y-6 relative border border-amber-200/60 dark:border-slate-800 max-h-[75vh] overflow-y-auto">
                {/* Official Document Letterhead */}
                <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0B5D46] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        P
                      </div>
                      <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                        {user?.empresaNombre || 'PlataformaML Corporativo'}
                      </span>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      DIRECCIÓN DE TALENTO HUMANO & RECLUTAMIENTO
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                      FECHA: {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold border border-emerald-500/30">
                      ESTADO: BORRADOR ACTIVO
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCreateVacancy} className="space-y-6">
                  {/* EDITABLE SECTION 1: Titulo del Cargo (Headline del Documento) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Título Oficial del Cargo / Posición *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ej. Científico de Datos Senior / Desarrollador Fullstack"
                        className="neu-inset-field w-full text-base sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 px-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Este título encabeza el expediente y será indexado en la búsqueda semántica.
                    </p>
                  </div>

                  {/* EDITABLE SECTION 2: Metadatos en Grilla Neumórfica (Departamento, Especialidad, Carrera & Ubicación) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Departamento o Área *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingCatalogType(addingCatalogType === 'DEPARTAMENTO' ? null : 'DEPARTAMENTO');
                            setNewCatalogOptionName('');
                          }}
                          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          + Agregar departamento
                        </button>
                      </div>
                      <select
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        className="neu-inset-field w-full text-xs font-semibold text-slate-800 dark:text-slate-200 px-3.5 py-3 rounded-xl outline-none cursor-pointer"
                      >
                        {catalog.departamentos.map((dep) => (
                          <option key={dep} value={dep}>
                            {dep}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Ubicación Geográfica *
                      </label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="Ej. Santo Domingo, RD o Remoto Internacional"
                        className="neu-inset-field w-full text-xs font-semibold text-slate-800 dark:text-slate-200 px-3.5 py-3 rounded-xl outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Especialidad
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingCatalogType(addingCatalogType === 'ESPECIALIDAD' ? null : 'ESPECIALIDAD');
                            setNewCatalogOptionName('');
                          }}
                          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          + Agregar especialidad
                        </button>
                      </div>
                      <select
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        className="neu-inset-field w-full text-xs font-semibold text-slate-800 dark:text-slate-200 px-3.5 py-3 rounded-xl outline-none cursor-pointer"
                      >
                        <option value="">Selecciona una especialidad (opcional)</option>
                        {catalog.especialidades.map((esp) => (
                          <option key={esp} value={esp}>
                            {esp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Carrera / Formación Sugerida
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingCatalogType(addingCatalogType === 'CARRERA' ? null : 'CARRERA');
                            setNewCatalogOptionName('');
                          }}
                          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          + Agregar carrera
                        </button>
                      </div>
                      <select
                        value={newCareer}
                        onChange={(e) => setNewCareer(e.target.value)}
                        className="neu-inset-field w-full text-xs font-semibold text-slate-800 dark:text-slate-200 px-3.5 py-3 rounded-xl outline-none cursor-pointer"
                      >
                        <option value="">Selecciona una carrera (opcional)</option>
                        {catalog.carreras.map((car) => (
                          <option key={car} value={car}>
                            {car}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Inline: Agregar nuevo Departamento / Especialidad / Carrera compartido en BD */}
                  {addingCatalogType && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={newCatalogOptionName}
                        onChange={(e) => setNewCatalogOptionName(e.target.value)}
                        placeholder={
                          addingCatalogType === 'DEPARTAMENTO'
                            ? 'Ej. Robótica y Automatización'
                            : addingCatalogType === 'ESPECIALIDAD'
                            ? 'Ej. Ingeniería de Prompts / LLMs'
                            : 'Ej. Ingeniería en Mecatrónica'
                        }
                        className="flex-1 px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-emerald-500/40 text-slate-900 dark:text-slate-100 outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          isLoading={isSavingCatalogOption}
                          onClick={async () => {
                            const val = newCatalogOptionName.trim();
                            if (val.length < 2) return;
                            setIsSavingCatalogOption(true);
                            try {
                              const saved = await catalogService.addOption(addingCatalogType, val);
                              const fresh = await catalogService.getCatalog();
                              setCatalog(fresh);
                              if (addingCatalogType === 'DEPARTAMENTO') setNewDepartment(saved.nombre);
                              if (addingCatalogType === 'ESPECIALIDAD') setNewSpecialty(saved.nombre);
                              if (addingCatalogType === 'CARRERA') setNewCareer(saved.nombre);
                              showToast(
                                'Opción agregada al catálogo global',
                                `"${saved.nombre}" ya está guardada en la base de datos y disponible para todas las empresas.`,
                                'success'
                              );
                              setAddingCatalogType(null);
                              setNewCatalogOptionName('');
                            } catch (err: any) {
                              showToast('Error', err?.message || 'No se pudo agregar la opción.', 'error');
                            } finally {
                              setIsSavingCatalogOption(false);
                            }
                          }}
                        >
                          Guardar en BD
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddingCatalogType(null);
                            setNewCatalogOptionName('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* EDITABLE SECTION 3: Selectores Neumórficos Interactivos (Modalidad y Tipo) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-2xl bg-[#f5ede2]/60 dark:bg-slate-900/40 border border-amber-200/50 dark:border-slate-800">
                    {/* Modalidad de Trabajo */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                        Modalidad de Trabajo:
                      </label>
                      <div className="flex items-center gap-2">
                        {(['Híbrido', 'Presencial', 'Remoto'] as const).map((mode) => {
                          const isSelected = newWorkMode === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setNewWorkMode(mode)}
                              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'neu-pressed-btn bg-amber-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                                  : 'neu-raised-btn bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              {mode}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tipo de Contrato */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                        Tipo de Jornada / Contrato:
                      </label>
                      <div className="flex items-center gap-2">
                        {(['Tiempo completo', 'Medio tiempo', 'Pasantía'] as const).map((type) => {
                          const isSelected = newType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setNewType(type)}
                              className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
                                isSelected
                                  ? 'neu-pressed-btn bg-amber-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                                  : 'neu-raised-btn bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                              }`}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* EDITABLE SECTION 4: Descripción General del Puesto */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Descripción del Puesto & Responsabilidades Principales *
                    </label>
                    <textarea
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Explica el objetivo de la posición, funciones prioritarias y el valor que aportará al equipo..."
                      className="neu-inset-field w-full text-xs sm:text-sm p-3.5 rounded-xl outline-none resize-none leading-relaxed"
                      required
                    />
                  </div>

                  {/* EDITABLE SECTION 5: Habilidades Técnicas Clave & Chip Tags Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Habilidades Técnicas y Competencias (Separadas por comas)
                      </label>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        Vectorización IA
                      </span>
                    </div>
                    <input
                      type="text"
                      value={newSkills}
                      onChange={(e) => setNewSkills(e.target.value)}
                      placeholder="Python, SQL, Machine Learning, Power BI, Docker, React, FastAPI..."
                      className="neu-inset-field w-full text-xs font-semibold text-slate-800 dark:text-slate-200 px-3.5 py-3 rounded-xl outline-none"
                    />

                    {/* Neumorphic Skill Tags Realtime Preview */}
                    {newSkills.trim() && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {newSkills
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((skill, idx) => (
                            <span
                              key={idx}
                              className="neu-raised-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-[#fcf9f2] dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* EDITABLE SECTION 6: Requisitos y Plazas */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Requisitos Académicos y Experiencia (Uno por línea)
                      </label>
                      <textarea
                        rows={3}
                        value={newRequirements}
                        onChange={(e) => setNewRequirements(e.target.value)}
                        placeholder="• Título universitario en Ingeniería, Informática o afín&#10;• Mínimo 2 años en proyectos comprobables&#10;• Habilidades demostradas en resolución de problemas"
                        className="neu-inset-field w-full text-xs p-3.5 rounded-xl outline-none resize-none font-mono text-[11px]"
                      />
                    </div>

                    <div className="sm:col-span-4 space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          Años Mín. Experiencia:
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={newMinExperienceYears}
                          onChange={(e) => setNewMinExperienceYears(parseInt(e.target.value) || 0)}
                          className="neu-inset-field w-full text-xs font-bold p-2.5 rounded-xl outline-none text-center"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          Vacantes / Plazas:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={newOpenings}
                          onChange={(e) => setNewOpenings(parseInt(e.target.value) || 1)}
                          className="neu-inset-field w-full text-xs font-bold p-2.5 rounded-xl outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Footer: Actions and Signature */}
                  <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>La vacante se publicará de inmediato y estará disponible en el catálogo de candidatos.</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setIsCreateVacancyOpen(false)}
                        className="neu-raised-btn px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-[#fbf9f4] dark:bg-slate-800 cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={isCreatingVacancy}
                        className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#ea9924] hover:bg-[#f0a330] text-[#18130c] border border-amber-700 flex items-center gap-2 cursor-pointer shadow-[0_4px_0_#92400e] hover:shadow-[0_5px_0_#92400e] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isCreatingVacancy ? 'Publicando...' : 'Firmar y Emitir Vacante'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left-Side Read-Only Candidate Profile Drawer */}
      <CandidateProfileDrawer
        isOpen={Boolean(profileDrawerApp)}
        onClose={() => setProfileDrawerApp(null)}
        application={profileDrawerApp}
        onOpenExplainability={(app) => {
          setSelectedApp(app);
          setIsExplainOpen(true);
        }}
        onOpenChat={() => {
          setActiveTab('messages');
        }}
        onOpenFullApplication={(app) => {
          setSelectedApp(app);
          setIsDetailOpen(true);
        }}
      />

      {/* Application Detail & Recruiter Notes Modal */}
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

      {/* Explainable AI Modal (RF07) */}
      <MLExplainabilityModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        candidateName={selectedApp?.candidateName || ''}
        vacancyTitle={selectedApp?.vacancyTitle || ''}
        breakdown={selectedApp?.mlBreakdown}
      />

      {/* Formalize Dismissal & Liquidation Settlement Modal */}
      <Modal
        isOpen={isDismissModalOpen && !!selectedEmployeeForDismiss}
        onClose={() => {
          if (!isProcessingDismiss) {
            setIsDismissModalOpen(false);
            setSelectedEmployeeForDismiss(null);
          }
        }}
        title="Formalización de Despido y Cuadre de Liquidación Laboral"
        subtitle="Cálculo legal de prestaciones laborales, preaviso y cesantía con emisión de comunicación formal"
        maxWidth="2xl"
      >
        {selectedEmployeeForDismiss && (() => {
          const calc = calculateSettlement(selectedEmployeeForDismiss);
          return (
            <form onSubmit={handleConfirmDismissal} className="space-y-5">
              {/* Employee Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {selectedEmployeeForDismiss.avatar &&
                  (selectedEmployeeForDismiss.avatar.startsWith('data:image/') ||
                    selectedEmployeeForDismiss.avatar.startsWith('http') ||
                    selectedEmployeeForDismiss.avatar.startsWith('/')) ? (
                    <img
                      src={selectedEmployeeForDismiss.avatar}
                      alt={selectedEmployeeForDismiss.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-300 dark:ring-slate-600"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-100 font-black text-sm flex items-center justify-center ring-2 ring-slate-300 dark:ring-slate-600 select-none">
                      {selectedEmployeeForDismiss.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase() || 'CO'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {selectedEmployeeForDismiss.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedEmployeeForDismiss.role} · {selectedEmployeeForDismiss.department}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Ingreso: {selectedEmployeeForDismiss.hiredDate}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase text-slate-400 block">
                    Salario Base Mensual
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                    RD$ {(selectedEmployeeForDismiss.salary || 80000).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Form Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Motivo / Causa Legal de Término *
                  </label>
                  <select
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="Desahucio por el empleador (Sin justa causa)">
                      Desahucio por el empleador (Sin justa causa)
                    </option>
                    <option value="Despido con causa justificada (Art. 88 Código de Trabajo)">
                      Despido con causa justificada (Art. 88 Código de Trabajo)
                    </option>
                    <option value="Mutuo consentimiento / Conclusión de contrato">
                      Mutuo consentimiento / Conclusión de contrato
                    </option>
                    <option value="Reestructuración operativa o supresión de puesto">
                      Reestructuración operativa o supresión de puesto
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Fecha Efectiva del Despido
                  </label>
                  <input
                    type="date"
                    value={dismissDate}
                    onChange={(e) => setDismissDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Régimen de Preaviso Legal
                  </label>
                  <select
                    value={dismissNoticeGiven}
                    onChange={(e) => setDismissNoticeGiven(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="pagado">Preaviso Omitido (Se paga en liquidación - 28 días)</option>
                    <option value="trabajado">Preaviso Trabajado (Cumplido previamente - RD$ 0)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Vacaciones Proporcionales (Días pendientes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={dismissVacationDays}
                    onChange={(e) => setDismissVacationDays(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Cuadre de Liquidación Desglosado */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-emerald-400" /> Cuadre de Liquidación Legal (Código de Trabajo)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Salario diario base: RD$ {calc.dailySalary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-xs text-slate-400 block">Preaviso</span>
                    <span className="font-mono font-bold text-slate-200">
                      RD$ {calc.noticeAmount.toLocaleString('es-DO')}
                    </span>
                  </div>

                  <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-xs text-slate-400 block">Cesantía</span>
                    <span className="font-mono font-bold text-slate-200">
                      RD$ {calc.severanceAmount.toLocaleString('es-DO')}
                    </span>
                  </div>

                  <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-xs text-slate-400 block">Vacaciones</span>
                    <span className="font-mono font-bold text-slate-200">
                      RD$ {calc.vacationAmount.toLocaleString('es-DO')}
                    </span>
                  </div>

                  <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-xs text-slate-400 block">Salario Navidad</span>
                    <span className="font-mono font-bold text-slate-200">
                      RD$ {calc.christmasSalaryAmount.toLocaleString('es-DO')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Total Neto a Liquidar
                  </span>
                  <span className="text-lg font-mono font-black text-emerald-400">
                    RD$ {calc.totalSettlement.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Official Announcement / Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nota Oficial de Anuncio y Notificación Formal
                </label>
                <textarea
                  rows={3}
                  value={dismissAnnouncement}
                  onChange={(e) => setDismissAnnouncement(e.target.value)}
                  className="w-full text-xs p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              {/* Checkbox notification */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={dismissSendEmail}
                  onChange={(e) => setDismissSendEmail(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Enviar comunicación formal y volante de liquidación al correo institucional ({selectedEmployeeForDismiss.email})</span>
              </label>

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDismissModalOpen(false);
                    setSelectedEmployeeForDismiss(null);
                  }}
                  disabled={isProcessingDismiss}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="danger"
                  isLoading={isProcessingDismiss}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-[0_4px_0_#9f1239]"
                >
                  Confirmar y Formalizar Despido
                </Button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Historical Settlement View Modal */}
      <Modal
        isOpen={isSettlementModalOpen && !!viewingSettlementEmployee}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setViewingSettlementEmployee(null);
        }}
        title="Expediente de Despido y Cuadre de Liquidación"
        subtitle="Constancia del cese laboral y valores procesados"
        maxWidth="lg"
      >
        {viewingSettlementEmployee && viewingSettlementEmployee.terminationDetails && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {viewingSettlementEmployee.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {viewingSettlementEmployee.role} · {viewingSettlementEmployee.department}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                  Baja Procesada
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Causa:</strong> {viewingSettlementEmployee.terminationDetails.reason}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Fecha de Término:</strong> {viewingSettlementEmployee.terminationDetails.terminationDate}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Procesado por:</strong> {viewingSettlementEmployee.terminationDetails.processedBy}
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-white space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Desglose Liquidado
              </span>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Preaviso legal:</span>
                  <span className="font-mono">RD$ {viewingSettlementEmployee.terminationDetails.noticeAmount.toLocaleString('es-DO')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auxilio de Cesantía:</span>
                  <span className="font-mono">RD$ {viewingSettlementEmployee.terminationDetails.severanceAmount.toLocaleString('es-DO')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vacaciones no disfrutadas:</span>
                  <span className="font-mono">RD$ {viewingSettlementEmployee.terminationDetails.vacationAmount.toLocaleString('es-DO')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Salario de Navidad proporcional:</span>
                  <span className="font-mono">RD$ {viewingSettlementEmployee.terminationDetails.christmasSalaryAmount.toLocaleString('es-DO')}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-amber-400">Total Liquidado:</span>
                <span className="text-base font-mono font-bold text-emerald-400">
                  RD$ {viewingSettlementEmployee.terminationDetails.totalSettlement.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {viewingSettlementEmployee.terminationDetails.announcementNote && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <strong className="block text-slate-700 dark:text-slate-200 mb-1">Comunicación oficial archivada:</strong>
                <p className="leading-relaxed">{viewingSettlementEmployee.terminationDetails.announcementNote}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsSettlementModalOpen(false);
                  setViewingSettlementEmployee(null);
                }}
              >
                Cerrar Expediente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hire Candidate Confirmation & Salary Modal */}
      <HireCandidateModal
        isOpen={isHireModalOpen}
        onClose={() => {
          setIsHireModalOpen(false);
          setSelectedAppForHire(null);
        }}
        application={selectedAppForHire}
        onHired={loadData}
      />
    </div>
  );
};
