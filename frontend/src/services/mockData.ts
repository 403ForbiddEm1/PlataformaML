import {
  Application,
  CandidateProfile,
  ComparisonMetrics,
  MLModelMetrics,
  NotificationItem,
  User,
  Vacancy,
} from '@/types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-cand-01',
    email: 'valeria.mendoza@correo.com',
    name: 'Valeria Mendoza',
    role: 'candidato',
    phone: '+1 (809) 555-0198',
    avatar: 'VM',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'usr-hr-01',
    email: 'carlos.rrhh@nexo.com',
    name: 'Lic. Carlos Arismendi',
    role: 'rrhh',
    phone: '+1 (809) 555-0244',
    avatar: 'CA',
    createdAt: '2026-09-15T08:30:00Z',
  },
  {
    id: 'usr-adm-01',
    email: 'sofia.admin@nexo.com',
    name: 'Ing. Sofía Velásquez',
    role: 'administrador',
    phone: '+1 (809) 555-0371',
    avatar: 'SV',
    createdAt: '2026-08-10T09:00:00Z',
  },
];

export const INITIAL_VACANCIES: Vacancy[] = [
  {
    id: 'vac-01',
    title: 'Analista de Datos',
    department: 'Datos y Analítica',
    location: 'Santo Domingo, RD',
    workMode: 'Híbrido',
    type: 'Tiempo completo',
    status: 'Abierta',
    description:
      'Buscamos un Analista de Datos talentoso para transformar datos operativos en insights estratégicos que guíen la toma de decisiones empresariales. Diseñarás pipelines analíticos y tableros de BI.',
    requirements: [
      'Licenciatura o Ingeniería en Sistemas, Estadística, Matemáticas o afines.',
      'Experiencia mínima de 2 años en análisis cuantitativo y modelado de datos.',
      'Dominio de SQL, Python (Pandas, NumPy) y herramientas de visualización (Power BI / Tableau).',
      'Conocimientos en ETL, limpieza de datos y modelado relacional.',
    ],
    requiredSkills: ['Python', 'SQL', 'Power BI', 'ETL', 'Pandas', 'Modelado de Datos'],
    minExperienceYears: 2,
    openings: 2,
    appliedCount: 14,
    createdAt: '2026-10-05T14:00:00Z',
  },
  {
    id: 'vac-02',
    title: 'Analista de Inteligencia de Negocios',
    department: 'Inteligencia de Negocios',
    location: 'Santo Domingo, RD',
    workMode: 'Híbrido',
    type: 'Tiempo completo',
    status: 'Abierta',
    description:
      'Liderar el diseño de KPIs, tableros ejecutivos y análisis predictivo comercial para las diferentes áreas de negocio de Nexo Tecnología.',
    requirements: [
      'Experiencia en modelado dimensional (Kimball) y data warehousing.',
      'Avanzado manejo de DAX y Power BI.',
      'Habilidades de comunicación para traducir datos a tomadores de decisiones.',
    ],
    requiredSkills: ['Power BI', 'DAX', 'SQL Server', 'Data Warehousing', 'Storytelling'],
    minExperienceYears: 3,
    openings: 1,
    appliedCount: 9,
    createdAt: '2026-10-02T11:00:00Z',
  },
  {
    id: 'vac-03',
    title: 'Asistente de Analítica',
    department: 'Datos y Analítica',
    location: 'Santo Domingo, RD',
    workMode: 'Presencial',
    type: 'Tiempo completo',
    status: 'Abierta',
    description:
      'Posición junior para apoyar en la recolección, validación y preparación de datos para los modelos analíticos de la empresa.',
    requirements: [
      'Estudiante de término o recién graduado en carreras cuantitativas o tecnologías.',
      'Manejo intermedio de Excel y nociones de SQL.',
      'Alta atención al detalle y curiosidad intelectual.',
    ],
    requiredSkills: ['Excel Avanzado', 'SQL Básico', 'Validación de Datos'],
    minExperienceYears: 0,
    openings: 3,
    appliedCount: 22,
    createdAt: '2026-10-15T09:30:00Z',
  },
  {
    id: 'vac-04',
    title: 'Ingeniero de Machine Learning',
    department: 'Innovación e Inteligencia Artificial',
    location: 'Santo Domingo, RD',
    workMode: 'Híbrido',
    type: 'Tiempo completo',
    status: 'Abierta',
    description:
      'Desarrollo, despliegue y monitoreo de modelos de aprendizaje automático y procesamiento de lenguaje natural en producción.',
    requirements: [
      'Ingeniería en Software, Ciencias de la Computación o afín.',
      'Experiencia sólida con Scikit-learn, PyTorch o TensorFlow.',
      'Conocimiento en APIs REST (FastAPI) y contenedores Docker.',
    ],
    requiredSkills: ['Python', 'Scikit-Learn', 'FastAPI', 'Docker', 'NLP', 'MLOps'],
    minExperienceYears: 3,
    openings: 1,
    appliedCount: 8,
    createdAt: '2026-10-18T16:00:00Z',
  },
];

export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'app-01',
    vacancyId: 'vac-01',
    vacancyTitle: 'Analista de Datos',
    vacancyDepartment: 'Datos y Analítica · Híbrido',
    candidateId: 'usr-cand-01',
    candidateName: 'Valeria Mendoza',
    candidateEmail: 'valeria.mendoza@correo.com',
    candidatePhone: '+1 (809) 000-0000',
    idCardFileName: 'Cedula_Identidad_VMendoza.pdf',
    cvFileName: 'Curriculum_Vitae_Valeria_Mendoza.pdf',
    status: 'Preseleccionado',
    appliedDate: '16 oct. 2026',
    updatedDate: '2026-10-18T15:20:00Z',
    mlScore: 94,
    mlBreakdown: {
      affinityScore: 94,
      experienceMatch: 95,
      educationMatch: 92,
      skillsMatch: 96,
      matchingSkills: ['Python', 'SQL', 'Power BI', 'ETL', 'Pandas', 'Modelado de Datos'],
      missingSkills: [],
      keyFactors: [
        '3 años de experiencia directa en puestos similares de analítica',
        'Licenciatura culminada en Ingeniería de Sistemas con énfasis en datos',
        'Dominio probado del stack tecnológico requerido (Python, SQL, Power BI)',
      ],
      explanation:
        'El perfil supera en un 15% el umbral mínimo exigido. Su experiencia en pipelines analíticos coincide en alta concordancia con las responsabilidades del cargo.',
      fairnessChecked: true,
    },
    recruiterNotes: [
      'Perfil altamente prometedor. El CV muestra proyectos sólidos en automatización de reportes.',
      'Avanzar a fase de entrevista técnica con el líder del equipo de Datos.',
    ],
    timeline: [
      {
        id: 'evt-01',
        stage: 'Registro',
        title: 'Postulación Recibida',
        description: 'Postulación enviada a través del portal de talento web.',
        timestamp: '16 oct. 2026 · 10:15 AM',
        actor: 'Valeria Mendoza (Candidata)',
        channel: 'Sistema',
      },
      {
        id: 'evt-02',
        stage: 'Recibida',
        title: 'Notificación de Confirmación',
        description: 'Mensaje de recepción enviado automáticamente a correo y WhatsApp.',
        timestamp: '16 oct. 2026 · 10:16 AM',
        actor: 'Servicio Automático Nexo',
        channel: 'WhatsApp',
      },
      {
        id: 'evt-03',
        stage: 'En revisión',
        title: 'Evaluación Algorítmica de Afinidad (ML)',
        description:
          'El modelo de Machine Learning analizó los datos estructurados y asignó un 94% de afinidad.',
        timestamp: '16 oct. 2026 · 10:20 AM',
        actor: 'Algoritmo ML (RandomForest v2.4)',
        channel: 'Sistema',
      },
      {
        id: 'evt-04',
        stage: 'Preseleccionado',
        title: 'Validación y Preselección Humana',
        description:
          'El analista de talento humano revisó los factores y aprobó el cambio a Preseleccionado.',
        timestamp: '18 oct. 2026 · 03:20 PM',
        actor: 'Lic. Carlos Arismendi (RRHH)',
        channel: 'Sistema',
      },
    ],
  },
  {
    id: 'app-02',
    vacancyId: 'vac-02',
    vacancyTitle: 'Analista de Inteligencia de Negocios',
    vacancyDepartment: 'Inteligencia de Negocios · Híbrido',
    candidateId: 'usr-cand-01',
    candidateName: 'Valeria Mendoza',
    candidateEmail: 'valeria.mendoza@correo.com',
    candidatePhone: '+1 (809) 000-0000',
    idCardFileName: 'Cedula_Identidad_VMendoza.pdf',
    cvFileName: 'Curriculum_Vitae_Valeria_Mendoza.pdf',
    status: 'En revisión',
    appliedDate: '12 oct. 2026',
    updatedDate: '2026-10-14T09:10:00Z',
    mlScore: 86,
    mlBreakdown: {
      affinityScore: 86,
      experienceMatch: 82,
      educationMatch: 90,
      skillsMatch: 88,
      matchingSkills: ['Power BI', 'SQL Server', 'Data Warehousing'],
      missingSkills: ['DAX Avanzado'],
      keyFactors: [
        'Sólida base en construcción de dashboards ejecutivos',
        'Experiencia con bases de datos transaccionales y analíticas',
      ],
      explanation:
        'Candidata con alto potencial comercial y analítico. Se recomienda validar experiencia práctica en fórmulas DAX complejas.',
      fairnessChecked: true,
    },
    recruiterNotes: ['En cola de revisión por el analista asignado.'],
    timeline: [
      {
        id: 'evt-11',
        stage: 'Registro',
        title: 'Postulación Recibida',
        description: 'Postulación registrada exitosamente.',
        timestamp: '12 oct. 2026 · 02:40 PM',
        actor: 'Valeria Mendoza (Candidata)',
        channel: 'Sistema',
      },
      {
        id: 'evt-12',
        stage: 'En revisión',
        title: 'Clasificación Preliminar ML',
        description: 'Puntaje de afinidad calculado: 86%.',
        timestamp: '12 oct. 2026 · 02:42 PM',
        actor: 'Algoritmo ML',
        channel: 'Sistema',
      },
    ],
  },
  {
    id: 'app-03',
    vacancyId: 'vac-03',
    vacancyTitle: 'Asistente de Analítica',
    vacancyDepartment: 'Datos y Analítica · Presencial',
    candidateId: 'usr-cand-01',
    candidateName: 'Valeria Mendoza',
    candidateEmail: 'valeria.mendoza@correo.com',
    candidatePhone: '+1 (809) 000-0000',
    idCardFileName: 'Cedula_Identidad_VMendoza.pdf',
    cvFileName: 'Curriculum_Vitae_Valeria_Mendoza.pdf',
    status: 'Recibida',
    appliedDate: '20 oct. 2026',
    updatedDate: '2026-10-20T11:00:00Z',
    mlScore: 98,
    mlBreakdown: {
      affinityScore: 98,
      experienceMatch: 100,
      educationMatch: 96,
      skillsMatch: 100,
      matchingSkills: ['Excel Avanzado', 'SQL Básico', 'Validación de Datos'],
      missingSkills: [],
      keyFactors: [
        'Sobrecualificada positivamente para el puesto de entrada',
        'Disponibilidad inmediata confirmada',
      ],
      explanation:
        'El perfil supera ampliamente las competencias requeridas para este rol junior. Podría ser considerada prioritariamente para roles de mayor rango.',
      fairnessChecked: true,
    },
    recruiterNotes: ['Postulación recién recibida, pendiente de triaje inicial.'],
    timeline: [
      {
        id: 'evt-21',
        stage: 'Registro',
        title: 'Postulación Recibida',
        description: 'Formulario y recaudos cargados en el sistema.',
        timestamp: '20 oct. 2026 · 11:00 AM',
        actor: 'Valeria Mendoza (Candidata)',
        channel: 'Sistema',
      },
    ],
  },
  {
    id: 'app-04',
    vacancyId: 'vac-01',
    vacancyTitle: 'Analista de Datos',
    vacancyDepartment: 'Datos y Analítica · Híbrido',
    candidateId: 'usr-cand-02',
    candidateName: 'Gabriel Paredes',
    candidateEmail: 'gabriel.paredes@gmail.com',
    candidatePhone: '+1 (809) 441-9988',
    idCardFileName: 'Cedula_GParedes.pdf',
    cvFileName: 'CV_GabrielParedes.pdf',
    status: 'Preseleccionado',
    appliedDate: '17 oct. 2026',
    updatedDate: '2026-10-18T10:00:00Z',
    mlScore: 91,
    mlBreakdown: {
      affinityScore: 91,
      experienceMatch: 90,
      educationMatch: 90,
      skillsMatch: 94,
      matchingSkills: ['Python', 'SQL', 'ETL', 'Pandas'],
      missingSkills: ['Power BI'],
      keyFactors: ['Fuerte experiencia en backend de datos y SQL avanzado'],
      explanation: 'Gran perfil técnico en extracción y estructuración.',
      fairnessChecked: true,
    },
    recruiterNotes: ['Contactar para primera llamada exploratoria.'],
    timeline: [
      {
        id: 'evt-31',
        stage: 'Registro',
        title: 'Postulación Recibida',
        description: 'Postulación en línea.',
        timestamp: '17 oct. 2026',
        actor: 'Gabriel Paredes',
      },
    ],
  },
  {
    id: 'app-05',
    vacancyId: 'vac-01',
    vacancyTitle: 'Analista de Datos',
    vacancyDepartment: 'Datos y Analítica · Híbrido',
    candidateId: 'usr-cand-03',
    candidateName: 'Lucía Méndez',
    candidateEmail: 'lucia.mendez@outlook.com',
    candidatePhone: '+1 (809) 712-3344',
    idCardFileName: 'Doc_LMendez.jpg',
    cvFileName: 'CV_Lucia_Mendez.docx',
    status: 'En revisión',
    appliedDate: '19 oct. 2026',
    updatedDate: '2026-10-19T14:15:00Z',
    mlScore: 72,
    mlBreakdown: {
      affinityScore: 72,
      experienceMatch: 65,
      educationMatch: 80,
      skillsMatch: 70,
      matchingSkills: ['SQL', 'Power BI'],
      missingSkills: ['Python', 'ETL'],
      keyFactors: ['Experiencia previa más orientada a soporte que a modelado'],
      explanation: 'Requiere nivelación en scripts de Python y pipelines ETL.',
      fairnessChecked: true,
    },
    recruiterNotes: [],
    timeline: [
      {
        id: 'evt-41',
        stage: 'Registro',
        title: 'Postulación Recibida',
        description: 'Formulario cargado.',
        timestamp: '19 oct. 2026',
        actor: 'Lucía Méndez',
      },
    ],
  },
  {
    id: 'app-06',
    vacancyId: 'vac-01',
    vacancyTitle: 'Analista de Datos',
    vacancyDepartment: 'Datos y Analítica · Híbrido',
    candidateId: 'usr-cand-04',
    candidateName: 'Marcos Rivas',
    candidateEmail: 'marcos.rivas@yahoo.com',
    candidatePhone: '+1 (809) 688-1200',
    idCardFileName: 'Cedula_MRivas.pdf',
    cvFileName: 'Curriculum_MRivas.pdf',
    status: 'Descartado',
    appliedDate: '14 oct. 2026',
    updatedDate: '2026-10-15T16:00:00Z',
    mlScore: 48,
    mlBreakdown: {
      affinityScore: 48,
      experienceMatch: 40,
      educationMatch: 60,
      skillsMatch: 45,
      matchingSkills: ['Excel'],
      missingSkills: ['Python', 'SQL', 'Power BI', 'ETL'],
      keyFactors: ['No cumple con los requisitos mínimos de programación'],
      explanation:
        'Afinidad insuficiente con los requerimientos técnicos del cargo.',
      fairnessChecked: true,
    },
    recruiterNotes: ['Descartado por no cumplir el perfil técnico indispensable.'],
    timeline: [
      {
        id: 'evt-51',
        stage: 'Registro',
        title: 'Postulación Recibida',
        description: 'Registro completado.',
        timestamp: '14 oct. 2026',
        actor: 'Marcos Rivas',
      },
      {
        id: 'evt-52',
        stage: 'Descartado',
        title: 'Notificación de Descarte Respetuoso',
        description: 'Aviso enviado por correo agradeciendo su postulación.',
        timestamp: '15 oct. 2026',
        actor: 'Lic. Carlos Arismendi (RRHH)',
        channel: 'Email',
      },
    ],
  },
];

export const INITIAL_CANDIDATE_PROFILE: CandidateProfile = {
  id: 'cand-01',
  userId: 'usr-cand-01',
  firstName: 'Valeria',
  lastName: 'Mendoza',
  email: 'valeria.mendoza@correo.com',
  phone: '+1 (809) 000-0000',
  title: 'Analista de Datos & Especialista en Business Intelligence',
  bio: 'Profesional apasionada por transformar datos complejos en tableros claros e historias que impulsen resultados de negocio. Experiencia en automatización de flujos analíticos y modelado de datos.',
  location: 'Santo Domingo, República Dominicana',
  education: [
    {
      institution: 'Universidad del Caribe',
      degree: 'Licenciatura en Ingeniería de Sistemas e Informática',
      graduationYear: '2023',
    },
    {
      institution: 'DataCamp & IBM Data Science Professional',
      degree: 'Certificación Profesional en Análisis y Ciencia de Datos',
      graduationYear: '2024',
    },
  ],
  experience: [
    {
      company: 'DataSolutions Dominicana',
      role: 'Analista de Datos Semi-Senior',
      period: '2024 - Presente',
      description:
        'Desarrollo de pipelines automatizados con Python y Pandas. Creación y mantenimiento de más de 20 dashboards en Power BI consumidos por el comité directivo.',
    },
    {
      company: 'Caribe Analytics',
      role: 'Asistente de Business Intelligence',
      period: '2022 - 2024',
      description:
        'Consultas complejas en SQL Server, normalización de bases de datos y elaboración de reportes de rendimiento comercial.',
    },
  ],
  skills: [
    'Python',
    'SQL Server / PostgreSQL',
    'Power BI & DAX',
    'ETL Pipelines',
    'Pandas & NumPy',
    'Data Cleaning',
    'Git / GitHub',
  ],
  cvFileName: 'Curriculum_Vitae_Valeria_Mendoza.pdf',
  idCardFileName: 'Cedula_Identidad_VMendoza.pdf',
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

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-01',
    recipient: 'valeria.mendoza@correo.com',
    channel: 'WhatsApp',
    title: 'Postulación en Nexo Tecnología',
    message:
      '¡Hola Valeria! 👋 Recibimos tu postulación para Analista de Datos en Nexo Tecnología. Tu número de seguimiento es #APP-01. Mantente atenta.',
    timestamp: '16 oct. 2026 · 10:16 AM',
    status: 'Entregado',
    relatedApplicationId: 'app-01',
  },
  {
    id: 'notif-02',
    recipient: 'valeria.mendoza@correo.com',
    channel: 'Email',
    title: 'Actualización: ¡Tu perfil fue preseleccionado!',
    message:
      'Estimada Valeria, nos complace informarte que tu postulación para Analista de Datos avanzó a la etapa de Preselección con un puntaje de afinidad destacado.',
    timestamp: '18 oct. 2026 · 03:25 PM',
    status: 'Leído',
    relatedApplicationId: 'app-01',
  },
];

// LocalStorage Persistence Layer
class MockDataStore {
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

  getUsers(): User[] {
    return this.get('users', INITIAL_USERS);
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
