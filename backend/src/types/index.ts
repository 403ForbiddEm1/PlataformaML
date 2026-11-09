// src/types/index.ts
import {
  Rol,
  EstadoEmpresa,
  NivelEducativo,
  EstadoVacante,
  ModalidadTrabajo,
  TipoContrato,
  EstadoPostulacion,
  TipoDocumento,
  CanalNotificacion,
  EstadoNotificacion,
} from '@prisma/client';

export type UserRole = 'candidato' | 'rrhh' | 'administrador' | 'superadmin';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  companyId?: string | null;
  companyName?: string | null;
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
  affinityScore: number; // 0-100%
  experienceMatch: number; // 0-100%
  educationMatch: number; // 0-100%
  skillsMatch: number; // 0-100%
  matchingSkills: string[];
  missingSkills: string[];
  keyFactors: string[];
  explanation: string;
  fairnessChecked: boolean;
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

export interface ApplicationResponse {
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

export interface VacancyResponse {
  id: string;
  title: string;
  department: string;
  location: string;
  workMode: 'Híbrido' | 'Presencial' | 'Remoto';
  type: 'Tiempo completo' | 'Medio tiempo' | 'Pasantía';
  status: 'Abierta' | 'Pausada' | 'Cerrada' | 'Borrador';
  description: string;
  requirements: string[];
  requiredSkills: string[];
  minExperienceYears: number;
  openings: number;
  appliedCount: number;
  createdAt: string;
  companyId?: string;
  companyName?: string;
}

export interface CandidateProfileResponse {
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

export interface NotificationItemResponse {
  id: string;
  recipient: string;
  channel: 'WhatsApp' | 'Email';
  title: string;
  message: string;
  timestamp: string;
  status: 'Enviado' | 'Entregado' | 'Leído' | 'Pendiente' | 'Fallido';
  relatedApplicationId?: string;
}

export interface MLModelMetricsResponse {
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

export interface ComparisonMetricsResponse {
  manualFilterTimeDays: number;
  platformFilterTimeMinutes: number;
  manualScreeningAccuracy: number;
  platformScreeningAccuracy: number;
  totalApplicationsProcessed: number;
  averageSatisfactionScore: number;
  timeReductionPercentage: number;
}

// Helpers de conversión de estados
export function rolToFrontend(rol: Rol): UserRole {
  switch (rol) {
    case Rol.SUPER_ADMIN:
      return 'superadmin';
    case Rol.ADMIN:
      return 'administrador';
    case Rol.RRHH:
      return 'rrhh';
    case Rol.CANDIDATO:
    default:
      return 'candidato';
  }
}

export function rolFromFrontend(role?: string): Rol {
  switch (role?.toLowerCase()) {
    case 'superadmin':
    case 'super_admin':
      return Rol.SUPER_ADMIN;
    case 'administrador':
    case 'admin':
      return Rol.ADMIN;
    case 'rrhh':
    case 'recruiter':
      return Rol.RRHH;
    case 'candidato':
    case 'candidate':
    default:
      return Rol.CANDIDATO;
  }
}

export function estadoPostulacionToFrontend(estado: EstadoPostulacion): ApplicationStatus {
  switch (estado) {
    case EstadoPostulacion.RECIBIDA:
      return 'Recibida';
    case EstadoPostulacion.EN_REVISION:
      return 'En revisión';
    case EstadoPostulacion.PRESELECCIONADA:
      return 'Preseleccionado';
    case EstadoPostulacion.ENTREVISTA:
      return 'Entrevista';
    case EstadoPostulacion.RECHAZADA:
      return 'Descartado';
    case EstadoPostulacion.CONTRATADA:
      return 'Contratado';
  }
}

export function estadoPostulacionFromFrontend(status: string): EstadoPostulacion {
  switch (status.trim().toLowerCase()) {
    case 'recibida':
      return EstadoPostulacion.RECIBIDA;
    case 'en revisión':
    case 'en revision':
      return EstadoPostulacion.EN_REVISION;
    case 'preseleccionado':
    case 'preseleccionada':
      return EstadoPostulacion.PRESELECCIONADA;
    case 'entrevista':
      return EstadoPostulacion.ENTREVISTA;
    case 'descartado':
    case 'descartada':
    case 'rechazada':
    case 'rechazado':
      return EstadoPostulacion.RECHAZADA;
    case 'contratado':
    case 'contratada':
      return EstadoPostulacion.CONTRATADA;
    default:
      return EstadoPostulacion.RECIBIDA;
  }
}

export function modalidadToFrontend(modalidad: ModalidadTrabajo): 'Híbrido' | 'Presencial' | 'Remoto' {
  switch (modalidad) {
    case ModalidadTrabajo.HIBRIDO:
      return 'Híbrido';
    case ModalidadTrabajo.PRESENCIAL:
      return 'Presencial';
    case ModalidadTrabajo.REMOTO:
      return 'Remoto';
  }
}

export function modalidadFromFrontend(modalidad?: string): ModalidadTrabajo {
  switch (modalidad?.toLowerCase()) {
    case 'presencial':
      return ModalidadTrabajo.PRESENCIAL;
    case 'remoto':
      return ModalidadTrabajo.REMOTO;
    case 'híbrido':
    case 'hibrido':
    default:
      return ModalidadTrabajo.HIBRIDO;
  }
}

export function tipoContratoToFrontend(tipo: TipoContrato): 'Tiempo completo' | 'Medio tiempo' | 'Pasantía' {
  switch (tipo) {
    case TipoContrato.TIEMPO_COMPLETO:
      return 'Tiempo completo';
    case TipoContrato.MEDIO_TIEMPO:
      return 'Medio tiempo';
    case TipoContrato.PASANTIA:
      return 'Pasantía';
  }
}

export function tipoContratoFromFrontend(tipo?: string): TipoContrato {
  switch (tipo?.toLowerCase()) {
    case 'medio tiempo':
      return TipoContrato.MEDIO_TIEMPO;
    case 'pasantía':
    case 'pasantia':
      return TipoContrato.PASANTIA;
    case 'tiempo completo':
    default:
      return TipoContrato.TIEMPO_COMPLETO;
  }
}

export function estadoVacanteToFrontend(estado: EstadoVacante): 'Abierta' | 'Pausada' | 'Cerrada' | 'Borrador' {
  switch (estado) {
    case EstadoVacante.ABIERTA:
      return 'Abierta';
    case EstadoVacante.PAUSADA:
      return 'Pausada';
    case EstadoVacante.CERRADA:
      return 'Cerrada';
    case EstadoVacante.BORRADOR:
    default:
      return 'Borrador';
  }
}

export function estadoVacanteFromFrontend(estado?: string): EstadoVacante {
  switch (estado?.toLowerCase()) {
    case 'abierta':
      return EstadoVacante.ABIERTA;
    case 'pausada':
      return EstadoVacante.PAUSADA;
    case 'cerrada':
      return EstadoVacante.CERRADA;
    case 'borrador':
    default:
      return EstadoVacante.BORRADOR;
  }
}
