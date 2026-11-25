import {
  BarChart3,
  Bell,
  Brain,
  Briefcase,
  Building2,
  ExternalLink,
  LifeBuoy,
  Mail,
  MessageSquare,
  Search,
  User as UserIcon,
  UserCheck,
  Users,
} from 'lucide-react';
import type { SidebarSection } from '@/components/layout/Sidebar';
import type { User } from '@/types';

export type RoleDashboardView =
  | 'candidate-dashboard'
  | 'hr-dashboard'
  | 'company-admin-dashboard'
  | 'global-admin-dashboard';

export interface RoleNavigationCounts {
  vacanciesCount?: number;
  applicationsCount?: number;
  notificationsCount?: number;
  teamCount?: number;
  employeesCount?: number;
  companiesCount?: number;
  usersCount?: number;
  openTicketsCount?: number;
}

export interface RoleNavigationConfig {
  dashboardView: RoleDashboardView;
  sections: SidebarSection[];
  brandSubtitle: string;
  crumbRoot: string;
  roleLabel: string;
  contextLabel?: string;
  backButtonLabel: string;
  defaultTab: string;
}

export function getDashboardViewForRole(role?: User['role']): RoleDashboardView {
  if (role === 'candidato') return 'candidate-dashboard';
  if (role === 'rrhh') return 'hr-dashboard';
  if (role === 'admin' || role === 'administrador') return 'company-admin-dashboard';
  return 'global-admin-dashboard';
}

/**
 * Construye la configuración unificada de Sidebar y cabecera de AppShell para cualquier rol,
 * reutilizada tanto en los paneles internos como al explorar el Catálogo Público.
 */
export function getRoleSidebarConfig(
  user: User | null,
  counts: RoleNavigationCounts = {}
): RoleNavigationConfig {
  const role = user?.role;

  if (role === 'candidato') {
    return {
      dashboardView: 'candidate-dashboard',
      defaultTab: 'applications',
      brandSubtitle: 'EXPEDIENTE DE CANDIDATO',
      crumbRoot: 'Portal del candidato',
      roleLabel: 'Candidato',
      backButtonLabel: 'Volver a mi Panel',
      sections: [
        {
          title: 'MI EXPEDIENTE',
          items: [
            { id: 'applications', label: 'Mis Postulaciones', icon: Briefcase, badge: counts.applicationsCount },
            { id: 'messages', label: 'Mensajes y Telegram', icon: MessageSquare },
            { id: 'profile', label: 'Mi perfil curricular', icon: UserIcon },
            { id: 'notifications', label: 'Notificaciones', icon: Bell, badge: counts.notificationsCount || undefined },
          ],
        },
        {
          title: 'CONVOCATORIAS',
          items: [
            { id: 'vacancies', label: 'Explorar vacantes', icon: Search },
            { id: 'external-vacancies', label: 'Catálogo público', icon: ExternalLink, external: true },
          ],
        },
      ],
    };
  }

  if (role === 'rrhh') {
    const companyName = user?.empresaNombre || user?.companyName || 'Empresa';
    return {
      dashboardView: 'hr-dashboard',
      defaultTab: 'candidates',
      brandSubtitle: 'MESA DE EVALUACIÓN',
      crumbRoot: companyName,
      roleLabel: 'Evaluador RRHH',
      contextLabel: companyName,
      backButtonLabel: 'Volver a Mesa RRHH',
      sections: [
        {
          title: 'TALENTO HUMANO',
          items: [
            { id: 'candidates', label: 'Convocatorias & Ranking IA', icon: Briefcase, badge: counts.vacanciesCount },
            { id: 'employees', label: 'Plantilla & Nómina', icon: Users, badge: counts.employeesCount },
            { id: 'messages', label: 'Mensajes y Telegram', icon: MessageSquare },
            { id: 'templates', label: 'Plantillas de Avisos', icon: Mail },
          ],
        },
        {
          title: 'PORTAL',
          items: [
            { id: 'external-vacancies', label: 'Catálogo público', icon: ExternalLink, external: true },
          ],
        },
      ],
    };
  }

  if (role === 'admin' || role === 'administrador') {
    const companyName = user?.empresaNombre || user?.companyName || 'Empresa';
    return {
      dashboardView: 'company-admin-dashboard',
      defaultTab: 'metrics',
      brandSubtitle: 'ADMIN CORPORATIVO',
      crumbRoot: companyName,
      roleLabel: 'Admin Local',
      contextLabel: companyName,
      backButtonLabel: 'Volver al Panel Empresa',
      sections: [
        {
          title: 'GESTIÓN DE EMPRESA',
          items: [
            { id: 'metrics', label: 'Métricas Locales', icon: BarChart3 },
            { id: 'team', label: 'Equipo de Trabajo', icon: Users, badge: counts.teamCount },
            { id: 'candidates', label: 'Candidatos', icon: UserCheck, badge: counts.applicationsCount },
            { id: 'messages', label: 'Mensajes y Telegram', icon: MessageSquare },
          ],
        },
        {
          title: 'CONFIGURACIÓN',
          items: [
            { id: 'templates', label: 'Plantillas de Avisos', icon: Mail },
            { id: 'profile', label: 'Empresa y Telegram', icon: Building2 },
          ],
        },
        {
          title: 'PORTAL',
          items: [
            { id: 'external-vacancies', label: 'Catálogo de Vacantes', icon: ExternalLink, external: true },
          ],
        },
      ],
    };
  }

  return {
    dashboardView: 'global-admin-dashboard',
    defaultTab: 'mlops',
    brandSubtitle: 'SUPERADMIN GLOBAL',
    crumbRoot: 'Administrador Global',
    roleLabel: 'Superadmin',
    contextLabel: 'Gobernanza Multi-Tenant',
    backButtonLabel: 'Volver a Admin Global',
    sections: [
      {
        title: 'GOBERNANZA GLOBAL',
        items: [
          { id: 'mlops', label: 'MLOps & Motor IA', icon: Brain },
          { id: 'companies', label: 'Empresas afiliadas', icon: Building2, badge: counts.companiesCount },
          { id: 'directory', label: 'Usuarios registrados', icon: Users, badge: counts.usersCount },
          { id: 'tickets', label: 'Tickets de Soporte', icon: LifeBuoy, badge: counts.openTicketsCount || undefined },
        ],
      },
      {
        title: 'PORTAL',
        items: [
          { id: 'external-vacancies', label: 'Portal público', icon: ExternalLink, external: true },
        ],
      },
    ],
  };
}
