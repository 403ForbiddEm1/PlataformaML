export type UserRole = 'candidato' | 'rrhh' | 'administrador';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
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
  candidateId: string;
  candidateName: string;
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

export interface CandidateProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  bio: string;
  location: string;
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
  channel: 'WhatsApp' | 'Email';
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
  datasetSize: number;
  lastTrainedAt: string;
  isFairnessCompliant: boolean;
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
