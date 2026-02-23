import { create } from 'zustand';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
  console.error("❌ EXPO_PUBLIC_BACKEND_URL is missing");
}

interface DetectedIssue {
  issue: string;
  description: string;
}

interface SignalBreakdown {
  visual: number;
  semantic: number;
  effort: number;
  default: number;
  pressure: number;
}

export interface Analysis {
  id: string;
  dpi_score: number;
  risk_level: string;
  simple_summary: string;
  detected_issues: DetectedIssue[];
  signal_breakdown: SignalBreakdown;
  timestamp: string;
  language: string;
  screenshot?: string;
}

interface AnalysisStore {
  currentAnalysis: Analysis | null;
  history: Analysis[];
  language: 'en' | 'hi' | 'hinglish';

  analyzeScreenshot: (payload: {
    screenshot: string;
    language: string;
  }) => Promise<void>;

  fetchHistory: () => Promise<void>;

  setCurrentAnalysis: (analysis: Analysis) => void;
  setLanguage: (language: 'en' | 'hi' | 'hinglish') => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  currentAnalysis: null,
  history: [],
  language: 'en',

  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setLanguage: (language) => set({ language }),

  analyzeScreenshot: async (payload) => {
    try {
      const res = await fetch(`${BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Analyze API failed');
      }

      const data = await res.json();
      set({ currentAnalysis: data });

    } catch (err) {
      console.error('❌ analyzeScreenshot error:', err);
      throw err;
    }
  },

  fetchHistory: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/history`);

      if (!res.ok) {
        throw new Error('History API failed');
      }

      const data = await res.json();
      set({ history: Array.isArray(data.analyses) ? data.analyses : [] });

    } catch (err) {
      // 🔁 Render free-tier sleep retry
      console.warn('⚠️ History fetch failed, retrying...', err);

      await new Promise((r) => setTimeout(r, 3000));

      const retry = await fetch(`${BASE_URL}/api/history`);
      const data = await retry.json();
      set({ history: Array.isArray(data.analyses) ? data.analyses : [] });
    }
  },
}));