import { CandidateProfile, CandidateVisibilitySettings } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

const PROFILE_KEY_PREFIX = 'nexo_candidate_profile_';
const VISIBILITY_KEY_PREFIX = 'nexo_candidate_visibility_';

export const DEFAULT_VISIBILITY: CandidateVisibilitySettings = {
  profileVisible: true,
  showEmail: true,
  showPhone: true,
  showLocation: true,
  showExperience: true,
  showEducation: true,
  showSkills: true,
};

function getStorageKey(email?: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  return cleanEmail ? `${PROFILE_KEY_PREFIX}${cleanEmail}` : 'nexo_candidate_profile_default';
}

function getVisibilityKey(email?: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  return cleanEmail ? `${VISIBILITY_KEY_PREFIX}${cleanEmail}` : 'nexo_candidate_visibility_default';
}

export function getCandidateVisibility(email?: string): CandidateVisibilitySettings {
  try {
    const raw = localStorage.getItem(getVisibilityKey(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_VISIBILITY, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_VISIBILITY };
}

export function saveCandidateVisibility(
  email: string | undefined,
  visibility: Partial<CandidateVisibilitySettings>,
): CandidateVisibilitySettings {
  const merged = { ...getCandidateVisibility(email), ...visibility };
  try {
    localStorage.setItem(getVisibilityKey(email), JSON.stringify(merged));
  } catch {}
  return merged;
}

export const candidatesService = {
  async getProfile(email?: string): Promise<CandidateProfile> {
    const key = getStorageKey(email);
    const vis = getCandidateVisibility(email);

    if (!USE_MOCK) {
      try {
        const response = await api.get<any>('/candidates/me');
        const p = (response.data as any)?.data || response.data;
        if (p && p.id) {
          const targetEmail = p.email || email || '';
          const resolvedVis = getCandidateVisibility(targetEmail);
          const profile: CandidateProfile = {
            id: p.id,
            userId: p.userId || 'usr-cand',
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            email: targetEmail,
            phone: p.phone || '',
            title: p.title || '',
            bio: p.bio || '',
            location: p.location || '',
            visibility: resolvedVis,
            education: Array.isArray(p.education) ? p.education : [],
            experience: Array.isArray(p.experience) ? p.experience : [],
            skills: Array.isArray(p.skills) ? p.skills : [],
            cvFileName: p.cvFileName || '',
            idCardFileName: p.idCardFileName || '',
          };

          localStorage.setItem(getStorageKey(targetEmail), JSON.stringify(profile));
          return profile;
        }
      } catch {
        // continúa a caché local si no es sesión de candidato o está offline
      }
    }

    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            id: parsed.id || `cand-${Date.now()}`,
            userId: parsed.userId || 'usr-cand',
            firstName: parsed.firstName || '',
            lastName: parsed.lastName || '',
            email: parsed.email || email || '',
            phone: parsed.phone || '',
            title: parsed.title || '',
            bio: parsed.bio || '',
            location:
              parsed.location === 'Santo Domingo, República Dominicana'
                ? ''
                : parsed.location || '',
            visibility: parsed.visibility ? { ...DEFAULT_VISIBILITY, ...parsed.visibility } : vis,
            education: Array.isArray(parsed.education) ? parsed.education : [],
            experience: Array.isArray(parsed.experience) ? parsed.experience : [],
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            cvFileName: parsed.cvFileName || '',
            idCardFileName: parsed.idCardFileName || '',
          };
        }
      } catch {}
    }

    let currentUser: any = null;
    try {
      const uStr = localStorage.getItem('nexo_current_user');
      if (uStr) currentUser = JSON.parse(uStr);
    } catch {}

    const candidateEmail = email || currentUser?.email || '';
    const fullName = currentUser?.name || '';
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const initialProfile: CandidateProfile = {
      id: `cand-${Date.now()}`,
      userId: currentUser?.id || `usr-${Date.now()}`,
      firstName,
      lastName,
      email: candidateEmail,
      phone: currentUser?.phone || '',
      title: '',
      bio: '',
      location: '',
      visibility: vis,
      education: [],
      experience: [],
      skills: [],
      cvFileName: '',
      idCardFileName: '',
    };

    localStorage.setItem(key, JSON.stringify(initialProfile));
    mockStore.saveCandidateProfile(initialProfile);
    return initialProfile;
  },

  async updateProfile(
    updates: Partial<CandidateProfile> & { telegramLinked?: boolean },
    email?: string,
  ): Promise<CandidateProfile> {
    const current = await this.getProfile(email);
    const targetEmail = email || updates.email || current.email;
    const nextVisibility = updates.visibility
      ? saveCandidateVisibility(targetEmail, updates.visibility)
      : current.visibility || getCandidateVisibility(targetEmail);

    const updated: CandidateProfile = {
      ...current,
      ...updates,
      visibility: nextVisibility,
      skills: updates.skills !== undefined ? updates.skills : current.skills,
      education: updates.education !== undefined ? updates.education : current.education,
      experience: updates.experience !== undefined ? updates.experience : current.experience,
    };

    const key = getStorageKey(targetEmail);
    localStorage.setItem(key, JSON.stringify(updated));
    mockStore.saveCandidateProfile(updated);

    if (!USE_MOCK) {
      try {
        await api.put('/candidates/me', {
          ...updates,
          ubicacion: updates.location !== undefined ? updates.location : undefined,
          perfilVisible: nextVisibility.profileVisible,
          telegramLinked: updates.telegramLinked,
        });
      } catch (err) {
        console.warn('Backend update candidate profile stored locally:', err);
      }
    }

    return updated;
  },

  async uploadCVDocument(file: File): Promise<{ id?: string; filename: string }> {
    if (!USE_MOCK) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', 'CURRICULO');
        const res = await api.post<any>('/candidates/me/documents', formData);
        const data = (res.data as any)?.data || res.data;
        return {
          id: data?.id,
          filename: data?.filename || file.name,
        };
      } catch (err) {
        console.warn('Subida de CV guardada localmente:', err);
      }
    }
    return { filename: file.name };
  },
};
