import { CandidateProfile } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';
import { parseAndAnalyzeCV } from './cvParser';

const PROFILE_KEY_PREFIX = 'nexo_candidate_profile_';

function getStorageKey(email?: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  return cleanEmail ? `${PROFILE_KEY_PREFIX}${cleanEmail}` : 'nexo_candidate_profile_default';
}

export const candidatesService = {
  async getProfile(email?: string): Promise<CandidateProfile> {
    const key = getStorageKey(email);
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
            location: parsed.location || 'Santo Domingo, República Dominicana',
            education: Array.isArray(parsed.education) ? parsed.education : [],
            experience: Array.isArray(parsed.experience) ? parsed.experience : [],
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            cvFileName: parsed.cvFileName || '',
            idCardFileName: parsed.idCardFileName || '',
          };
        }
      } catch {}
    }

    if (!USE_MOCK) {
      try {
        const response = await api.get<any>('/candidates/me');
        const p = (response.data as any)?.data || response.data;
        if (p && p.id) {
          const profile: CandidateProfile = {
            id: p.id,
            userId: p.userId || 'usr-cand',
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            email: p.email || email || '',
            phone: p.phone || '',
            title: p.title || '',
            bio: p.bio || '',
            location: p.location || 'Santo Domingo, República Dominicana',
            education: Array.isArray(p.education) ? p.education : [],
            experience: Array.isArray(p.experience) ? p.experience : [],
            skills: Array.isArray(p.skills) ? p.skills : [],
            cvFileName: p.cvFileName || '',
            idCardFileName: p.idCardFileName || '',
          };

          localStorage.setItem(key, JSON.stringify(profile));
          return profile;
        }
      } catch (err) {
        console.warn('Backend /candidates/me GET failed or offline:', err);
      }
    }

    // Perfil inicial limpio para nuevo candidato sin datos inventados ni CV precargado
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
      location: 'Santo Domingo, República Dominicana',
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

  async updateProfile(updates: Partial<CandidateProfile>, email?: string): Promise<CandidateProfile> {
    const current = await this.getProfile(email);
    const updated: CandidateProfile = {
      ...current,
      ...updates,
      skills: updates.skills !== undefined ? updates.skills : current.skills,
      education: updates.education !== undefined ? updates.education : current.education,
      experience: updates.experience !== undefined ? updates.experience : current.experience,
    };

    const key = getStorageKey(email || updated.email);
    localStorage.setItem(key, JSON.stringify(updated));
    mockStore.saveCandidateProfile(updated);

    if (!USE_MOCK) {
      try {
        await api.put('/candidates/me', updates);
      } catch (err) {
        console.warn('Backend update candidate profile failed, stored locally:', err);
      }
    }

    return updated;
  },
};
