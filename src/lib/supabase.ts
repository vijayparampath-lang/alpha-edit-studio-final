import { createClient } from '@supabase/supabase-js';
import { PortfolioItem, Skill, Experience, Testimonial, Service } from '../types';
import { SKILLS, EXPERIENCE_TIMELINE, TESTIMONIALS, SERVICES } from '../data';

// Extended portfolio item type to support pricing, status, tools, and sorting
export interface ExtendedPortfolioItem extends PortfolioItem {
  images?: string[];
  status?: 'Active' | 'Hidden';
  price?: number;
  discountPrice?: number;
  isStartingFrom?: boolean;
  customPricingText?: string;
  tools?: string[];
  sortOrder?: number;
  created_at?: string;
}

export interface AboutCMS {
  name: string;
  title: string;
  bio: string;
  profileImage: string;
  resumeUrl: string;
}

export interface ContactCMS {
  email: string;
  phone: string;
  address: string;
}

export interface SettingsCMS {
  websiteName: string;
  logoText: string;
  heroTitle: string;
  heroSubtitle: string;
  whatsappNumber: string;
  footerText: string;
  copyrightText: string;
  seoTitle: string;
  seoDescription: string;
  themeColor: string;
  accentColor: string;
}

export interface StudioMetricsCMS {
  clientCollaborations: string;
  clientCollaborationsLabel: string;
  clientCollaborationsDesc: string;
  projectPeriod: string;
  projectPeriodLabel: string;
  projectPeriodDesc: string;
  studioHighlight: string;
  studioHighlightLabel: string;
  studioHighlightDesc: string;
  projectsCompletedLabel: string;
  projectsCompletedDesc: string;
}

export interface LiveProjectMetrics {
  publishedCount: number;
  totalRealCount: number;
  creativeCategories: string[];
  categoriesCount: number;
  hasRealProjects: boolean;
}

export function isDemoProject(item: { id: string | number; isDemo?: boolean; is_demo?: boolean }): boolean {
  return !!(item.isDemo || item.is_demo);
}

export interface SocialLinkCMS {
  id: string;
  platform: string;
  url: string;
}

// Runtime Central Supabase Configuration (Shared across Desktop, Tablet, Mobile)
const runtimeConfig = {
  url: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ? String(import.meta.env.VITE_SUPABASE_URL).trim() : '',
  key: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim() : ''
};

// Check local storage for initial values if available
try {
  if (typeof localStorage !== 'undefined') {
    const lsUrl = (localStorage.getItem('vj-supabase-url') || '').trim();
    const lsKey = (localStorage.getItem('vj-supabase-anon-key') || '').trim();
    if (!runtimeConfig.url && lsUrl) runtimeConfig.url = lsUrl;
    if (!runtimeConfig.key && lsKey) runtimeConfig.key = lsKey;
  }
} catch (e) {
  // localStorage may be unavailable in some sandboxes
}

let configInitPromise: Promise<{ url: string; key: string }> | null = null;

// Initialize Supabase Configuration centrally from backend/config endpoint
export const initSupabaseConfig = async (): Promise<{ url: string; key: string }> => {
  if (runtimeConfig.url && runtimeConfig.key) {
    return runtimeConfig;
  }
  if (!configInitPromise) {
    configInitPromise = (async () => {
      try {
        const res = await fetch('/api/supabase-config');
        if (res.ok) {
          const data = await res.json();
          if (data.url && data.anonKey) {
            runtimeConfig.url = data.url.trim();
            runtimeConfig.key = data.anonKey.trim();
            try {
              localStorage.setItem('vj-supabase-url', runtimeConfig.url);
              localStorage.setItem('vj-supabase-anon-key', runtimeConfig.key);
            } catch (e) {}
            return runtimeConfig;
          }
        }
      } catch (e) {
        // Fall back to static config file if running as built SPA
        try {
          const staticRes = await fetch('/supabase-config.json');
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            if (staticData.url && staticData.anonKey) {
              runtimeConfig.url = staticData.url.trim();
              runtimeConfig.key = staticData.anonKey.trim();
              return runtimeConfig;
            }
          }
        } catch (err) {}
      }
      return runtimeConfig;
    })();
  }
  return configInitPromise;
};

// Start fetching central configuration immediately on module load
initSupabaseConfig().catch(() => {});

// Save Supabase Configuration centrally across all connected devices
export const saveCentralSupabaseConfig = async (url: string, anonKey: string): Promise<boolean> => {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  runtimeConfig.url = cleanUrl;
  runtimeConfig.key = cleanKey;
  cachedClient = null;
  cachedConfigKey = '';

  try {
    if (typeof localStorage !== 'undefined') {
      if (cleanUrl && cleanKey) {
        localStorage.setItem('vj-supabase-url', cleanUrl);
        localStorage.setItem('vj-supabase-anon-key', cleanKey);
      } else {
        localStorage.removeItem('vj-supabase-url');
        localStorage.removeItem('vj-supabase-anon-key');
      }
    }
  } catch (e) {}

  try {
    await fetch('/api/supabase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
    });
  } catch (e) {
    console.warn('Central config server notification warning:', e);
  }

  window.dispatchEvent(new Event('cms-update'));
  return true;
};

export const getSupabaseConfig = () => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ? String(import.meta.env.VITE_SUPABASE_URL).trim() : '';
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim() : '';

  let lsUrl = '';
  let lsKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      lsUrl = (localStorage.getItem('vj-supabase-url') || '').trim();
      lsKey = (localStorage.getItem('vj-supabase-anon-key') || '').trim();
    }
  } catch (e) {}

  // Precedence: environment variables > central runtimeConfig > localStorage cache
  const url = envUrl || runtimeConfig.url || lsUrl || '';
  const key = envKey || runtimeConfig.key || lsKey || '';
  return { url, key };
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return url.length > 0 && key.length > 0;
};

let cachedClient: any = null;
let cachedConfigKey = '';

export const getSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    const configKey = `${url}::${key}`;
    if (cachedClient && cachedConfigKey === configKey) {
      return cachedClient;
    }
    try {
      cachedClient = createClient<any>(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      cachedConfigKey = configKey;
      return cachedClient;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  cachedClient = null;
  cachedConfigKey = '';
  return null;
};

// Real-Time Supabase Subscription for Cross-Device Synchronization
export const subscribeToPortfolioChanges = (callback: () => void): (() => void) => {
  let active = true;
  let channel: any = null;

  const setup = async () => {
    await initSupabaseConfig();
    if (!active) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[Supabase Realtime] Supabase not connected yet. Waiting for central configuration...');
      return;
    }

    try {
      const channelName = `portfolio-sync-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'portfolio_items' },
          (payload: any) => {
            console.log('[Supabase Realtime] Change received on portfolio_items:', payload?.eventType);
            callback();
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Supabase Realtime] Subscribed to central portfolio_items changes');
          }
        });
    } catch (err) {
      console.warn('[Supabase Realtime] Subscription error:', err);
    }
  };

  setup();

  const handleCMSUpdate = () => {
    callback();
  };
  window.addEventListener('cms-update', handleCMSUpdate);

  return () => {
    active = false;
    window.removeEventListener('cms-update', handleCMSUpdate);
    if (channel) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) supabase.removeChannel(channel);
      } catch (e) {}
    }
  };
};

// Fallback LocalStorage Database Management (For non-portfolio CMS items only)
const LS_KEYS = {
  ABOUT: 'vj_cms_about',
  SERVICES: 'vj_cms_services',
  SKILLS: 'vj_cms_skills',
  EXPERIENCE: 'vj_cms_experience',
  TESTIMONIALS: 'vj_cms_testimonials',
  CONTACT: 'vj_cms_contact',
  SOCIALS: 'vj_cms_socials',
  SETTINGS: 'vj_cms_settings',
  METRICS: 'vj_cms_metrics'
};

const getLS = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
};

const setLS = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
  // Dispatch event for reactive updates in other components
  window.dispatchEvent(new Event('cms-update'));
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'f' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

// --- INDEXEDDB STORAGE MOCK FOR MEDIA ---
const DB_NAME = 'vj_cms_media_db';
const STORE_NAME = 'media';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setIndexedDB(key: string, val: Blob | File): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(val, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to save to IndexedDB', e);
  }
}

export async function getIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to read from IndexedDB', e);
    return null;
  }
}

export async function deleteIndexedDB(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to delete from IndexedDB', e);
  }
}

const resolvedUrlCache = new Map<string, string>();
const reverseUrlMap = new Map<string, string>();

export async function resolveMediaUrl(url: string): Promise<string> {
  if (typeof url === 'string' && url.startsWith('db-media://')) {
    const cached = resolvedUrlCache.get(url);
    if (cached) return cached;

    const id = url.replace('db-media://', '');
    const blob = await getIndexedDB(id);
    if (blob) {
      const objUrl = URL.createObjectURL(blob);
      resolvedUrlCache.set(url, objUrl);
      reverseUrlMap.set(objUrl, url);
      return objUrl;
    }
  }
  return url;
}

export async function resolveObjectMediaUrls<T>(obj: T): Promise<T> {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return (await resolveMediaUrl(obj)) as any;
  }
  if (Array.isArray(obj)) {
    const resolvedArray = await Promise.all(obj.map(item => resolveObjectMediaUrls(item)));
    return resolvedArray as any;
  }
  if (typeof obj === 'object') {
    const resolvedObj = { ...obj } as any;
    for (const key of Object.keys(resolvedObj)) {
      resolvedObj[key] = await resolveObjectMediaUrls(resolvedObj[key]);
    }
    return resolvedObj;
  }
  return obj;
}

export function unresolveMediaUrl(url: string): string {
  if (typeof url === 'string') {
    return reverseUrlMap.get(url) || url;
  }
  return url;
}

export function unresolveObjectMediaUrls<T>(obj: T): T {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return unresolveMediaUrl(obj) as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => unresolveObjectMediaUrls(item)) as any;
  }
  if (typeof obj === 'object') {
    const unresolvedObj = { ...obj } as any;
    for (const key of Object.keys(unresolvedObj)) {
      unresolvedObj[key] = unresolveObjectMediaUrls(unresolvedObj[key]);
    }
    return unresolvedObj;
  }
  return obj;
}

// Helper to convert data URI (Base64) to Blob
function dataURItoBlob(dataURI: string): { blob: Blob; mime: string } | null {
  try {
    const parts = dataURI.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const data = parts[1];
    
    let mime = 'application/octet-stream';
    const mimeMatch = header.match(/data:(.*?);/);
    if (mimeMatch) {
      mime = mimeMatch[1];
    }
    
    const isBase64 = header.indexOf('base64') >= 0;
    let binaryStr;
    if (isBase64) {
      binaryStr = atob(data);
    } else {
      binaryStr = decodeURIComponent(data);
    }
    
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    return { blob: new Blob([bytes], { type: mime }), mime };
  } catch (e) {
    console.error('Error converting data URI to blob', e);
    return null;
  }
}

// Automatic migration function to convert existing Base64 strings to IndexedDB references
export async function autoMigrateBase64ToIndexedDB(): Promise<void> {
  let migrated = false;

  // 1. Clear any legacy portfolio cache from localStorage so it never overrides Supabase
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('vj_cms_portfolio');
    }
  } catch (e) {}

  // 2. Migrate About CMS
  const aboutStr = localStorage.getItem(LS_KEYS.ABOUT);
  if (aboutStr) {
    try {
      const about = JSON.parse(aboutStr) as AboutCMS;
      let aboutMigrated = false;
      if (typeof about.profileImage === 'string' && about.profileImage.startsWith('data:')) {
        const res = dataURItoBlob(about.profileImage);
        if (res) {
          const id = `db-media-${generateUUID()}`;
          await setIndexedDB(id, res.blob);
          about.profileImage = `db-media://${id}`;
          aboutMigrated = true;
          migrated = true;
        }
      }
      if (typeof about.resumeUrl === 'string' && about.resumeUrl.startsWith('data:')) {
        const res = dataURItoBlob(about.resumeUrl);
        if (res) {
          const id = `db-media-${generateUUID()}`;
          await setIndexedDB(id, res.blob);
          about.resumeUrl = `db-media://${id}`;
          aboutMigrated = true;
          migrated = true;
        }
      }
      if (aboutMigrated) {
        localStorage.setItem(LS_KEYS.ABOUT, JSON.stringify(about));
      }
    } catch (e) {
      console.error('Error migrating about data:', e);
    }
  }

  // 3. Migrate Testimonials
  const testimonialsStr = localStorage.getItem(LS_KEYS.TESTIMONIALS);
  if (testimonialsStr) {
    try {
      const testimonials = JSON.parse(testimonialsStr) as Testimonial[];
      let testimonialsMigrated = false;
      for (const t of testimonials) {
        if (typeof t.avatar === 'string' && t.avatar.startsWith('data:')) {
          const res = dataURItoBlob(t.avatar);
          if (res) {
            const id = `db-media-${generateUUID()}`;
            await setIndexedDB(id, res.blob);
            t.avatar = `db-media://${id}`;
            testimonialsMigrated = true;
            migrated = true;
          }
        }
      }
      if (testimonialsMigrated) {
        localStorage.setItem(LS_KEYS.TESTIMONIALS, JSON.stringify(testimonials));
      }
    } catch (e) {
      console.error('Error migrating testimonials data:', e);
    }
  }

  if (migrated) {
    console.log('Successfully migrated Base64 media elements to IndexedDB!');
    window.dispatchEvent(new Event('cms-update'));
  }
}

// Seeding standard defaults to LocalStorage if empty
export const seedLocalStorageDefaults = (force = false) => {
  // CRITICAL: Supabase is the SINGLE SOURCE OF TRUTH for all portfolio/project records.
  // We NEVER seed or store portfolio items in localStorage or demo arrays.
  // Purge any legacy demo or cached portfolio records from localStorage.
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('vj_cms_portfolio');
    }
  } catch (e) {}
  if (force || !localStorage.getItem(LS_KEYS.SERVICES)) {
    setLS(LS_KEYS.SERVICES, SERVICES);
  }
  if (force || !localStorage.getItem(LS_KEYS.SKILLS)) {
    setLS(LS_KEYS.SKILLS, SKILLS);
  }
  const storedExp = localStorage.getItem(LS_KEYS.EXPERIENCE);
  if (force || !storedExp) {
    setLS(LS_KEYS.EXPERIENCE, EXPERIENCE_TIMELINE);
  } else {
    try {
      const parsedExp = JSON.parse(storedExp);
      if (Array.isArray(parsedExp) && parsedExp.some((x: any) => x.id === 'exp-1' || x.period === '2023 - Present' || x.period === '2019 - 2021')) {
        setLS(LS_KEYS.EXPERIENCE, EXPERIENCE_TIMELINE);
      }
    } catch {
      setLS(LS_KEYS.EXPERIENCE, EXPERIENCE_TIMELINE);
    }
  }
  if (force || !localStorage.getItem(LS_KEYS.TESTIMONIALS)) {
    setLS(LS_KEYS.TESTIMONIALS, TESTIMONIALS);
  }
  if (force || !localStorage.getItem(LS_KEYS.ABOUT)) {
    setLS(LS_KEYS.ABOUT, {
      name: 'Alpha Edit Studio',
      title: 'Luxury Creative & Post-Production Studio',
      bio: 'Alpha Edit Studio is a premier creative agency specializing in luxury vector branding, bespoke identity design, cinematic video post-production, and high-retention digital motion assets.',
      profileImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      resumeUrl: ''
    });
  }
  if (force || !localStorage.getItem(LS_KEYS.CONTACT)) {
    setLS(LS_KEYS.CONTACT, {
      email: 'alphaeditstudio8@gmail.com',
      phone: '+91 93434 12416',
      address: 'Indore, M.P., India'
    });
  }
  if (force || !localStorage.getItem(LS_KEYS.SOCIALS)) {
    setLS(LS_KEYS.SOCIALS, [
      { id: '1', platform: 'YouTube', url: 'https://youtube.com/@alphaeditstudio' },
      { id: '2', platform: 'Instagram', url: 'https://instagram.com/alphaeditstudio' },
      { id: '3', platform: 'LinkedIn', url: 'https://linkedin.com/company/alphaeditstudio' },
      { id: '4', platform: 'Twitter/X', url: 'https://twitter.com/alphaeditstudio' },
      { id: '5', platform: 'Behance', url: 'https://behance.net/alphaeditstudio' },
      { id: '6', platform: 'Dribbble', url: '' },
      { id: '7', platform: 'GitHub', url: '' },
      { id: '8', platform: 'TikTok', url: '' },
      { id: '9', platform: 'WhatsApp', url: 'https://wa.me/919343412416' },
      { id: '10', platform: 'Threads', url: '' },
      { id: '11', platform: 'Pinterest', url: '' },
      { id: '12', platform: 'Facebook', url: '' },
      { id: '13', platform: 'Telegram', url: '' },
      { id: '14', platform: 'Discord', url: '' },
      { id: '15', platform: 'Personal Blog', url: '' }
    ]);
  }
  if (force || !localStorage.getItem(LS_KEYS.SETTINGS)) {
    setLS(LS_KEYS.SETTINGS, {
      websiteName: 'Alpha Edit Studio',
      logoText: 'AES',
      heroTitle: 'PREMIUM POST-PRODUCTION & CREATIVE BRANDING STUDIO',
      heroSubtitle: 'Crafting high-retention cinematic edits, aesthetic brand vectors, and luxury identity systems that capture absolute attention.',
      whatsappNumber: '+91 93434 12416',
      footerText: 'Luxury post-production studio crafting original geometric vector branding structures and cinematic motion assets for global brands and creators.',
      copyrightText: '© 2026 Alpha Edit Studio. All rights reserved.',
      seoTitle: 'Alpha Edit Studio | Premium Post-Production & Branding Agency',
      seoDescription: 'Official portfolio of Alpha Edit Studio. Specializing in luxury graphic design, high-retention video editing, cinematic motion graphics, and brand identity.',
      themeColor: '#f59e0b',
      accentColor: '#eab308'
    });
  }
  if (force || !localStorage.getItem(LS_KEYS.METRICS)) {
    setLS(LS_KEYS.METRICS, {
      clientCollaborations: 'Direct',
      clientCollaborationsLabel: 'Client Collaborations',
      clientCollaborationsDesc: 'Independent creators & brands',
      projectPeriod: '2025–26',
      projectPeriodLabel: 'Creative Work',
      projectPeriodDesc: 'Post-production & branding timeline',
      studioHighlight: 'PRECISION',
      studioHighlightLabel: 'Post-Production',
      studioHighlightDesc: 'Retention-focused video & vector craft',
      projectsCompletedLabel: 'Projects Completed',
      projectsCompletedDesc: 'Published portfolio deliveries'
    });
  }
};

// Initialize the LocalStorage with static data on load
seedLocalStorageDefaults();
autoMigrateBase64ToIndexedDB().catch(err => console.error('Auto-migration failed:', err));

// DYNAMIC CMS API ROUTER (Tries Supabase first, falls back to LocalStorage)
export const api = {
  // --- PORTFOLIO ITEMS (SUPABASE SINGLE SOURCE OF TRUTH) ---
  async getPortfolioItems(): Promise<ExtendedPortfolioItem[]> {
    await initSupabaseConfig();
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        console.log('[CMS] Fetching portfolio records from Supabase as single source of truth...');
        const { data, error } = await supabase
          .from('portfolio_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[CMS] Supabase portfolio query error:', error);
          throw new Error(`Failed to load portfolio items from Supabase: ${error.message}`);
        }

        if (Array.isArray(data)) {
          console.log(`[CMS] Supabase returned ${data.length} portfolio records.`);
          const items: ExtendedPortfolioItem[] = data.map((row: any) => ({
            id: String(row.id),
            title: row.title || 'Untitled Project',
            category: row.category || 'Creative',
            subcategory: row.subcategory || row.category || 'Project',
            description: row.description || '',
            image: row.image || (Array.isArray(row.images) && row.images[0]) || '',
            images: Array.isArray(row.images) && row.images.length > 0
              ? row.images
              : (row.image ? [row.image] : []),
            tags: Array.isArray(row.tags) ? row.tags : [],
            tools: Array.isArray(row.tools) ? row.tools : [],
            client: row.client || '',
            year: String(row.year || '2025'),
            link: row.link || '',
            videoUrl: row.videoUrl || '',
            videoPlatform: row.videoPlatform || '',
            isFeatured: !!row.isFeatured,
            status: (row.status === 'Hidden' ? 'Hidden' : 'Active') as 'Active' | 'Hidden',
            price: row.price !== null && row.price !== undefined ? Number(row.price) : undefined,
            discountPrice: row.discountPrice !== null && row.discountPrice !== undefined ? Number(row.discountPrice) : undefined,
            isStartingFrom: !!row.isStartingFrom,
            customPricingText: row.customPricingText || '',
            sortOrder: row.sortOrder !== null && row.sortOrder !== undefined ? Number(row.sortOrder) : 0,
            created_at: row.created_at
          }));

          // Sort by sortOrder ascending, then created_at descending
          items.sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
          });

          return await resolveObjectMediaUrls(items);
        }
      } catch (e: any) {
        console.error('[CMS] Supabase portfolio fetch exception:', e);
        throw e;
      }
    }

    // When Supabase is not configured yet, return empty array — NEVER substitute demo or mock data
    console.warn('[CMS] Supabase is not configured yet. Returning empty portfolio list.');
    return [];
  },

  async savePortfolioItem(item: ExtendedPortfolioItem): Promise<boolean> {
    await initSupabaseConfig();
    console.log('[CMS] Saving portfolio item to Supabase:', item.id);
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Cannot save portfolio item: Supabase is not connected. Please verify your Supabase URL & Anon Key.');
    }

    // Clean and validate images
    const rawImages = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
    let coverImage = (item.image || '').trim();

    if (!coverImage && rawImages.length > 0) {
      coverImage = rawImages[0];
    }
    const consolidatedImages = rawImages.length > 0
      ? (coverImage && !rawImages.includes(coverImage) ? [coverImage, ...rawImages] : rawImages)
      : (coverImage ? [coverImage] : []);

    const projectId = (item.id || generateUUID()).trim();

    const payload = {
      id: projectId,
      title: (item.title || '').trim() || 'Untitled Project',
      category: (item.category || '').trim() || 'Creative',
      subcategory: (item.subcategory || '').trim() || item.category || 'Project',
      description: item.description || '',
      image: coverImage || (consolidatedImages[0] || ''),
      images: consolidatedImages,
      videoUrl: item.videoUrl || '',
      videoPlatform: item.videoPlatform || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      tools: Array.isArray(item.tools) ? item.tools : [],
      client: item.client || '',
      year: String(item.year || '2025'),
      link: item.link || '',
      isFeatured: !!item.isFeatured,
      status: item.status || 'Active',
      price: item.price !== undefined && item.price !== null && !isNaN(Number(item.price)) ? Number(item.price) : null,
      discountPrice: item.discountPrice !== undefined && item.discountPrice !== null && !isNaN(Number(item.discountPrice)) ? Number(item.discountPrice) : null,
      isStartingFrom: !!item.isStartingFrom,
      customPricingText: item.customPricingText || '',
      sortOrder: item.sortOrder !== undefined && item.sortOrder !== null && !isNaN(Number(item.sortOrder)) ? Number(item.sortOrder) : 0,
      created_at: item.created_at || new Date().toISOString()
    };

    const unresolvedPayload = unresolveObjectMediaUrls(payload);
    console.log('[CMS] Upserting to Supabase portfolio_items:', unresolvedPayload);

    const { error } = await supabase
      .from('portfolio_items')
      .upsert(unresolvedPayload, { onConflict: 'id' });

    if (error) {
      console.error('[CMS] Supabase save error:', error);
      throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
    }

    console.log('[CMS] Supabase project saved successfully:', projectId);

    // Clean up any stale localStorage portfolio cache
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('vj_cms_portfolio');
      }
    } catch (e) {}

    window.dispatchEvent(new Event('cms-update'));
    return true;
  },

  async deletePortfolioItem(id: string): Promise<boolean> {
    await initSupabaseConfig();
    console.log('[CMS] Deleting portfolio item from Supabase:', id);
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Cannot delete portfolio item: Supabase is not connected.');
    }

    const extractPathFromUrl = (url: string, bucket = 'portfolio-media') => {
      if (!url) return null;
      const marker = `/public/${bucket}/`;
      const index = url.indexOf(marker);
      if (index !== -1) {
        return url.substring(index + marker.length);
      }
      return null;
    };

    try {
      // 1. Fetch item to get associated media URLs
      const { data: itemToDelete } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // 2. Fetch media from all other projects so we DO NOT delete files used by other projects
      const { data: allOtherRows } = await supabase
        .from('portfolio_items')
        .select('image, images, videoUrl')
        .neq('id', id);

      const otherUrls = new Set<string>();
      if (Array.isArray(allOtherRows)) {
        allOtherRows.forEach(row => {
          if (row.image) otherUrls.add(row.image);
          if (row.videoUrl) otherUrls.add(row.videoUrl);
          if (Array.isArray(row.images)) row.images.forEach((u: string) => otherUrls.add(u));
        });
      }

      // 3. Try to delete media from storage safely
      if (itemToDelete) {
        const urlsToClean = [
          itemToDelete.image,
          itemToDelete.videoUrl,
          ...(Array.isArray(itemToDelete.images) ? itemToDelete.images : [])
        ].filter(Boolean) as string[];

        for (const url of urlsToClean) {
          if (!otherUrls.has(url)) {
            const path = extractPathFromUrl(url);
            if (path) {
              try {
                await supabase.storage.from('portfolio-media').remove([path]);
                console.log('[CMS] Cleaned unshared media from storage:', path);
              } catch (storageErr) {
                console.warn('Could not remove file from storage (continuing DB delete):', storageErr);
              }
            }
          }
        }
      }

      // 4. Delete row from database
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error(`Supabase database deletion failed: ${error.message} (Code: ${error.code})`);
      }

      // 5. Clean up any stale localStorage portfolio cache
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('vj_cms_portfolio');
        }
      } catch (e) {}

      window.dispatchEvent(new Event('cms-update'));
      return true;
    } catch (e: any) {
      console.error('Supabase delete exception:', e);
      throw e;
    }
  },

  // --- ABOUT CMS ---
  async getAbout(): Promise<AboutCMS> {
    const supabase = getSupabaseClient();
    let dataToResolve: AboutCMS;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('about_cms')
          .select('*')
          .single();
        if (!error && data) {
          dataToResolve = data as AboutCMS;
        } else {
          dataToResolve = getLS<AboutCMS>(LS_KEYS.ABOUT, {
            name: 'Alpha Edit Studio',
            title: 'Creative Agency Credentials & Capabilities',
            bio: '',
            profileImage: '',
            resumeUrl: ''
          });
        }
      } catch (e) {
        console.error('Supabase about fetch error:', e);
        dataToResolve = getLS<AboutCMS>(LS_KEYS.ABOUT, {
          name: 'Alpha Edit Studio',
          title: 'Creative Agency Credentials & Capabilities',
          bio: '',
          profileImage: '',
          resumeUrl: ''
        });
      }
    } else {
      dataToResolve = getLS<AboutCMS>(LS_KEYS.ABOUT, {
        name: 'Alpha Edit Studio',
        title: 'Creative Agency Credentials & Capabilities',
        bio: '',
        profileImage: '',
        resumeUrl: ''
      });
    }
    return await resolveObjectMediaUrls(dataToResolve);
  },

  async saveAbout(about: AboutCMS): Promise<boolean> {
    const unresolved = unresolveObjectMediaUrls(about);
    // 1. Always write to LocalStorage first to guarantee immediate local persistence & UI updates
    setLS(LS_KEYS.ABOUT, unresolved);

    // 2. Try to sync to Supabase in the background if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('about_cms')
          .upsert({ id: 'singleton', ...unresolved });
      } catch (e) {
        console.error('Supabase about save exception:', e);
      }
    }
    return true;
  },

  // --- SERVICES CMS ---
  async getServices(): Promise<Service[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('services_cms')
          .select('*');
        if (!error && data) return data as Service[];
      } catch (e) {
        console.error('Supabase services fetch exception:', e);
      }
    }
    return getLS<Service[]>(LS_KEYS.SERVICES, []);
  },

  async saveService(service: Service): Promise<boolean> {
    // 1. Always write to LocalStorage first to guarantee immediate local persistence & UI updates
    const items = getLS<Service[]>(LS_KEYS.SERVICES, []);
    const idx = items.findIndex(x => x.id === service.id);
    const updated = { ...service, id: service.id || generateUUID() };
    if (idx > -1) {
      items[idx] = updated;
    } else {
      items.push(updated);
    }
    setLS(LS_KEYS.SERVICES, items);

    // 2. Try to sync to Supabase in the background if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('services_cms')
          .upsert({
            id: updated.id,
            title: updated.title,
            icon: updated.icon,
            description: updated.description,
            items: updated.items
          });
      } catch (e) {
        console.error('Supabase service save exception:', e);
      }
    }
    return true;
  },

  async deleteService(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('services_cms')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Supabase service delete exception:', e);
      }
    }
    const items = getLS<Service[]>(LS_KEYS.SERVICES, []);
    setLS(LS_KEYS.SERVICES, items.filter(x => x.id !== id));
    return true;
  },

  // --- SKILLS CMS ---
  async getSkills(): Promise<Skill[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('skills_cms')
          .select('*');
        if (!error && data) return data as Skill[];
      } catch (e) {
        console.error('Supabase skills fetch exception:', e);
      }
    }
    return getLS<Skill[]>(LS_KEYS.SKILLS, []);
  },

  async saveSkill(skill: Skill): Promise<boolean> {
    // 1. Always write to LocalStorage first to guarantee immediate local persistence & UI updates
    const items = getLS<Skill[]>(LS_KEYS.SKILLS, []);
    const idx = items.findIndex(x => x.name === skill.name);
    if (idx > -1) {
      items[idx] = skill;
    } else {
      items.push(skill);
    }
    setLS(LS_KEYS.SKILLS, items);

    // 2. Try to sync to Supabase in the background if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('skills_cms')
          .upsert({
            id: skill.name, // using name as id for simplicity or uuid
            name: skill.name,
            level: Number(skill.level),
            category: skill.category,
            icon: skill.icon
          });
      } catch (e) {
        console.error('Supabase skill save exception:', e);
      }
    }
    return true;
  },

  async deleteSkill(name: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('skills_cms')
          .delete()
          .eq('name', name);
        if (!error) return true;
      } catch (e) {
        console.error('Supabase skill delete exception:', e);
      }
    }
    const items = getLS<Skill[]>(LS_KEYS.SKILLS, []);
    setLS(LS_KEYS.SKILLS, items.filter(x => x.name !== name));
    return true;
  },

  // --- EXPERIENCE CMS ---
  async getExperiences(): Promise<Experience[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('experience_timeline')
          .select('*')
          .order('id', { ascending: true });
        if (!error && data) return data as Experience[];
      } catch (e) {
        console.error('Supabase experiences fetch exception:', e);
      }
    }
    const local = getLS<Experience[]>(LS_KEYS.EXPERIENCE, []);
    if (local && local.length > 0) return local;
    return EXPERIENCE_TIMELINE;
  },

  async saveExperience(exp: Experience): Promise<boolean> {
    // 1. Always write to LocalStorage first to guarantee immediate local persistence & UI updates
    const items = getLS<Experience[]>(LS_KEYS.EXPERIENCE, []);
    const idx = items.findIndex(x => x.id === exp.id);
    const updated = { ...exp, id: exp.id || generateUUID() };
    if (idx > -1) {
      items[idx] = updated;
    } else {
      items.push(updated);
    }
    setLS(LS_KEYS.EXPERIENCE, items);

    // 2. Try to sync to Supabase in the background if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('experience_timeline')
          .upsert({
            id: updated.id,
            role: updated.role,
            company: updated.company,
            period: updated.period,
            description: updated.description,
            highlights: updated.highlights
          });
      } catch (e) {
        console.error('Supabase experience save exception:', e);
      }
    }
    return true;
  },

  async deleteExperience(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('experience_timeline')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Supabase experience delete exception:', e);
      }
    }
    const items = getLS<Experience[]>(LS_KEYS.EXPERIENCE, []);
    setLS(LS_KEYS.EXPERIENCE, items.filter(x => x.id !== id));
    return true;
  },

  // --- TESTIMONIALS CMS ---
  async getTestimonials(): Promise<Testimonial[]> {
    const supabase = getSupabaseClient();
    let dataToResolve: Testimonial[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*');
        if (!error && data) {
          dataToResolve = data as Testimonial[];
        } else {
          dataToResolve = getLS<Testimonial[]>(LS_KEYS.TESTIMONIALS, []);
        }
      } catch (e) {
        console.error('Supabase testimonials fetch exception:', e);
        dataToResolve = getLS<Testimonial[]>(LS_KEYS.TESTIMONIALS, []);
      }
    } else {
      dataToResolve = getLS<Testimonial[]>(LS_KEYS.TESTIMONIALS, []);
    }
    return await resolveObjectMediaUrls(dataToResolve);
  },

  async saveTestimonial(test: Testimonial): Promise<boolean> {
    const unresolved = unresolveObjectMediaUrls(test);
    // 1. Always write to LocalStorage first to guarantee immediate local persistence & UI updates
    const items = getLS<Testimonial[]>(LS_KEYS.TESTIMONIALS, []).map(x => unresolveObjectMediaUrls(x));
    const idx = items.findIndex(x => x.id === unresolved.id);
    if (idx > -1) {
      items[idx] = unresolved;
    } else {
      items.push(unresolved);
    }
    setLS(LS_KEYS.TESTIMONIALS, items);

    // 2. Try to sync to Supabase in the background if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('testimonials')
          .upsert({
            id: unresolved.id,
            name: unresolved.name,
            role: unresolved.role,
            company: unresolved.company,
            comment: unresolved.comment,
            rating: Number(unresolved.rating),
            avatar: unresolved.avatar
          });
      } catch (e) {
        console.error('Supabase testimonial save exception:', e);
      }
    }
    return true;
  },

  async deleteTestimonial(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('testimonials')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Supabase testimonial delete exception:', e);
      }
    }
    const items = getLS<Testimonial[]>(LS_KEYS.TESTIMONIALS, []);
    setLS(LS_KEYS.TESTIMONIALS, items.filter(x => x.id !== id));
    return true;
  },

  // --- CONTACT INFO CMS ---
  async getContact(): Promise<ContactCMS> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('contact_cms')
          .select('*')
          .single();
        if (!error && data) return data as ContactCMS;
      } catch (e) {
        console.error('Supabase contact fetch error:', e);
      }
    }
    return getLS<ContactCMS>(LS_KEYS.CONTACT, {
      email: 'alphaeditstudio8@gmail.com',
      phone: '+91 93434 12416',
      address: 'Indore, M.P., India'
    });
  },

  async saveContact(contact: ContactCMS): Promise<boolean> {
    // 1. Always write to LocalStorage first to guarantee immediate local persistence & UI updates
    setLS(LS_KEYS.CONTACT, contact);

    // 2. Try to sync to Supabase in the background if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('contact_cms')
          .upsert({ id: 'singleton', ...contact });
      } catch (e) {
        console.error('Supabase contact save exception:', e);
      }
    }
    return true;
  },

  // --- SETTINGS CMS ---
  async getSettings(): Promise<SettingsCMS> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('settings_cms')
          .select('*')
          .single();
        if (!error && data) return data as SettingsCMS;
      } catch (e) {
        console.error('Supabase settings fetch error:', e);
      }
    }
    return getLS<SettingsCMS>(LS_KEYS.SETTINGS, {
      websiteName: 'Alpha Edit Studio',
      logoText: 'AES',
      heroTitle: 'PREMIUM POST-PRODUCTION & CREATIVE BRANDING STUDIO',
      heroSubtitle: 'Crafting high-retention cinematic edits, aesthetic brand vectors, and luxury identity systems that capture absolute attention.',
      whatsappNumber: '+91 93434 12416',
      footerText: 'Luxury post-production studio crafting original geometric vector branding structures and cinematic motion assets for global brands and creators.',
      copyrightText: '© 2026 Alpha Edit Studio. All rights reserved.',
      seoTitle: 'Alpha Edit Studio | Premium Post-Production & Branding Agency',
      seoDescription: 'Official portfolio of Alpha Edit Studio. Specializing in luxury graphic design, high-retention video editing, cinematic motion graphics, and brand identity.',
      themeColor: '#f59e0b',
      accentColor: '#eab308'
    });
  },

  async saveSettings(settings: SettingsCMS): Promise<boolean> {
    // 1. Always write to LocalStorage first to guarantee immediate local persistence & UI updates
    setLS(LS_KEYS.SETTINGS, settings);

    // 2. Try to sync to Supabase in the background if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('settings_cms')
          .upsert({ id: 'singleton', ...settings });
      } catch (e) {
        console.error('Supabase settings save exception:', e);
      }
    }
    return true;
  },

  // --- STUDIO METRICS CMS ---
  async getStudioMetrics(): Promise<StudioMetricsCMS> {
    const defaultMetrics: StudioMetricsCMS = {
      clientCollaborations: 'Direct',
      clientCollaborationsLabel: 'Client Collaborations',
      clientCollaborationsDesc: 'Independent creators & brands',
      projectPeriod: '2025–26',
      projectPeriodLabel: 'Creative Work',
      projectPeriodDesc: 'Post-production & branding timeline',
      studioHighlight: 'PRECISION',
      studioHighlightLabel: 'Post-Production',
      studioHighlightDesc: 'Retention-focused video & vector craft',
      projectsCompletedLabel: 'Projects Completed',
      projectsCompletedDesc: 'Published portfolio deliveries'
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('studio_metrics')
          .select('*')
          .single();
        if (!error && data) {
          return {
            clientCollaborations: data.clientCollaborations ?? defaultMetrics.clientCollaborations,
            clientCollaborationsLabel: data.clientCollaborationsLabel ?? defaultMetrics.clientCollaborationsLabel,
            clientCollaborationsDesc: data.clientCollaborationsDesc ?? defaultMetrics.clientCollaborationsDesc,
            projectPeriod: data.projectPeriod ?? defaultMetrics.projectPeriod,
            projectPeriodLabel: data.projectPeriodLabel ?? defaultMetrics.projectPeriodLabel,
            projectPeriodDesc: data.projectPeriodDesc ?? defaultMetrics.projectPeriodDesc,
            studioHighlight: data.studioHighlight ?? defaultMetrics.studioHighlight,
            studioHighlightLabel: data.studioHighlightLabel ?? defaultMetrics.studioHighlightLabel,
            studioHighlightDesc: data.studioHighlightDesc ?? defaultMetrics.studioHighlightDesc,
            projectsCompletedLabel: data.projectsCompletedLabel ?? defaultMetrics.projectsCompletedLabel,
            projectsCompletedDesc: data.projectsCompletedDesc ?? defaultMetrics.projectsCompletedDesc
          };
        }
      } catch (e) {
        // Table might not exist yet in Supabase instance
      }
    }
    return getLS<StudioMetricsCMS>(LS_KEYS.METRICS, defaultMetrics);
  },

  async saveStudioMetrics(metrics: StudioMetricsCMS): Promise<boolean> {
    setLS(LS_KEYS.METRICS, metrics);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('studio_metrics')
          .upsert({ id: 'singleton', ...metrics });
      } catch (e) {
        console.warn('Supabase studio_metrics save warning:', e);
      }
    }
    window.dispatchEvent(new Event('cms-update'));
    return true;
  },

  async getLiveProjectMetrics(): Promise<LiveProjectMetrics> {
    await initSupabaseConfig();
    const supabase = getSupabaseClient();
    let itemsToProcess: ExtendedPortfolioItem[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('portfolio_items')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          itemsToProcess = data as ExtendedPortfolioItem[];
        }
      } catch (e) {
        console.warn('Supabase live project metrics fetch error:', e);
      }
    }

    // Exclude any hardcoded or demo projects
    const realProjects = itemsToProcess.filter(p => !isDemoProject(p));

    // Count only published/active portfolio records
    const publishedRealProjects = realProjects.filter(
      p => !p.status || p.status === 'Active'
    );

    // Extract unique non-empty creative categories from published real items
    const categoriesSet = new Set<string>();
    publishedRealProjects.forEach(p => {
      if (p.category && typeof p.category === 'string' && p.category.trim()) {
        categoriesSet.add(p.category.trim());
      }
    });

    const creativeCategories = Array.from(categoriesSet);

    return {
      publishedCount: publishedRealProjects.length,
      totalRealCount: realProjects.length,
      creativeCategories,
      categoriesCount: creativeCategories.length,
      hasRealProjects: realProjects.length > 0
    };
  },
  async getSocials(): Promise<SocialLinkCMS[]> {
    const DEFAULT_PLATFORMS = [
      { platform: 'YouTube', defaultUrl: 'https://youtube.com/@alphaeditstudio' },
      { platform: 'Instagram', defaultUrl: 'https://instagram.com/alphaeditstudio' },
      { platform: 'LinkedIn', defaultUrl: 'https://linkedin.com/company/alphaeditstudio' },
      { platform: 'Twitter/X', defaultUrl: 'https://twitter.com/alphaeditstudio' },
      { platform: 'Behance', defaultUrl: 'https://behance.net/alphaeditstudio' },
      { platform: 'Dribbble', defaultUrl: '' },
      { platform: 'GitHub', defaultUrl: '' },
      { platform: 'TikTok', defaultUrl: '' },
      { platform: 'WhatsApp', defaultUrl: 'https://wa.me/919343412416' },
      { platform: 'Threads', defaultUrl: '' },
      { platform: 'Pinterest', defaultUrl: '' },
      { platform: 'Facebook', defaultUrl: '' },
      { platform: 'Telegram', defaultUrl: '' },
      { platform: 'Discord', defaultUrl: '' },
      { platform: 'Portfolio Website', defaultUrl: '' },
      { platform: 'Email', defaultUrl: 'alphaeditstudio8@gmail.com' },
      { platform: 'Phone', defaultUrl: '+91 93434 12416' },
      { platform: 'Location', defaultUrl: 'Indore, M.P., India' }
    ];

    let itemsToReturn: SocialLinkCMS[] = [];

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('social_links')
          .select('*');
        if (!error && data) {
          itemsToReturn = data as SocialLinkCMS[];
        }
      } catch (e) {
        console.error('Supabase socials fetch exception:', e);
      }
    }

    if (itemsToReturn.length === 0) {
      itemsToReturn = getLS<SocialLinkCMS[]>(LS_KEYS.SOCIALS, []);
    }

    // Merge any missing platforms to support the complete set of platforms
    let changed = false;
    DEFAULT_PLATFORMS.forEach((def) => {
      const exists = itemsToReturn.some(x => x.platform.toLowerCase() === def.platform.toLowerCase());
      if (!exists) {
        itemsToReturn.push({
          id: String(itemsToReturn.length + 1),
          platform: def.platform,
          url: def.defaultUrl
        });
        changed = true;
      }
    });

    if (changed || !localStorage.getItem(LS_KEYS.SOCIALS)) {
      setLS(LS_KEYS.SOCIALS, itemsToReturn);
    }

    return itemsToReturn;
  },

  async saveSocials(socials: SocialLinkCMS[]): Promise<boolean> {
    // 1. Always save to local storage first
    setLS(LS_KEYS.SOCIALS, socials);

    // 2. Synchronize to Supabase if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const currentIds = socials.map(s => s.id).filter(id => id && !id.startsWith('temp-'));
        if (currentIds.length > 0) {
          await supabase.from('social_links').delete().not('id', 'in', `(${currentIds.join(',')})`);
        } else {
          await supabase.from('social_links').delete().neq('id', '0');
        }

        for (const soc of socials) {
          // If ID is temporary/empty, create a clean numeric or string ID
          const cleanId = !soc.id || soc.id.startsWith('temp-') ? String(Date.now() + Math.floor(Math.random() * 1000)) : soc.id;
          await supabase.from('social_links').upsert({
            id: cleanId,
            platform: soc.platform,
            url: soc.url
          });
        }
      } catch (e) {
        console.error('Supabase socials save exception:', e);
      }
    }
    return true;
  },

  // --- STORAGE MEDIA UPLOAD ---
  async uploadFile(file: File, bucket = 'portfolio-media'): Promise<string> {
    await initSupabaseConfig();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const cleanOriginal = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanOriginal}`;
        const filePath = `${fileName}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || undefined
          });

        if (error) {
          console.error('Supabase storage upload error:', error);
          throw new Error(`Storage upload failed: ${error.message} (bucket: ${bucket})`);
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        if (!data?.publicUrl) {
          throw new Error('Supabase storage upload succeeded, but failed to retrieve public URL.');
        }
        return data.publicUrl;
      } catch (e: any) {
        console.error('Supabase storage upload exception:', e);
        throw e;
      }
    }

    throw new Error('Cannot upload image: Supabase is not connected. Please verify your Supabase URL & Anon Key in the Admin Panel so media is uploaded centrally to Supabase Storage.');
  },

  async deleteFile(url: string, bucket = 'resumes'): Promise<boolean> {
    if (!url) return false;
    const unresolvedUrl = unresolveMediaUrl(url);

    if (unresolvedUrl.startsWith('db-media://')) {
      const id = unresolvedUrl.replace('db-media://', '');
      await deleteIndexedDB(id);
      return true;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const marker = `/public/${bucket}/`;
        const index = unresolvedUrl.indexOf(marker);
        if (index !== -1) {
          const path = unresolvedUrl.substring(index + marker.length);
          const { error } = await supabase.storage.from(bucket).remove([path]);
          if (error) {
            console.error('Supabase storage delete error:', error);
            return false;
          }
          return true;
        }
      } catch (e) {
        console.error('Supabase storage delete exception:', e);
      }
    }
    return false;
  },

  // --- BULK SEED TO SUPABASE UTILITY ---
  async seedSupabase(): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: 'Supabase is not configured yet. Please configure credentials first.' };
    }

    try {
      // 1. Seed About
      const localAbout = getLS<AboutCMS>(LS_KEYS.ABOUT, {} as AboutCMS);
      if (localAbout.name) {
        await supabase.from('about_cms').upsert({ id: 'singleton', ...localAbout });
      }

      // 2. Seed Contact
      const localContact = getLS<ContactCMS>(LS_KEYS.CONTACT, {} as ContactCMS);
      if (localContact.email) {
        await supabase.from('contact_cms').upsert({ id: 'singleton', ...localContact });
      }

      // Note: Portfolio Items are NOT seeded from local storage.
      // Supabase portfolio_items is the sole single source of truth and must never be overwritten from client state.

      // 3. Seed Services
      const localServices = getLS<Service[]>(LS_KEYS.SERVICES, []);
      for (const s of localServices) {
        await supabase.from('services_cms').upsert({
          id: s.id,
          title: s.title,
          icon: s.icon,
          description: s.description,
          items: s.items
        });
      }

      // 5. Seed Skills
      const localSkills = getLS<Skill[]>(LS_KEYS.SKILLS, []);
      for (const sk of localSkills) {
        await supabase.from('skills_cms').upsert({
          id: sk.name,
          name: sk.name,
          level: sk.level,
          category: sk.category,
          icon: sk.icon
        });
      }

      // 6. Seed Experiences
      const localExps = getLS<Experience[]>(LS_KEYS.EXPERIENCE, []);
      for (const exp of localExps) {
        await supabase.from('experience_timeline').upsert({
          id: exp.id,
          role: exp.role,
          company: exp.company,
          period: exp.period,
          description: exp.description,
          highlights: exp.highlights
        });
      }

      // 7. Seed Testimonials
      const localTests = getLS<Testimonial[]>(LS_KEYS.TESTIMONIALS, []);
      for (const test of localTests) {
        await supabase.from('testimonials').upsert({
          id: test.id,
          name: test.name,
          role: test.role,
          company: test.company,
          comment: test.comment,
          rating: test.rating,
          avatar: test.avatar
        });
      }

      // 8. Seed Social Links
      const localSocials = getLS<SocialLinkCMS[]>(LS_KEYS.SOCIALS, []);
      for (const soc of localSocials) {
        await supabase.from('social_links').upsert({
          id: soc.id,
          platform: soc.platform,
          url: soc.url
        });
      }

      // 9. Seed Settings CMS
      const localSettings = getLS<SettingsCMS>(LS_KEYS.SETTINGS, {} as SettingsCMS);
      if (localSettings && localSettings.websiteName) {
        await supabase.from('settings_cms').upsert({
          id: 'singleton',
          ...localSettings
        });
      }

      return { success: true, message: 'All portfolio data and schemas successfully synchronized to your Supabase project!' };
    } catch (e: any) {
      console.error('Error during Supabase seeding:', e);
      return { success: false, message: `Sync failed: ${e.message || 'Check database permissions or schemas.'}` };
    }
  }
};
