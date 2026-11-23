export type UserRole = 'superadmin' | 'admin' | 'rrhh' | 'candidato' | 'administrador';

export interface Empresa {
  id: string;
  nombre: string;
  dominio?: string;
  rif?: string;
  activa: boolean;
  estado?: string;
  adminsCount?: number;
  rrhhCount?: number;
  logo?: string;
  descripcion?: string;
  telefono?: string;
  direccion?: string;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  age?: number;
  empresaId?: string;
  empresaNombre?: string;
  companyId?: string | null;
  companyName?: string | null;
  avatar?: string;
  photoUrl?: string;
  phone?: string;
  pendiente?: boolean;
  createdAt: string;
}

export type ApplicationStatus =
  | 'Recibida'
  | 'En revisión'
  | 'Preseleccionado'
  | 'Entrevista'
  | 'Descartado'
  | 'Contratado';

export interface MLFactorBreakdown {
  affinityScore: number;       // 0-100%
  experienceMatch: number;     // 0-100%
  educationMatch: number;      // 0-100%
  skillsMatch: number;         // 0-100%
  matchingSkills: string[];
  missingSkills: string[];
  keyFactors: string[];
  explanation: string;
  fairnessChecked: boolean;    // RNF03: verifies no sensitive demographic data used
}

export interface ApplicationTimelineEvent {
  id: string;
  stage: ApplicationStatus | 'Registro';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  channel?: 'WhatsApp' | 'Email' | 'Sistema';
}

export interface Application {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  vacancyDepartment: string;
  empresaId?: string;
  empresaNombre?: string;
  candidateId: string;
  candidateName: string;
  candidateAge?: number;
  candidateEmail: string;
  candidatePhone: string;
  idCardFileName?: string;
  cvFileName?: string;
  cvFileUrl?: string;
  status: ApplicationStatus;
  appliedDate: string;
  updatedDate: string;
  mlScore?: number;
  mlBreakdown?: MLFactorBreakdown;
  recruiterNotes?: string[];
  timeline: ApplicationTimelineEvent[];
}

export interface Vacancy {
  id: string;
  empresaId?: string;
  empresaNombre?: string;
  companyId?: string;
  companyName?: string;
  title: string;
  department: string;
  location: string;
  workMode: 'Híbrido' | 'Presencial' | 'Remoto';
  type: 'Tiempo completo' | 'Medio tiempo' | 'Pasantía';
  status: 'Abierta' | 'Pausada' | 'Cerrada';
  description: string;
  requirements: string[];
  requiredSkills: string[];
  minExperienceYears: number;
  openings: number;
  appliedCount: number;
  createdAt: string;
}

export interface CandidateVisibilitySettings {
  profileVisible: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showExperience: boolean;
  showEducation: boolean;
  showSkills: boolean;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  age?: number;
  email: string;
  phone: string;
  telegramUsername?: string;
  title: string;
  bio: string;
  location: string;
  visibility?: CandidateVisibilitySettings;
  education: {
    institution: string;
    degree: string;
    graduationYear: string;
  }[];
  experience: {
    company: string;
    role: string;
    period: string;
    description: string;
  }[];
  skills: string[];
  cvFileName?: string;
  idCardFileName?: string;
}

export interface NotificationItem {
  id: string;
  recipient: string;
  channel: 'Telegram' | 'WhatsApp' | 'Email';
  title: string;
  message: string;
  timestamp: string;
  status: 'Enviado' | 'Entregado' | 'Leído';
  relatedApplicationId?: string;
}

export interface MLModelMetrics {
  name: string;
  version: string;
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc?: number;
  datasetSize: number;
  totalPredictions?: number;
  totalDatasets?: number;
  mlServiceOnline?: boolean;
  isRealModel?: boolean;
  lastTrainedAt: string | null;
  isFairnessCompliant: boolean;
  rawMetrics?: Record<string, any> | null;
  trainingHistory: {
    epoch: number;
    accuracy: number;
    loss: number;
  }[];
}

export interface ComparisonMetrics {
  manualFilterTimeDays: number;
  platformFilterTimeMinutes: number;
  manualScreeningAccuracy: number;
  platformScreeningAccuracy: number;
  totalApplicationsProcessed: number;
  averageSatisfactionScore: number;
  timeReductionPercentage: number;
}

export interface TerminationDetails {
  terminationDate: string;
  reason: string;
  noticePeriodDays: number;
  noticeAmount: number;         // Preaviso
  severanceAmount: number;      // Auxilio de cesantía
  vacationAmount: number;       // Vacaciones proporcionales
  christmasSalaryAmount: number;// Salario de Navidad / Regalía pascual
  totalSettlement: number;      // Monto total del cuadre de liquidación
  processedBy: string;          // Nombre del encargado de RRHH
  notifiedViaEmail: boolean;
  announcementNote?: string;    // Nota y comunicación formal
}

export interface Employee {
  id: string;
  candidateId?: string;
  empresaId: string;
  empresaNombre: string;
  name: string;
  age?: number;
  email: string;
  phone: string;
  avatar?: string;
  role: string;                 // Cargo o puesto en la empresa
  department: string;
  hiredDate: string;
  salary: number;               // Sueldo mensual base en DOP / USD
  status: 'Activo' | 'Despedido';
  terminationDetails?: TerminationDetails;
}
