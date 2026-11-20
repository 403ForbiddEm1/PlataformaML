import {
  Application,
  CandidateProfile,
  ComparisonMetrics,
  Employee,
  Empresa,
  MLModelMetrics,
  NotificationItem,
  User,
  Vacancy,
} from '@/types';

export const INITIAL_COMPANIES: Empresa[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-super-01',
    email: 'superadmin@plataformaml.com',
    name: 'Super Admin',
    role: 'superadmin',
    phone: '+1 (809) 555-0999',
    avatar: 'SA',
    createdAt: '2026-07-01T08:00:00Z',
  },
];

export const INITIAL_VACANCIES: Vacancy[] = [];

export const INITIAL_APPLICATIONS: Application[] = [];

export const INITIAL_CANDIDATE_PROFILE: CandidateProfile = {
  id: 'cand-01',
  userId: 'usr-cand-01',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  bio: '',
  location: '',
  education: [],
  experience: [],
  skills: [],
  cvFileName: '',
  idCardFileName: '',
};

export const INITIAL_ML_METRICS: MLModelMetrics = {
  name: 'NexoTalent-Classifier',
  version: 'v2.4.1-prod',
  algorithm: 'Random Forest + TF-IDF Vectorizer & Cosine Similarity',
  accuracy: 92.4,
  precision: 89.1,
  recall: 91.5,
  f1Score: 90.3,
  datasetSize: 1250,
  lastTrainedAt: '2026-10-19T04:12:00Z',
  isFairnessCompliant: true,
  trainingHistory: [
    { epoch: 1, accuracy: 78.2, loss: 0.45 },
    { epoch: 2, accuracy: 83.5, loss: 0.38 },
    { epoch: 3, accuracy: 87.1, loss: 0.31 },
    { epoch: 4, accuracy: 90.4, loss: 0.24 },
    { epoch: 5, accuracy: 92.4, loss: 0.18 },
  ],
};

export const INITIAL_COMPARISON_METRICS: ComparisonMetrics = {
  manualFilterTimeDays: 4.8,
  platformFilterTimeMinutes: 12.0,
  manualScreeningAccuracy: 42.0,
  platformScreeningAccuracy: 92.4,
  totalApplicationsProcessed: 540,
  averageSatisfactionScore: 9.2,
  timeReductionPercentage: 96.0,
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_EMPLOYEES: Employee[] = [];

// LocalStorage Persistence Layer
class MockDataStore {
  constructor() {
    this.cleanDemoGarbage();
  }

  cleanDemoGarbage(): void {
    try {
      const rawEmployees = this.get<Employee[]>('employees', []);
      const cleanEmployees = rawEmployees.filter(
        (e) => !e.email?.toLowerCase().includes('@nexo.com') && e.empresaId !== 'emp-01' && !e.id?.startsWith('emp-worker-')
      );
      this.set('employees', cleanEmployees);

      const rawCompanies = this.get<Empresa[]>('companies', []);
      const cleanCompanies = rawCompanies.filter(
        (c) => c.id !== 'emp-01' && c.id !== 'emp-02' && c.id !== 'emp-03' && !c.nombre?.toLowerCase().includes('nexo tecnología')
      );
      this.set('companies', cleanCompanies);

      const rawVacancies = this.get<Vacancy[]>('vacancies', []);
      const cleanVacancies = rawVacancies.filter(
        (v) => v.empresaId !== 'emp-01' && !v.empresaNombre?.toLowerCase().includes('nexo tecnología') && !v.id?.startsWith('vac-0')
      );
      this.set('vacancies', cleanVacancies);

      const rawUsers = this.get<User[]>('users', []);
      const cleanUsers = rawUsers.filter(
        (u) =>
          !u.email?.toLowerCase().includes('@nexo.com') &&
          u.email?.toLowerCase() !== 'valeria.mendoza@correo.com' &&
          u.id !== 'usr-adm-01' &&
          u.id !== 'usr-hr-01' &&
          u.id !== 'usr-cand-01'
      );
      this.set('users', cleanUsers);

      const rawApps = this.get<Application[]>('applications', []);
      const cleanApps = rawApps.filter(
        (a) =>
          !a.candidateEmail?.toLowerCase().includes('@correo.com') &&
          !a.candidateEmail?.toLowerCase().includes('valeria') &&
          !a.candidateEmail?.toLowerCase().includes('gabriel.paredes') &&
          !a.candidateEmail?.toLowerCase().includes('lucia.mendez') &&
          !a.candidateEmail?.toLowerCase().includes('marcos.rivas') &&
          !a.id?.startsWith('app-0')
      );
      this.set('applications', cleanApps);
    } catch {}
  }

  private get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(`nexo_recruitment_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`nexo_recruitment_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  getCompanies(): Empresa[] {
    return this.get('companies', INITIAL_COMPANIES);
  }

  saveCompanies(companies: Empresa[]): void {
    this.set('companies', companies);
  }

  getUsers(): User[] {
    return this.get('users', INITIAL_USERS);
  }

  saveUsers(users: User[]): void {
    this.set('users', users);
  }

  getEmployees(): Employee[] {
    return this.get('employees', INITIAL_EMPLOYEES);
  }

  saveEmployees(employees: Employee[]): void {
    this.set('employees', employees);
  }

  getVacancies(): Vacancy[] {
    return this.get('vacancies', INITIAL_VACANCIES);
  }

  saveVacancies(vacancies: Vacancy[]): void {
    this.set('vacancies', vacancies);
  }

  getApplications(): Application[] {
    return this.get('applications', INITIAL_APPLICATIONS);
  }

  saveApplications(apps: Application[]): void {
    this.set('applications', apps);
  }

  getCandidateProfile(): CandidateProfile {
    return this.get('candidate_profile', INITIAL_CANDIDATE_PROFILE);
  }

  saveCandidateProfile(profile: CandidateProfile): void {
    this.set('candidate_profile', profile);
  }

  getMLMetrics(): MLModelMetrics {
    return this.get('ml_metrics', INITIAL_ML_METRICS);
  }

  saveMLMetrics(metrics: MLModelMetrics): void {
    this.set('ml_metrics', metrics);
  }

  getComparisonMetrics(): ComparisonMetrics {
    return this.get('comparison_metrics', INITIAL_COMPARISON_METRICS);
  }

  getNotifications(): NotificationItem[] {
    return this.get('notifications', INITIAL_NOTIFICATIONS);
  }

  saveNotifications(notifs: NotificationItem[]): void {
    this.set('notifications', notifs);
  }

  resetToDefaults(): void {
    try {
      localStorage.removeItem('nexo_recruitment_users');
      localStorage.removeItem('nexo_recruitment_vacancies');
      localStorage.removeItem('nexo_recruitment_applications');
      localStorage.removeItem('nexo_recruitment_candidate_profile');
      localStorage.removeItem('nexo_recruitment_ml_metrics');
      localStorage.removeItem('nexo_recruitment_notifications');
    } catch {}
  }
}

export const mockStore = new MockDataStore();
