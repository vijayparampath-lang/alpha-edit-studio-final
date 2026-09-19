import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, LayoutGrid, Palette, Video, Sparkles, User, Settings, Database, 
  Plus, Edit2, Trash2, Search, Filter, ArrowLeft, LogOut, Check, X, 
  Upload, Image as ImageIcon, Film, FileText, Globe, Tag, Calendar, 
  PlusCircle, RefreshCw, MessageSquare, Briefcase, ExternalLink, ShieldCheck, HelpCircle, ChevronRight, ChevronLeft,
  Eye, EyeOff, Menu, BarChart3, Activity, Layers, CheckCircle, Award,
  Star, FolderPlus, Link as LinkIcon
} from 'lucide-react';
import { 
  api, ExtendedPortfolioItem, AboutCMS, ContactCMS, SocialLinkCMS, 
  isSupabaseConfigured, SettingsCMS, StudioMetricsCMS, LiveProjectMetrics, 
  subscribeToPortfolioChanges, initSupabaseConfig, saveCentralSupabaseConfig, getSupabaseConfig 
} from '../lib/supabase';
import { Service, Skill, Experience, Testimonial } from '../types';
import finalLogo from '../assets/images/final-logo.jpg';

interface AdminDashboardProps {
  onClose: () => void;
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'portfolio' | 'metrics' | 'about' | 'services' | 'skills' | 'experience' | 'testimonials' | 'contact' | 'supabase' | 'settings'>('portfolio');

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Data States
  const [portfolioItems, setPortfolioItems] = useState<ExtendedPortfolioItem[]>([]);
  const [aboutCMS, setAboutCMS] = useState<AboutCMS>({ name: '', title: '', bio: '', profileImage: '', resumeUrl: '' });
  const [services, setServices] = useState<Service[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [contact, setContact] = useState<ContactCMS>({ email: '', phone: '', address: '' });
  const [socials, setSocials] = useState<SocialLinkCMS[]>([]);
  const [settingsCMS, setSettingsCMS] = useState<SettingsCMS>({
    websiteName: 'Alpha Edit Studio',
    logoText: 'AES',
    heroTitle: 'PREMIUM GRAPHIC DESIGN & CINEMATIC VIDEO EDITING AGENCY',
    heroSubtitle: 'Crafting high-retention vertical videos, aesthetic brand vectors, and luxury identity systems that capture absolute attention.',
    whatsappNumber: '+91 93434 12416',
    footerText: 'Alpha Edit Studio is an elite visual production studio crafting original vector branding structures, high-impact motion graphics, and cinematic video edits globally.',
    copyrightText: '© 2026 Alpha Edit Studio. All rights reserved.',
    seoTitle: 'Alpha Edit Studio | Premium Video Editing & Branding Agency',
    seoDescription: 'Alpha Edit Studio - Creative agency specializing in video editing, graphic design, motion graphics, and brand identity.',
    themeColor: '#f59e0b',
    accentColor: '#eab308'
  });
  const [studioMetrics, setStudioMetrics] = useState<StudioMetricsCMS>({
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
  const [liveProjectMetrics, setLiveProjectMetrics] = useState<LiveProjectMetrics>({
    publishedCount: 0,
    totalRealCount: 0,
    creativeCategories: [],
    categoriesCount: 0,
    hasRealProjects: false
  });

  // Portfolio list controls
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Supabase Config States
  const [sbUrl, setSbUrl] = useState(() => {
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('vj-supabase-url') : '';
    const env = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
    return (ls || env || '').trim();
  });
  const [sbAnonKey, setSbAnonKey] = useState(() => {
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('vj-supabase-anon-key') : '';
    const env = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';
    return (ls || env || '').trim();
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Edit/Add Modals State
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'portfolio' | 'service' | 'skill' | 'experience' | 'testimonial' | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type?: 'portfolio' | 'service' | 'skill' | 'experience' | 'testimonial' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Media upload references
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const coverUploadRef = useRef<HTMLInputElement>(null);
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const resumeUploadRef = useRef<HTMLInputElement>(null);
  const [resumeUploadProgress, setResumeUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [galleryUrlInput, setGalleryUrlInput] = useState<string>('');

  // Pre-configured options
  const categories = ['Logo Design', 'Social Media', 'Posters', 'Branding', 'Video Editing', 'Reels', 'Motion Graphics', 'UI Design'];
  const skillCategories = ['Design', 'Video', 'Branding', 'Other'];

  // Check initial authentication and sync central Supabase config
  useEffect(() => {
    const isAuth = sessionStorage.getItem('vj-admin-authenticated') === 'true';
    if (isAuth) {
      setIsAuthenticated(true);
    }
    initSupabaseConfig().then(cfg => {
      if (cfg.url) setSbUrl(cfg.url);
      if (cfg.key) setSbAnonKey(cfg.key);
    });
  }, []);

  // Fetch all CMS data when authenticated, subscribe to real-time changes, and handle tab visibility
  useEffect(() => {
    if (isAuthenticated) {
      fetchCMSData();
      const unsubscribe = subscribeToPortfolioChanges(() => {
        fetchCMSData();
      });

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchCMSData();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isAuthenticated]);

  const fetchCMSData = async () => {
    setIsLoading(true);
    try {
      const [pData, aData, sData, skData, eData, tData, cData, socData, setSData, metData, liveMData] = await Promise.all([
        api.getPortfolioItems(),
        api.getAbout(),
        api.getServices(),
        api.getSkills(),
        api.getExperiences(),
        api.getTestimonials(),
        api.getContact(),
        api.getSocials(),
        api.getSettings(),
        api.getStudioMetrics(),
        api.getLiveProjectMetrics()
      ]);

      setPortfolioItems(pData);
      setAboutCMS(aData);
      setServices(sData);
      setSkills(skData);
      setExperiences(eData);
      setTestimonials(tData);
      setContact(cData);
      setSocials(socData);
      setSettingsCMS(setSData);
      setStudioMetrics(metData);
      setLiveProjectMetrics(liveMData);
    } catch (e) {
      console.error('Error fetching CMS data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setSaveMessage({ text, type });
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envUser = import.meta.env.VITE_ADMIN_USER || 'alphaeditstudio8@gmail.com';
    const envPass = import.meta.env.VITE_ADMIN_PASS || 'adminpassword';

    if (username === envUser && password === envPass) {
      setIsAuthenticated(true);
      sessionStorage.setItem('vj-admin-authenticated', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid credentials. Please verify your admin username and password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('vj-admin-authenticated');
    window.history.pushState(null, '', '/');
    window.location.hash = '';
    onClose();
  };

  const handleClose = () => {
    window.history.pushState(null, '', '/');
    window.location.hash = '';
    onClose();
  };

  // --- SAVE ABOUT SECTION ---
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await api.saveAbout(aboutCMS);
      if (success) {
        showToast('About CMS details successfully updated!');
      } else {
        showToast('Error saving About section details.', 'error');
      }
    } catch (e) {
      showToast('An error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveResume = async () => {
    const oldResumeUrl = aboutCMS.resumeUrl;
    const updatedAbout = { ...aboutCMS, resumeUrl: '', resumeFileName: '' };
    setAboutCMS(updatedAbout);
    setIsSaving(true);
    try {
      if (oldResumeUrl) {
        try {
          await api.deleteFile(oldResumeUrl, 'resumes');
        } catch (delErr) {
          console.error('Failed to delete resume from storage:', delErr);
        }
      }
      const success = await api.saveAbout(updatedAbout);
      if (success) {
        showToast('Resume removed successfully!');
        window.dispatchEvent(new Event('cms-update'));
      } else {
        showToast('Failed to save updated biography segment.', 'error');
      }
    } catch (e) {
      showToast('Error removing resume.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE STUDIO METRICS ---
  const handleSaveStudioMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await api.saveStudioMetrics(studioMetrics);
      if (success) {
        showToast('Studio metrics saved and published successfully!');
        const updatedLive = await api.getLiveProjectMetrics();
        setLiveProjectMetrics(updatedLive);
      } else {
        showToast('Failed to save metrics. Please check connection.', 'error');
      }
    } catch (err) {
      showToast('An error occurred while saving metrics.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE SETTINGS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await api.saveSettings(settingsCMS);
      if (success) {
        showToast('Central settings successfully updated!');
        window.dispatchEvent(new Event('cms-update'));
      } else {
        showToast('Error saving settings.', 'error');
      }
    } catch (e) {
      showToast('An error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE CONTACT & SOCIALS ---
  const handleSaveContactAndSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const contactSuccess = await api.saveContact(contact);
      const socialsSuccess = await api.saveSocials(socials);
      if (contactSuccess && socialsSuccess) {
        showToast('Contact and social linkages successfully synchronized!');
        fetchCMSData();
        window.dispatchEvent(new Event('cms-update'));
      } else {
        showToast('Sync completed with some connection anomalies.', 'error');
      }
    } catch (e) {
      showToast('An error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE PORTFOLIO ITEM ---
  const handleSavePortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    console.log('handleSavePortfolioItem: Saving activeItem:', activeItem);
    try {
      if (!activeItem) {
        throw new Error('No active portfolio item to save.');
      }
      if (!activeItem.id) {
        throw new Error('Project Unique ID is required.');
      }
      if (!activeItem.title) {
        throw new Error('Project Name/Title is required.');
      }
      const success = await api.savePortfolioItem(activeItem);
      console.log('handleSavePortfolioItem: savePortfolioItem returned:', success);
      if (success) {
        showToast(`Project "${activeItem.title}" successfully saved!`);
        setModalType(null);
        fetchCMSData();
        window.dispatchEvent(new Event('cms-update'));
      } else {
        showToast('Failed to save project item.', 'error');
      }
    } catch (err: any) {
      console.error('handleSavePortfolioItem error:', err);
      showToast(`Error saving portfolio item: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const safeConfirm = (message: string): boolean => {
    try {
      return window.confirm(message);
    } catch (e) {
      console.warn('confirm() blocked or failed in sandbox iframe, bypassing:', e);
      return true;
    }
  };

  // --- TOGGLE PORTFOLIO ITEM VISIBILITY ---
  const handleTogglePortfolioItemVisibility = async (item: ExtendedPortfolioItem) => {
    setIsSaving(true);
    try {
      const updatedStatus = (item.status === 'Active' || !item.status) ? 'Hidden' : 'Active';
      const updatedItem: ExtendedPortfolioItem = {
        ...item,
        status: updatedStatus
      };
      const success = await api.savePortfolioItem(updatedItem);
      if (success) {
        showToast(`Project "${item.title}" is now ${updatedStatus}.`);
        fetchCMSData();
        // Notify other components (like PortfolioGrid) to update
        window.dispatchEvent(new Event('cms-update'));
      } else {
        showToast('Failed to update visibility.', 'error');
      }
    } catch (e) {
      showToast('Error toggling visibility.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- DELETE HANDLERS ---
  const handleDeletePortfolioItem = (id: string, name: string) => {
    setItemToDelete({ id, name, type: 'portfolio' });
  };

  const handleDeleteService = (id: string, title: string) => {
    setItemToDelete({ id, name: title, type: 'service' });
  };

  const handleDeleteSkill = (name: string) => {
    setItemToDelete({ id: name, name, type: 'skill' });
  };

  const handleDeleteExperience = (id: string, role: string) => {
    setItemToDelete({ id, name: role, type: 'experience' });
  };

  const handleDeleteTestimonial = (id: string, author: string) => {
    setItemToDelete({ id, name: author, type: 'testimonial' });
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (itemToDelete.type === 'portfolio' || !itemToDelete.type) {
        const success = await api.deletePortfolioItem(itemToDelete.id);
        if (success) {
          showToast(`Project "${itemToDelete.name}" successfully deleted.`);
          setItemToDelete(null);
          await fetchCMSData();
          window.dispatchEvent(new Event('cms-update'));
        } else {
          showToast('Failed to delete item.', 'error');
        }
      } else if (itemToDelete.type === 'service') {
        await api.deleteService(itemToDelete.id);
        showToast(`Service deleted.`);
        setItemToDelete(null);
        await fetchCMSData();
      } else if (itemToDelete.type === 'skill') {
        await api.deleteSkill(itemToDelete.id);
        showToast(`Skill deleted.`);
        setItemToDelete(null);
        await fetchCMSData();
      } else if (itemToDelete.type === 'experience') {
        await api.deleteExperience(itemToDelete.id);
        showToast(`Milestone deleted.`);
        setItemToDelete(null);
        await fetchCMSData();
      } else if (itemToDelete.type === 'testimonial') {
        await api.deleteTestimonial(itemToDelete.id);
        showToast(`Testimonial deleted.`);
        setItemToDelete(null);
        await fetchCMSData();
      }
    } catch (err: any) {
      console.error('Error during deletion:', err);
      showToast(`Error deleting item: ${err?.message || err}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- SAVE SERVICE ---
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await api.saveService(activeItem);
      if (success) {
        showToast(`Service "${activeItem.title}" successfully saved!`);
        setModalType(null);
        fetchCMSData();
      }
    } catch (e) {
      showToast('Error saving service.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE SKILL ---
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await api.saveSkill(activeItem);
      if (success) {
        showToast(`Skill "${activeItem.name}" saved!`);
        setModalType(null);
        fetchCMSData();
      }
    } catch (e) {
      showToast('Error saving skill.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE EXPERIENCE ---
  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await api.saveExperience(activeItem);
      if (success) {
        showToast('Experience milestone saved!');
        setModalType(null);
        fetchCMSData();
      }
    } catch (e) {
      showToast('Error saving milestone.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE TESTIMONIAL ---
  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await api.saveTestimonial(activeItem);
      if (success) {
        showToast('Testimonial record updated!');
        setModalType(null);
        fetchCMSData();
      }
    } catch (e) {
      showToast('Error saving testimonial.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- SUPABASE SETUP SYNC ---
  const handleSaveSupabaseConfig = async () => {
    setIsSaving(true);
    try {
      if (sbUrl && sbAnonKey) {
        await saveCentralSupabaseConfig(sbUrl.trim(), sbAnonKey.trim());
        showToast('Supabase connection parameters saved centrally across all devices!');
        await fetchCMSData();
      } else {
        await saveCentralSupabaseConfig('', '');
        showToast('Supabase credentials cleared across devices.', 'error');
        await fetchCMSData();
      }
    } catch (e: any) {
      showToast(`Error saving Supabase config: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncToSupabase = async () => {
    if (!sbUrl || !sbAnonKey) {
      showToast('Please insert valid Supabase URL & Anon Key first.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const result = await api.seedSupabase();
      if (result.success) {
        showToast(result.message);
        fetchCMSData();
      } else {
        showToast(result.message, 'error');
      }
    } catch (e: any) {
      showToast(`Sync exception: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // --- FILE MEDIA UPLOADS ---
  const triggerFileUpload = (type: 'image' | 'video' | 'resume') => {
    if (type === 'image' && imageUploadRef.current) imageUploadRef.current.click();
    if (type === 'video' && videoUploadRef.current) videoUploadRef.current.click();
    if (type === 'resume' && resumeUploadRef.current) resumeUploadRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'resume') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation
    if (type === 'resume') {
      if (file.type !== 'application/pdf') {
        showToast('Invalid format: resume file must be a PDF document.', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        showToast('File too large: maximum size for PDF resume is 10MB.', 'error');
        e.target.value = '';
        return;
      }
    } else if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        showToast('Invalid format: file must be an image.', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        showToast('Image file too large: maximum size is 5MB.', 'error');
        e.target.value = '';
        return;
      }
    } else if (type === 'video') {
      if (!file.type.startsWith('video/')) {
        showToast('Invalid format: file must be a video file.', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 25 * 1024 * 1024) { // 25MB
        showToast('Video file too large: maximum size is 25MB.', 'error');
        e.target.value = '';
        return;
      }
    }

    setIsSaving(true);
    let interval: any = null;
    if (type === 'resume') {
      setResumeUploadProgress(10);
      let progress = 10;
      interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress > 90) {
          progress = 90;
        }
        setResumeUploadProgress(progress);
      }, 150);
    }
    showToast(`Uploading ${file.name}... Please wait.`);
    try {
      const publicUrl = await api.uploadFile(file, type === 'resume' ? 'resumes' : 'portfolio-media');
      if (publicUrl) {
        if (type === 'resume') {
          if (interval) clearInterval(interval);
          setResumeUploadProgress(100);
          setTimeout(() => setResumeUploadProgress(null), 1000);
        }
        showToast(`Upload completed successfully!`);
        if (type === 'image') {
          if (modalType === 'portfolio') {
            setActiveItem((prev: any) => ({
              ...prev,
              image: publicUrl,
              images: prev.images ? [...prev.images, publicUrl] : [publicUrl]
            }));
          } else if (modalType === 'testimonial') {
            setActiveItem((prev: any) => ({ ...prev, avatar: publicUrl }));
          } else {
            // General Profile Image for About CMS - Save immediately
            const updatedAbout = { ...aboutCMS, profileImage: publicUrl };
            setAboutCMS(updatedAbout);
            await api.saveAbout(updatedAbout);
            showToast('Profile image updated successfully!');
            window.dispatchEvent(new Event('cms-update'));
          }
        } else if (type === 'video') {
          if (modalType === 'portfolio') {
            setActiveItem((prev: any) => ({ ...prev, videoUrl: publicUrl }));
          }
        } else if (type === 'resume') {
          // Delete old resume file first if exists to keep only 1 PDF in storage
          const oldResumeUrl = aboutCMS.resumeUrl;
          if (oldResumeUrl) {
            try {
              await api.deleteFile(oldResumeUrl, 'resumes');
            } catch (delErr) {
              console.error('Failed to delete old resume from storage:', delErr);
            }
          }
          // Resume PDF - Save immediately with file name
          const updatedAbout = { ...aboutCMS, resumeUrl: publicUrl, resumeFileName: file.name };
          setAboutCMS(updatedAbout);
          await api.saveAbout(updatedAbout);
          showToast('Resume saved successfully!');
          window.dispatchEvent(new Event('cms-update'));
        }
      } else {
        if (type === 'resume') {
          if (interval) clearInterval(interval);
          setResumeUploadProgress(null);
        }
        showToast('Upload failed. Using local fallback file representation.', 'error');
      }
    } catch (err) {
      if (type === 'resume') {
        if (interval) clearInterval(interval);
        setResumeUploadProgress(null);
      }
      showToast('Error uploading file.', 'error');
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  // --- SPECIALIZED COVER & GALLERY UPLOADS FOR PORTFOLIO CMS ---
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid format: Cover file must be an image.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image too large: maximum size is 8MB.', 'error');
      e.target.value = '';
      return;
    }

    setIsSaving(true);
    setUploadStatus(`Uploading cover image: ${file.name}...`);
    try {
      const publicUrl = await api.uploadFile(file, 'portfolio-media');
      if (publicUrl) {
        setActiveItem((prev: any) => {
          const currentImages = Array.isArray(prev.images) && prev.images.length > 0 
            ? [...prev.images] 
            : (prev.image ? [prev.image] : []);
          
          // Place the new cover at the top of the gallery if not already present
          const updatedGallery = currentImages.includes(publicUrl) 
            ? currentImages 
            : [publicUrl, ...currentImages];

          return {
            ...prev,
            image: publicUrl,
            images: updatedGallery
          };
        });
        showToast('Cover image uploaded successfully!');
      }
    } catch (err: any) {
      console.error('Cover upload error:', err);
      showToast(`Cover upload failed: ${err?.message || 'Storage error'}`, 'error');
    } finally {
      setIsSaving(false);
      setUploadStatus(null);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    // Validate files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showToast(`Invalid file "${file.name}": only images are allowed.`, 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showToast(`File "${file.name}" is too large: maximum size is 8MB per image.`, 'error');
        e.target.value = '';
        return;
      }
    }

    setIsSaving(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Uploading image ${i + 1} of ${files.length} (${file.name})...`);
        const publicUrl = await api.uploadFile(file, 'portfolio-media');
        if (publicUrl) {
          newUrls.push(publicUrl);
        }
      }

      if (newUrls.length > 0) {
        setActiveItem((prev: any) => {
          const existingImages = Array.isArray(prev.images) && prev.images.length > 0
            ? [...prev.images]
            : (prev.image ? [prev.image] : []);

          const merged = [...existingImages];
          for (const u of newUrls) {
            if (!merged.includes(u)) {
              merged.push(u);
            }
          }

          return {
            ...prev,
            image: prev.image || merged[0] || newUrls[0],
            images: merged
          };
        });
        showToast(`Successfully uploaded ${newUrls.length} gallery image(s)!`);
      }
    } catch (err: any) {
      console.error('Gallery batch upload error:', err);
      showToast(`Upload failed: ${err?.message || 'Network error'}`, 'error');
    } finally {
      setIsSaving(false);
      setUploadStatus(null);
      e.target.value = '';
    }
  };

  const handleSetCover = (imgUrl: string) => {
    if (!imgUrl) return;
    setActiveItem((prev: any) => {
      const currentImages = Array.isArray(prev.images) ? [...prev.images] : [];
      if (!currentImages.includes(imgUrl)) {
        currentImages.unshift(imgUrl);
      }
      return {
        ...prev,
        image: imgUrl,
        images: currentImages
      };
    });
    showToast('Cover image updated.');
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setActiveItem((prev: any) => {
      const currentImages = Array.isArray(prev.images) ? [...prev.images] : [];
      const removedUrl = currentImages[indexToRemove];
      const updated = currentImages.filter((_, idx) => idx !== indexToRemove);
      
      let nextCover = prev.image;
      // If the removed image was the cover, choose the new first image
      if (removedUrl === prev.image) {
        nextCover = updated[0] || '';
      }

      return {
        ...prev,
        image: nextCover,
        images: updated
      };
    });
    showToast('Image removed from project gallery.');
  };

  const handleMoveGalleryImage = (index: number, direction: 'left' | 'right') => {
    setActiveItem((prev: any) => {
      const currentImages = Array.isArray(prev.images) ? [...prev.images] : [];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= currentImages.length) return prev;

      const temp = currentImages[index];
      currentImages[index] = currentImages[targetIndex];
      currentImages[targetIndex] = temp;

      return {
        ...prev,
        images: currentImages
      };
    });
  };

  const handleAddGalleryUrl = () => {
    const trimmed = galleryUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('db-media://')) {
      showToast('Please enter a valid HTTP or HTTPS image URL.', 'error');
      return;
    }

    setActiveItem((prev: any) => {
      const currentImages = Array.isArray(prev.images) ? [...prev.images] : (prev.image ? [prev.image] : []);
      if (currentImages.includes(trimmed)) {
        return prev;
      }
      const updated = [...currentImages, trimmed];
      return {
        ...prev,
        image: prev.image || trimmed,
        images: updated
      };
    });
    setGalleryUrlInput('');
    showToast('Image URL added to gallery!');
  };

  // Portfolio items filtering and searching
  const filteredPortfolio = useMemo(() => {
    return portfolioItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subcategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.client && item.client.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [portfolioItems, searchQuery, categoryFilter, statusFilter]);

  // Pagination helper
  const paginatedPortfolio = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPortfolio.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPortfolio, currentPage]);

  const totalPages = Math.ceil(filteredPortfolio.length / itemsPerPage);

  // Auto adjust page when filtered items change
  useEffect(() => {
    const maxPage = Math.ceil(filteredPortfolio.length / itemsPerPage) || 1;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredPortfolio.length, currentPage, itemsPerPage]);

  const initNewPortfolioItem = () => {
    setIsEditMode(false);
    setActiveItem({
      id: '',
      title: '',
      category: categories[0],
      subcategory: categories[0],
      description: '',
      image: '',
      images: [],
      videoUrl: '',
      videoPlatform: 'Auto Detect',
      tags: [],
      tools: [],
      client: '',
      year: new Date().getFullYear().toString(),
      isFeatured: false,
      status: 'Active',
      price: undefined,
      discountPrice: undefined,
      isStartingFrom: false,
      customPricingText: '',
      sortOrder: portfolioItems.length + 1
    });
    setModalType('portfolio');
  };

  const openEditPortfolioItem = (item: ExtendedPortfolioItem) => {
    setIsEditMode(true);
    const gallery = Array.isArray(item.images) && item.images.length > 0 
      ? [...item.images] 
      : (item.image ? [item.image] : []);
    const cover = item.image || gallery[0] || '';
    if (cover && !gallery.includes(cover)) {
      gallery.unshift(cover);
    }
    setActiveItem({
      ...item,
      image: cover,
      images: gallery,
      tags: item.tags || [],
      tools: item.tools || [],
      sortOrder: item.sortOrder !== undefined ? item.sortOrder : 0,
      videoPlatform: item.videoPlatform || 'Auto Detect'
    });
    setModalType('portfolio');
  };

  const initNewService = () => {
    setIsEditMode(false);
    setActiveItem({ id: '', title: '', icon: 'Palette', description: '', items: [''] });
    setModalType('service');
  };

  const initNewSkill = () => {
    setIsEditMode(false);
    setActiveItem({ name: '', level: 80, category: 'Design', icon: 'Layers' });
    setModalType('skill');
  };

  const initNewExperience = () => {
    setIsEditMode(false);
    setActiveItem({ id: '', role: '', company: '', period: '', description: '', highlights: [''] });
    setModalType('experience');
  };

  const initNewTestimonial = () => {
    setIsEditMode(false);
    setActiveItem({ id: '', name: '', role: '', company: '', comment: '', rating: 5, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80' });
    setModalType('testimonial');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b13] text-white flex flex-col font-sans overflow-hidden">
      
      {/* Hidden file upload inputs */}
      <input type="file" ref={imageUploadRef} accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
      <input type="file" ref={coverUploadRef} accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <input type="file" ref={galleryUploadRef} accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
      <input type="file" ref={videoUploadRef} accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
      <input type="file" ref={resumeUploadRef} accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 'resume')} />

      {/* TOP HEADER STATUS BAR */}
      <header className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0a0f1d] border-b border-gray-800 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button 
            onClick={handleClose}
            className="p-2 rounded-xl bg-gray-900 border border-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Return to Website"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          {isAuthenticated && (
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-colors cursor-pointer shrink-0"
              title="Toggle CMS Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="font-display font-black text-xs sm:text-sm tracking-wider sm:tracking-widest text-white uppercase flex items-center gap-1.5 sm:gap-2 truncate">
              <img
                src={finalLogo}
                alt="Alpha Edit Studio Logo"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).src = '/final-logo.jpg'; }}
                className="w-5 h-5 sm:w-6 sm:h-6 aspect-square object-contain rounded-md ring-1 ring-amber-500/30 bg-black/40 p-0.5 shrink-0"
              />
              <span className="truncate">Control Panel</span>
              <span className="hidden sm:inline-block text-[9px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest shrink-0">
                CMS v2.0
              </span>
            </h1>
            <p className="text-[9px] sm:text-[10px] font-mono text-gray-500 truncate">
              {isSupabaseConfigured() ? (
                <span className="text-emerald-400 flex items-center gap-1 truncate">● SUPABASE ACTIVE</span>
              ) : (
                <span className="text-yellow-500 flex items-center gap-1 truncate">● LOCAL PERSISTENCE</span>
              )}
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex items-center space-x-2 shrink-0">
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 text-xs font-mono font-bold text-red-400 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DISCONNECT</span>
            </button>
          </div>
        )}
      </header>

      {/* CONTENT MATRIX CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* MOBILE SLIDE-OVER DRAWER NAVIGATION */}
        {isAuthenticated && isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div 
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0a0f1d] border-r border-gray-800 p-4 z-50 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
                <span className="text-xs font-mono tracking-widest text-amber-400 uppercase font-bold">CMS Modules</span>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 flex-1">
                {[
                  { id: 'portfolio', label: 'Portfolio Projects', icon: LayoutGrid },
                  { id: 'metrics', label: 'Studio Metrics', icon: BarChart3 },
                  { id: 'about', label: 'About & Resume', icon: User },
                  { id: 'services', label: 'Creative Services', icon: Palette },
                  { id: 'skills', label: 'Visual Skills', icon: Sparkles },
                  { id: 'experience', label: 'Work Milestones', icon: Briefcase },
                  { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
                  { id: 'contact', label: 'Contact & Socials', icon: Globe },
                  { id: 'supabase', label: 'Supabase Engine', icon: Database },
                  { id: 'settings', label: 'Central Settings', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setCurrentPage(1);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/10' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-900/40'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-gray-950/60 rounded-xl border border-gray-900 text-center space-y-1">
                <span className="text-[10px] font-mono text-gray-500 block uppercase">Project Deliveries</span>
                <span className="text-sm font-display font-black text-white">{portfolioItems.length} Total Projects</span>
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP SIDE BAR NAVIGATION */}
        {isAuthenticated && (
          <aside className="hidden lg:flex w-64 bg-[#0a0f1d] border-r border-gray-800 flex-col justify-between shrink-0 p-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono tracking-widest text-gray-500 block px-3 mb-2 uppercase">CMS Modules</span>
              {[
                { id: 'portfolio', label: 'Portfolio Projects', icon: LayoutGrid },
                { id: 'metrics', label: 'Studio Metrics', icon: BarChart3 },
                { id: 'about', label: 'About & Resume', icon: User },
                { id: 'services', label: 'Creative Services', icon: Palette },
                { id: 'skills', label: 'Visual Skills', icon: Sparkles },
                { id: 'experience', label: 'Work Milestones', icon: Briefcase },
                { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
                { id: 'contact', label: 'Contact & Socials', icon: Globe },
                { id: 'supabase', label: 'Supabase Engine', icon: Database },
                { id: 'settings', label: 'Central Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setCurrentPage(1);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/10' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-900/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-900 text-center space-y-1">
              <span className="text-[10px] font-mono text-gray-500 block uppercase">Project Deliveries</span>
              <span className="text-sm font-display font-black text-white">{portfolioItems.length} Total Projects</span>
            </div>
          </aside>
        )}

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#070b13] p-3 sm:p-6 relative min-w-0 max-w-full">
          
          {/* TOAST NOTIFIER */}
          <AnimatePresence>
            {saveMessage && (
              <motion.div
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl border shadow-2xl z-50 flex items-center space-x-3 ${
                  saveMessage.type === 'success' 
                    ? 'bg-emerald-950 border-emerald-900/60 text-emerald-300' 
                    : 'bg-red-950 border-red-900/60 text-red-300'
                }`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-mono font-bold">{saveMessage.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* NO AUTHENTICATION: LOGIN PORTAL */}
          {!isAuthenticated ? (
            <div className="max-w-md mx-auto mt-20 p-8 rounded-2xl bg-[#0a0f1d] border border-gray-800 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-black/60 border border-amber-500/30 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10 p-1">
                <img
                  src={finalLogo}
                  alt="Alpha Edit Studio Logo"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/final-logo.jpg'; }}
                  className="w-full h-full aspect-square object-contain rounded-xl"
                />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-white tracking-tight">SECURE PORTAL LOGIN</h2>
                <p className="text-xs text-gray-400 mt-1">Authenticate access to manage your dynamic creative portfolio CMS engine.</p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/30 text-red-400 text-xs text-left leading-relaxed">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Username / Email</label>
                  <input
                    type="text"
                    required
                    value={username}
                    placeholder="alphaeditstudio8@gmail.com"
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    placeholder="••••••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="p-3 bg-gray-950/40 rounded-xl border border-gray-900 text-[10px] font-mono text-gray-500 space-y-1 leading-relaxed">
                  <p>🔑 <span className="font-bold text-gray-400">Default Demo Credentials:</span></p>
                  <p>Email: <span className="text-amber-400">alphaeditstudio8@gmail.com</span></p>
                  <p>Password: <span className="text-amber-400">adminpassword</span></p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  Enter Cockpit
                </button>
              </form>
            </div>
          ) : isLoading ? (
            /* LOADING HUD */
            <div className="flex flex-col items-center justify-center py-32 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs font-mono text-gray-500">Retrieving system states & credentials...</p>
            </div>
          ) : (
            /* CMS MODULE VIEWS */
            <div>
              
              {/* TAB 1: PORTFOLIO LISTING CONTROLS */}
              {activeTab === 'portfolio' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display font-black text-2xl text-white uppercase">Portfolio Deliverables</h2>
                      <p className="text-xs text-gray-400 mt-1">Synchronize vector geometry, pricing indexes, and social media reels.</p>
                    </div>
                    <button
                      onClick={initNewPortfolioItem}
                      className="flex items-center justify-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-lg shadow-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Project</span>
                    </button>
                  </div>

                  {/* Filter and search matrices */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0a0f1d] p-4 rounded-xl border border-gray-800">
                    <div className="relative md:col-span-2">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-gray-950 border border-gray-850 rounded-xl py-2.5 pl-11 pr-4 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-gray-950 border border-gray-850 text-xs text-gray-300 rounded-xl py-2.5 px-4 focus:outline-none focus:border-blue-500"
                      >
                        <option value="All">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="w-full bg-gray-950 border border-gray-850 text-xs text-gray-300 rounded-xl py-2.5 px-4 focus:outline-none focus:border-blue-500"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Hidden">Hidden</option>
                      </select>
                    </div>
                  </div>

                  {/* Responsive Table & Mobile Cards Container */}
                  <div className="bg-[#0a0f1d] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                    
                    {/* MOBILE & TABLET CARD VIEW (visible on screen < 1024px) */}
                    <div className="block lg:hidden divide-y divide-gray-850/60">
                      {paginatedPortfolio.map((item) => (
                        <div key={item.id} className="p-4 sm:p-5 space-y-3.5 hover:bg-gray-950/40 transition-colors">
                          <div className="flex items-start space-x-3.5">
                            <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
                              <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                              {item.images && item.images.length > 1 && (
                                <span className="absolute bottom-1 right-1 bg-black/85 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                  📷 {item.images.length}
                                </span>
                              )}
                              {item.videoUrl && (
                                <span className="absolute top-1 right-1 bg-blue-600/90 text-white text-[8px] font-mono px-1 py-0.5 rounded">
                                  🎥 Video
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-full font-mono text-[9px] bg-blue-950/50 border border-blue-900/30 text-blue-400">
                                  {item.subcategory}
                                </span>
                                {item.isFeatured && (
                                  <span className="px-2 py-0.5 rounded-full font-mono text-[9px] bg-amber-950/40 border border-amber-900/30 text-amber-400 font-bold">
                                    ⭐ Featured
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold ${
                                  item.status === 'Active' || !item.status
                                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                                    : 'bg-gray-900 text-gray-500 border border-gray-800'
                                }`}>
                                  {item.status || 'Active'}
                                </span>
                              </div>

                              <h4 className="font-sans font-bold text-white text-sm sm:text-base truncate">{item.title}</h4>
                              
                              <p className="text-[11px] font-mono text-gray-400">
                                {item.client || 'Personal'} • {item.year}
                              </p>

                              {item.price && (
                                <p className="text-emerald-400 font-mono text-xs font-bold">
                                  {item.isStartingFrom && <span className="text-[10px] text-gray-500 font-normal">From </span>}
                                  ₹{item.price}
                                  {item.discountPrice && <span className="line-through text-gray-500 text-[10px] ml-1.5 font-normal">₹{item.discountPrice}</span>}
                                  {item.customPricingText && <span className="text-[10px] text-gray-400 ml-1.5 font-normal">({item.customPricingText})</span>}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons Row with touch targets */}
                          <div className="flex items-center space-x-2 pt-2 border-t border-gray-850/60">
                            <button
                              onClick={() => openEditPortfolioItem(item)}
                              className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleTogglePortfolioItemVisibility(item)}
                              className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                                item.status === 'Hidden'
                                  ? 'bg-amber-950/25 border-amber-900/40 text-amber-400 hover:bg-amber-950/40'
                                  : 'bg-gray-900 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-850'
                              }`}
                              title={item.status === 'Hidden' ? "Show on site" : "Hide from site"}
                            >
                              {item.status === 'Hidden' ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Hidden</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                  <span>Active</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleDeletePortfolioItem(item.id, item.title)}
                              className="min-h-[42px] px-3 py-2 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {filteredPortfolio.length === 0 && (
                        <div className="text-center py-12 px-4 text-gray-500 font-mono text-xs">
                          No project items found matching your filters.
                        </div>
                      )}
                    </div>

                    {/* DESKTOP TABLE VIEW (visible on screen >= 1024px) */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-950/80 border-b border-gray-850 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                            <th className="p-4">Project Info</th>
                            <th className="p-4">Category / Client</th>
                            <th className="p-4">Pricing structure</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-center">Featured</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850/40 text-xs">
                          {paginatedPortfolio.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-950/30 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-800">
                                    <img 
                                      src={item.image} 
                                      alt={item.title} 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                    {item.images && item.images.length > 1 && (
                                      <span className="absolute bottom-0 right-0 bg-black/85 text-amber-400 text-[8px] font-mono px-1 rounded-tl">
                                        📷{item.images.length}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-sans font-bold text-white text-sm">{item.title}</h4>
                                    <span className="text-[10px] font-mono text-gray-500 block">ID: {item.id} • Year: {item.year}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="space-y-0.5">
                                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[9px] bg-blue-950/40 border border-blue-900/30 text-blue-400">{item.subcategory}</span>
                                  <p className="text-[10px] font-mono text-gray-400">{item.client || 'Personal project'}</p>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="font-mono text-[11px]">
                                  {item.price ? (
                                    <div className="space-y-0.5">
                                      <p className="text-emerald-400 font-bold">
                                        {item.isStartingFrom && <span className="text-[9px] text-gray-500">From </span>}
                                        ₹{item.price}
                                        {item.discountPrice && <span className="line-through text-gray-500 text-[10px] ml-1.5">₹{item.discountPrice}</span>}
                                      </p>
                                      {item.customPricingText && <p className="text-[9px] text-gray-500 italic">{item.customPricingText}</p>}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">— Non Price tag —</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-wider font-bold ${
                                  item.status === 'Active' || !item.status
                                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                                    : 'bg-gray-900 text-gray-500 border border-gray-800'
                                }`}>
                                  {item.status || 'Active'}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                {item.isFeatured ? (
                                  <span className="text-amber-400 font-bold font-mono text-[10px] bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded-md uppercase">Featured</span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => openEditPortfolioItem(item)}
                                    className="p-2 rounded-lg bg-gray-900 border border-gray-850 hover:border-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    title="Edit Project"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleTogglePortfolioItemVisibility(item)}
                                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                                      item.status === 'Hidden'
                                        ? 'bg-amber-950/20 border-amber-900/30 hover:bg-amber-950/40 text-amber-400'
                                        : 'bg-blue-950/20 border-blue-900/30 hover:bg-blue-950/40 text-blue-400'
                                    }`}
                                    title={item.status === 'Hidden' ? "Show Project" : "Hide Project"}
                                  >
                                    {item.status === 'Hidden' ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDeletePortfolioItem(item.id, item.title)}
                                    className="p-2 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 transition-colors cursor-pointer"
                                    title="Delete Project permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {filteredPortfolio.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-16 text-gray-500 font-mono">
                                No project items found under this criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="px-6 py-4 bg-gray-950/40 border-t border-gray-850 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-500">
                          Showing Page {currentPage} of {totalPages} ({filteredPortfolio.length} matching)
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 rounded-lg bg-gray-900 border border-gray-850 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 rounded-lg bg-gray-900 border border-gray-850 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: STUDIO METRICS CMS */}
              {activeTab === 'metrics' && (
                <div className="max-w-4xl space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display font-black text-2xl text-white uppercase flex items-center gap-2.5">
                        <BarChart3 className="w-6 h-6 text-amber-400" />
                        Studio Metrics & Track Record
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Manage transparent, verifiable studio metrics. Dynamic counts reflect active Supabase portfolio records automatically, while highlights and collaboration values can be customized without editing code.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const updated = await api.getLiveProjectMetrics();
                          setLiveProjectMetrics(updated);
                          showToast('Live counts refreshed from Supabase!');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-300 hover:text-white text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh Live Counts</span>
                    </button>
                  </div>

                  {/* AUTOMATICALLY CALCULATED METRICS CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/20 via-black to-black border border-amber-500/30 shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                          Dynamic Portfolio Metric
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Supabase Live
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-3">
                        <span className="text-4xl font-mono font-black text-white">
                          {liveProjectMetrics.publishedCount}
                        </span>
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                          Published Projects
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        Calculated directly from active, non-demo portfolio records in Supabase. Hardcoded demo entries are excluded. Updates automatically whenever projects are created, published, or removed.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-950/80 via-black to-black border border-gray-800 shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold">
                          Auto-Detected Disciplines
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/40 text-amber-300 border border-amber-900/40 font-semibold">
                          <Layers className="w-3 h-3" />
                          {liveProjectMetrics.categoriesCount} Disciplines
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-3">
                        <span className="text-4xl font-mono font-black text-white">
                          {liveProjectMetrics.categoriesCount}
                        </span>
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                          Creative Categories
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {liveProjectMetrics.creativeCategories.length > 0 ? (
                          liveProjectMetrics.creativeCategories.map((cat) => (
                            <span key={cat} className="px-2 py-0.5 rounded bg-gray-900 text-amber-400/90 text-[10px] font-mono border border-gray-800">
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-500 font-mono italic">
                            Categories will populate as real portfolio projects are added.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* EDITABLE STUDIO METRICS FORM */}
                  <form onSubmit={handleSaveStudioMetrics} className="bg-[#0a0f1d] p-6 rounded-2xl border border-gray-800 space-y-8">
                    
                    {/* SECTION 1: PROJECTS COMPLETED CUSTOMIZATION */}
                    <div className="space-y-4 pb-6 border-b border-gray-850">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
                          <h3 className="font-bold text-sm text-white uppercase tracking-wide">Metric 1: Published Projects (Dynamic)</h3>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Live Value: {liveProjectMetrics.publishedCount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        The numeric count is locked to your actual Supabase database records to ensure zero fabricated numbers. You can customize the label and subtitle here.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Metric Title Label</label>
                          <input
                            type="text"
                            value={studioMetrics.projectsCompletedLabel}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, projectsCompletedLabel: e.target.value })}
                            placeholder="Projects Completed"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Subtext / Description</label>
                          <input
                            type="text"
                            value={studioMetrics.projectsCompletedDesc}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, projectsCompletedDesc: e.target.value })}
                            placeholder="Published portfolio deliveries"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: CREATIVE TIMELINE (REPLACING CUMULATIVE VIEWS) */}
                    <div className="space-y-4 pb-6 border-b border-gray-850">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
                          <h3 className="font-bold text-sm text-white uppercase tracking-wide">Metric 2: Project Period / Creative Work</h3>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                          Replaces 25M+ Views
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Instead of fabricated view counts, display your authentic creative work timeline (e.g. 2025–26).
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Period / Value</label>
                          <input
                            type="text"
                            value={studioMetrics.projectPeriod}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, projectPeriod: e.target.value })}
                            placeholder="2025–26"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Label</label>
                          <input
                            type="text"
                            value={studioMetrics.projectPeriodLabel}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, projectPeriodLabel: e.target.value })}
                            placeholder="Creative Work"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Description</label>
                          <input
                            type="text"
                            value={studioMetrics.projectPeriodDesc}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, projectPeriodDesc: e.target.value })}
                            placeholder="Post-production & branding timeline"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: CLIENT COLLABORATIONS (REPLACING GLOBAL CLIENTS) */}
                    <div className="space-y-4 pb-6 border-b border-gray-850">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
                          <h3 className="font-bold text-sm text-white uppercase tracking-wide">Metric 3: Client Collaborations</h3>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Replaces 80+ Clients
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Admin-controlled manual metric. Enter an authentic, verified number (e.g., "12" or "15+") or use a professional non-numeric focus label like "Direct", "Collaborative", or "Partner".
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Collaboration Value</label>
                          <input
                            type="text"
                            value={studioMetrics.clientCollaborations}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, clientCollaborations: e.target.value })}
                            placeholder="Direct"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Label</label>
                          <input
                            type="text"
                            value={studioMetrics.clientCollaborationsLabel}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, clientCollaborationsLabel: e.target.value })}
                            placeholder="Client Collaborations"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Description</label>
                          <input
                            type="text"
                            value={studioMetrics.clientCollaborationsDesc}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, clientCollaborationsDesc: e.target.value })}
                            placeholder="Independent creators & brands"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: STUDIO HIGHLIGHT (REPLACING 100% DELIVERY QUALITY) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">4</span>
                          <h3 className="font-bold text-sm text-white uppercase tracking-wide">Metric 4: Studio Craft Highlight</h3>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                          Replaces 100% Claim
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Professional non-numeric craft focus (e.g., "PRECISION", "QUALITY FOCUSED", or "BESPOKE") representing production integrity.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Statement Value</label>
                          <input
                            type="text"
                            value={studioMetrics.studioHighlight}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, studioHighlight: e.target.value })}
                            placeholder="PRECISION"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono uppercase"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Label</label>
                          <input
                            type="text"
                            value={studioMetrics.studioHighlightLabel}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, studioHighlightLabel: e.target.value })}
                            placeholder="Post-Production"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Description</label>
                          <input
                            type="text"
                            value={studioMetrics.studioHighlightDesc}
                            onChange={(e) => setStudioMetrics({ ...studioMetrics, studioHighlightDesc: e.target.value })}
                            placeholder="Retention-focused video & vector craft"
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-sans font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
                      >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>{isSaving ? 'Publishing Metrics...' : 'Save Studio Metrics'}</span>
                      </button>
                    </div>
                  </form>

                  {/* LIVE PUBLIC PREVIEW CARD GRID */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">
                        Live Public Website Preview
                      </span>
                      <span className="text-[10px] font-mono text-amber-400">
                        Renders in the About section
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-black rounded-2xl border border-gray-850">
                      {/* Preview Card 1 */}
                      <div className="p-5 rounded-xl bg-[#121212] border border-amber-500/20 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-2xl font-extrabold text-white tracking-tight truncate">
                              {liveProjectMetrics.publishedCount}
                            </span>
                            <span className="font-sans font-bold text-[11px] text-gray-200 mt-1 uppercase tracking-wide">
                              {studioMetrics.projectsCompletedLabel || 'Projects Completed'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-500 text-black shrink-0">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-400/80 uppercase truncate">
                            {liveProjectMetrics.categoriesCount > 0 ? `${liveProjectMetrics.categoriesCount} Disciplines` : studioMetrics.projectsCompletedDesc}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            Auto
                          </span>
                        </div>
                      </div>

                      {/* Preview Card 2 */}
                      <div className="p-5 rounded-xl bg-[#121212] border border-amber-500/20 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-2xl font-extrabold text-white tracking-tight truncate">
                              {studioMetrics.projectPeriod || '2025–26'}
                            </span>
                            <span className="font-sans font-bold text-[11px] text-gray-200 mt-1 uppercase tracking-wide">
                              {studioMetrics.projectPeriodLabel || 'Creative Work'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gradient-to-tr from-amber-600 to-yellow-400 text-black shrink-0">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-400/80 uppercase truncate">
                            {studioMetrics.projectPeriodDesc}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            Timeline
                          </span>
                        </div>
                      </div>

                      {/* Preview Card 3 */}
                      <div className="p-5 rounded-xl bg-[#121212] border border-amber-500/20 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-2xl font-extrabold text-white tracking-tight truncate">
                              {studioMetrics.clientCollaborations || 'Direct'}
                            </span>
                            <span className="font-sans font-bold text-[11px] text-gray-200 mt-1 uppercase tracking-wide">
                              {studioMetrics.clientCollaborationsLabel || 'Client Collaborations'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gradient-to-tr from-yellow-500 to-amber-500 text-black shrink-0">
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-400/80 uppercase truncate">
                            {studioMetrics.clientCollaborationsDesc}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            Verified
                          </span>
                        </div>
                      </div>

                      {/* Preview Card 4 */}
                      <div className="p-5 rounded-xl bg-[#121212] border border-amber-500/20 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-2xl font-extrabold text-white tracking-tight truncate">
                              {studioMetrics.studioHighlight || 'PRECISION'}
                            </span>
                            <span className="font-sans font-bold text-[11px] text-gray-200 mt-1 uppercase tracking-wide">
                              {studioMetrics.studioHighlightLabel || 'Post-Production'}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-600 text-black shrink-0">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-400/80 uppercase truncate">
                            {studioMetrics.studioHighlightDesc}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            Craft
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ABOUT SECTION CMS */}
              {activeTab === 'about' && (
                <div className="max-w-3xl space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase">About Bio & Credentials</h2>
                    <p className="text-xs text-gray-400 mt-1">Modify your professional summaries, profile image overlays, and upload your latest resume credentials.</p>
                  </div>

                  <form onSubmit={handleSaveAbout} className="bg-[#0a0f1d] p-6 rounded-2xl border border-gray-800 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Public Name</label>
                        <input
                          type="text"
                          required
                          value={aboutCMS.name}
                          onChange={(e) => setAboutCMS(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Professional Title</label>
                        <input
                          type="text"
                          required
                          value={aboutCMS.title}
                          onChange={(e) => setAboutCMS(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Professional Biography</label>
                      <textarea
                        required
                        rows={5}
                        value={aboutCMS.bio}
                        onChange={(e) => setAboutCMS(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Avatar upload */}
                      <div className="p-4 rounded-xl bg-gray-950 border border-gray-850 flex items-center space-x-4">
                        <img 
                          src={aboutCMS.profileImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'} 
                          alt="Profile preview" 
                          className="w-16 h-16 object-cover rounded-xl border border-gray-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono text-gray-500 block uppercase font-bold">Avatar Artwork</span>
                          <button
                            type="button"
                            onClick={() => triggerFileUpload('image')}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-850 rounded-lg text-[10px] font-mono tracking-wider text-gray-300 hover:text-white cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-400" />
                            <span>Replace Photo</span>
                          </button>
                        </div>
                      </div>

                      {/* Resume PDF upload */}
                      <div className="p-4 rounded-xl bg-gray-950 border border-gray-850 flex flex-col justify-center space-y-2">
                        <div className="flex items-center space-x-2 text-gray-400">
                          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Resume Credential (PDF)</span>
                        </div>
                        {resumeUploadProgress !== null && (
                          <div className="space-y-1.5 p-2 bg-gray-900/30 rounded-lg border border-gray-800/40">
                            <div className="flex justify-between text-[10px] font-mono text-gray-400">
                              <span>Uploading document...</span>
                              <span className="text-blue-400 font-bold">{resumeUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${resumeUploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {aboutCMS.resumeUrl ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-mono text-emerald-400 truncate">
                              ✓ Active File: {aboutCMS.resumeFileName || (aboutCMS.resumeUrl.startsWith('data:') ? 'Uploaded PDF Resume' : aboutCMS.resumeUrl.split('/').pop() || 'Uploaded PDF Resume')}
                            </p>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => triggerFileUpload('resume')}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-850 rounded-lg text-[10px] font-mono tracking-wider text-gray-300 hover:text-white cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5 text-rose-400" />
                                <span>Replace Resume</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveResume}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 rounded-lg text-[10px] font-mono tracking-wider text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Resume</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[10px] font-mono text-gray-500 italic">No document uploaded yet</p>
                            <button
                              type="button"
                              onClick={() => triggerFileUpload('resume')}
                              className="w-fit flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-850 rounded-lg text-[10px] font-mono tracking-wider text-gray-300 hover:text-white cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-rose-400" />
                              <span>Upload PDF Resume</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer w-full shadow-lg shadow-blue-500/10"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Biography Segment</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: SERVICES CMS */}
              {activeTab === 'services' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-black text-2xl text-white uppercase">Creative Services</h2>
                      <p className="text-xs text-gray-400 mt-1">Manage active business packages, icons, and nested bullet item catalogs.</p>
                    </div>
                    <button
                      onClick={initNewService}
                      className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Service</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {services.map((ser) => (
                      <div key={ser.id} className="p-5 rounded-2xl border border-gray-800 bg-[#0a0f1d] flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-lg bg-blue-950/40 border border-blue-900/30 text-blue-400 font-mono text-[10px] font-bold uppercase">{ser.icon}</span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => { setIsEditMode(true); setActiveItem({ ...ser }); setModalType('service'); }}
                                className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white border border-gray-850 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(ser.id, ser.title)}
                                className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <h3 className="font-sans font-bold text-base text-white">{ser.title}</h3>
                          <p className="text-xs text-gray-400 leading-relaxed">{ser.description}</p>
                          <div className="space-y-1 pt-2 border-t border-gray-850">
                            <span className="text-[9px] font-mono text-gray-500 tracking-wider block uppercase mb-1">Catalog Items:</span>
                            {ser.items.map((bullet, idx) => (
                              <p key={idx} className="text-xs text-gray-300 flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                                <span>{bullet}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SKILLS CMS */}
              {activeTab === 'skills' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-black text-2xl text-white uppercase">Visual Tools & Skill Levels</h2>
                      <p className="text-xs text-gray-400 mt-1">Configure proficiency bars for visual editing suites and vector layouts.</p>
                    </div>
                    <button
                      onClick={initNewSkill}
                      className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Tool Skill</span>
                    </button>
                  </div>

                  <div className="bg-[#0a0f1d] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-950/80 border-b border-gray-850 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                          <th className="p-4">Tool Name</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Proficiency Progress</th>
                          <th className="p-4">Icon Name</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850/40">
                        {skills.map((sk) => (
                          <tr key={sk.name} className="hover:bg-gray-950/20 transition-colors">
                            <td className="p-4 font-bold text-white text-sm">{sk.name}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] bg-indigo-950/30 border border-indigo-900/30 text-indigo-400">{sk.category}</span>
                            </td>
                            <td className="p-4 w-1/3">
                              <div className="flex items-center space-x-3">
                                <div className="flex-1 bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-850">
                                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${sk.level}%` }} />
                                </div>
                                <span className="font-mono text-[11px] font-bold text-white">{sk.level}%</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-[10px] text-gray-400">{sk.icon}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => { setIsEditMode(true); setActiveItem({ ...sk }); setModalType('skill'); }}
                                  className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-850 text-gray-400 hover:text-white cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSkill(sk.name)}
                                  className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: EXPERIENCE TIMELINE CMS */}
              {activeTab === 'experience' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-black text-2xl text-white uppercase">Work Milestones</h2>
                      <p className="text-xs text-gray-400 mt-1">Document historic corporate engagements and visual post-production agency jobs.</p>
                    </div>
                    <button
                      onClick={initNewExperience}
                      className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Milestone</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {experiences.map((exp) => (
                      <div key={exp.id} className="p-5 rounded-2xl bg-[#0a0f1d] border border-gray-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-850 pb-3">
                          <div>
                            <h3 className="font-sans font-bold text-base text-white">{exp.role}</h3>
                            <span className="text-xs text-blue-400 font-mono">{exp.company} • {exp.period}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              onClick={() => { setIsEditMode(true); setActiveItem({ ...exp }); setModalType('experience'); }}
                              className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-850 text-gray-400 hover:text-white cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExperience(exp.id, exp.role)}
                              className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{exp.description}</p>
                        <div className="space-y-1 pt-2">
                          <span className="text-[9px] font-mono text-gray-500 tracking-wider block uppercase">Major highlights:</span>
                          {exp.highlights.map((h, idx) => (
                            <p key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                              <span>{h}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: TESTIMONIALS CMS */}
              {activeTab === 'testimonials' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-black text-2xl text-white uppercase">Client Testimonials</h2>
                      <p className="text-xs text-gray-400 mt-1">Publish five-star comments left by startup executives and YouTube channels.</p>
                    </div>
                    <button
                      onClick={initNewTestimonial}
                      className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Testimonial</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {testimonials.map((test) => (
                      <div key={test.id} className="p-5 rounded-2xl bg-[#0a0f1d] border border-gray-800 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <img src={test.avatar} alt={test.name} className="w-11 h-11 object-cover rounded-xl border border-gray-800" referrerPolicy="no-referrer" />
                              <div>
                                <h4 className="font-bold text-sm text-white">{test.name}</h4>
                                <p className="text-[10px] font-mono text-gray-500">{test.role} @ {test.company}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => { setIsEditMode(true); setActiveItem({ ...test }); setModalType('testimonial'); }}
                                className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-850 text-gray-400 hover:text-white cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTestimonial(test.id, test.name)}
                                className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed italic">"{test.comment}"</p>
                        </div>
                        <div className="flex items-center space-x-1 pt-2 border-t border-gray-850">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={`text-sm ${i < test.rating ? 'text-amber-400' : 'text-gray-700'}`}>★</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: CONTACTS & SOCIAL NETWORKS */}
              {activeTab === 'contact' && (
                <div className="max-w-3xl space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase">Contact Information</h2>
                    <p className="text-xs text-gray-400 mt-1">Configure physical addresses, support telephone listings, and active social media link cards.</p>
                  </div>

                  <form onSubmit={handleSaveContactAndSocials} className="bg-[#0a0f1d] p-6 rounded-2xl border border-gray-800 space-y-6">
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono tracking-widest text-gray-500 block uppercase font-bold border-b border-gray-850 pb-1.5">Public Reach Channels</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Primary Email Address</label>
                          <input
                            type="email"
                            required
                            value={contact.email}
                            onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Support Telephone</label>
                          <input
                            type="text"
                            required
                            value={contact.phone}
                            onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Physical Address</label>
                        <input
                          type="text"
                          required
                          value={contact.address}
                          onChange={(e) => setContact(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-[10px] font-mono tracking-widest text-gray-500 uppercase font-bold">Social Media URLs</span>
                        <button
                          type="button"
                          onClick={() => {
                            const platformName = prompt('Enter the platform name (e.g., Mastodon, Threads, Medium, Skype):');
                            if (platformName && platformName.trim()) {
                              const newSoc = {
                                id: 'temp-' + Date.now(),
                                platform: platformName.trim(),
                                url: ''
                              };
                              setSocials(prev => [...prev, newSoc]);
                            }
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-900/40 hover:border-blue-500/50 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Platform</span>
                        </button>
                      </div>
                      
                      {socials.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-gray-800 rounded-xl text-xs text-gray-500 font-mono">
                          No active social media links. Click "Add Platform" above to start.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {socials.map((soc, idx) => (
                            <div key={soc.id} className="grid grid-cols-12 gap-3 items-center">
                              <span className="col-span-4 md:col-span-3 font-mono text-[10px] md:text-[11px] text-gray-400 uppercase px-2 py-2.5 bg-gray-950 rounded-lg border border-gray-850 text-center truncate" title={soc.platform}>
                                {soc.platform}
                              </span>
                              <input
                                type="text"
                                value={soc.url}
                                placeholder={
                                  soc.platform.toLowerCase().includes('email') ? 'alphaeditstudio8@gmail.com' :
                                  soc.platform.toLowerCase().includes('phone') ? '+91 93434 12416' :
                                  soc.platform.toLowerCase().includes('location') ? 'Indore, M.P., India' :
                                  `https://${soc.platform.toLowerCase().replace(/\s+/g, '')}.com/username`
                                }
                                onChange={(e) => {
                                  const updated = [...socials];
                                  updated[idx].url = e.target.value;
                                  setSocials(updated);
                                }}
                                className="col-span-7 md:col-span-8 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setSocials(prev => prev.filter(s => s.id !== soc.id));
                                }}
                                className="col-span-1 flex items-center justify-center p-2.5 bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 hover:border-red-500/50 rounded-xl transition-all cursor-pointer"
                                title={`Delete ${soc.platform} Link`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer w-full shadow-lg shadow-blue-500/10"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Synchronize Communications Card</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 8: SUPABASE ENGINE METRICS */}
              {activeTab === 'supabase' && (
                <div className="max-w-3xl space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase">Supabase Integration Engine</h2>
                    <p className="text-xs text-gray-400 mt-1">Paste your connection parameters here or define them as secret environment variables to run a fully cloud-backed production database.</p>
                  </div>

                  <div className="p-6 bg-[#0a0f1d] rounded-2xl border border-gray-800 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">SUPABASE_URL</label>
                        <input
                          type="text"
                          value={sbUrl}
                          placeholder="https://your-supabase-project.supabase.co"
                          onChange={(e) => setSbUrl(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-blue-400 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">SUPABASE_ANON_KEY</label>
                        <textarea
                          rows={3}
                          value={sbAnonKey}
                          placeholder="your-supabase-anon-key-long-jwt-token..."
                          onChange={(e) => setSbAnonKey(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-gray-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <button
                        onClick={handleSaveSupabaseConfig}
                        className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer text-center"
                      >
                        Save Connection Config
                      </button>

                      <button
                        onClick={handleSyncToSupabase}
                        disabled={isSyncing || !isSupabaseConfigured()}
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        <span>Seed & Push Local Defaults</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-950 border border-gray-850 text-xs text-gray-400 space-y-3">
                      <h4 className="font-mono text-xs font-bold text-white uppercase flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>SQL SCHEMA BUILD SCRIPT</span>
                      </h4>
                      <p className="text-[10px] leading-relaxed">
                        Execute these DDL tables inside your <span className="font-bold text-white">Supabase SQL Editor</span> to provision secure and proper schemas:
                      </p>
                      <pre className="p-3 bg-gray-900 border border-gray-800 rounded-lg text-[9px] font-mono text-gray-300 overflow-x-auto max-h-48 leading-relaxed">
{`-- 1. Create Portfolio Table
create table if not exists portfolio_items (
  id text primary key,
  title text not null,
  category text,
  subcategory text,
  description text,
  image text,
  images text[],
  "videoUrl" text,
  "videoPlatform" text,
  tags text[],
  tools text[],
  client text,
  year text,
  link text,
  "isFeatured" boolean default false,
  status text default 'Active',
  price numeric,
  "discountPrice" numeric,
  "isStartingFrom" boolean default false,
  "customPricingText" text,
  "sortOrder" integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Migration helpers if table already exists:
alter table portfolio_items add column if not exists tools text[];
alter table portfolio_items add column if not exists "sortOrder" integer default 0;
alter table portfolio_items add column if not exists link text;
alter table portfolio_items add column if not exists "videoPlatform" text;

-- 2. Create About Table
create table if not exists about_cms (
  id text primary key,
  name text,
  title text,
  bio text,
  "profileImage" text,
  "resumeUrl" text
);

-- 3. Create Services Table
create table if not exists services_cms (
  id text primary key,
  title text,
  icon text,
  description text,
  items text[]
);

-- 4. Create Skills Table
create table if not exists skills_cms (
  name text primary key,
  level integer,
  category text,
  icon text
);

-- 5. Create Experiences Table
create table if not exists experience_timeline (
  id text primary key,
  role text,
  company text,
  period text,
  description text,
  highlights text[]
);

-- 6. Create Testimonials Table
create table if not exists testimonials (
  id text primary key,
  name text,
  role text,
  company text,
  comment text,
  rating integer,
  avatar text
);

-- 7. Create Contact Table
create table if not exists contact_cms (
  id text primary key,
  email text,
  phone text,
  address text
);

-- 8. Create Social Links Table
create table if not exists social_links (
  id text primary key,
  platform text,
  url text
);

-- 9. Create Central Settings Table
create table if not exists settings_cms (
  id text primary key,
  "websiteName" text,
  "logoText" text,
  "heroTitle" text,
  "heroSubtitle" text,
  "whatsappNumber" text,
  "footerText" text,
  "copyrightText" text,
  "seoTitle" text,
  "seoDescription" text,
  "themeColor" text,
  "accentColor" text
);

-- 10. Enable Supabase Realtime for Instant Cross-Device Sync
alter publication supabase_realtime add table portfolio_items;

-- 11. Supabase Storage Setup:
-- In Supabase Dashboard -> Storage:
-- Create a new Public Bucket named 'portfolio-media'.
-- (This ensures uploaded project covers & gallery deliverables are accessible on all devices).`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: CENTRAL SETTINGS PANEL */}
              {activeTab === 'settings' && (
                <div className="max-w-3xl space-y-6">
                  <div>
                    <h2 className="font-display font-black text-2xl text-white uppercase">Central Website Settings</h2>
                    <p className="text-xs text-gray-400 mt-1">Configure your personal brand properties, brand identity colors, WhatsApp details, and SEO metadata here.</p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-6 bg-[#0a0f1d] p-6 rounded-2xl border border-gray-800 text-xs text-gray-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Brand Info */}
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono tracking-widest text-blue-400 block uppercase font-bold border-b border-gray-850 pb-1.5">Brand Identity</span>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Website Title/Name</label>
                          <input
                            type="text"
                            required
                            value={settingsCMS.websiteName}
                            onChange={(e) => setSettingsCMS(prev => ({ ...prev, websiteName: e.target.value }))}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Logo Brand Text</label>
                          <input
                            type="text"
                            required
                            value={settingsCMS.logoText}
                            onChange={(e) => setSettingsCMS(prev => ({ ...prev, logoText: e.target.value }))}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">WhatsApp Number (e.g. +919343412416)</label>
                          <input
                            type="text"
                            required
                            value={settingsCMS.whatsappNumber}
                            onChange={(e) => setSettingsCMS(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-white"
                          />
                        </div>
                      </div>

                      {/* Theme Colors */}
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono tracking-widest text-blue-400 block uppercase font-bold border-b border-gray-850 pb-1.5">Theme Palette Settings</span>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Primary Theme Color Hex (e.g. #3b82f6)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={settingsCMS.themeColor}
                              onChange={(e) => setSettingsCMS(prev => ({ ...prev, themeColor: e.target.value }))}
                              className="w-10 h-10 rounded border border-gray-850 bg-transparent cursor-pointer"
                            />
                            <input
                              type="text"
                              required
                              value={settingsCMS.themeColor}
                              onChange={(e) => setSettingsCMS(prev => ({ ...prev, themeColor: e.target.value }))}
                              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 font-mono text-gray-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Accent Highlight Color Hex (e.g. #d946ef)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={settingsCMS.accentColor}
                              onChange={(e) => setSettingsCMS(prev => ({ ...prev, accentColor: e.target.value }))}
                              className="w-10 h-10 rounded border border-gray-850 bg-transparent cursor-pointer"
                            />
                            <input
                              type="text"
                              required
                              value={settingsCMS.accentColor}
                              onChange={(e) => setSettingsCMS(prev => ({ ...prev, accentColor: e.target.value }))}
                              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 font-mono text-gray-300"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hero Texts */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono tracking-widest text-blue-400 block uppercase font-bold border-b border-gray-850 pb-1.5">Hero Canvas Introductions</span>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Main Hero Headline/Title</label>
                        <input
                          type="text"
                          required
                          value={settingsCMS.heroTitle}
                          onChange={(e) => setSettingsCMS(prev => ({ ...prev, heroTitle: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-white font-sans font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Hero Secondary Subtitle Description</label>
                        <textarea
                          rows={2}
                          required
                          value={settingsCMS.heroSubtitle}
                          onChange={(e) => setSettingsCMS(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 leading-relaxed text-white"
                        />
                      </div>
                    </div>

                    {/* SEO Credentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono tracking-widest text-blue-400 block uppercase font-bold border-b border-gray-850 pb-1.5">Search Engine Title (SEO)</span>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">SEO Page Title</label>
                          <input
                            type="text"
                            required
                            value={settingsCMS.seoTitle}
                            onChange={(e) => setSettingsCMS(prev => ({ ...prev, seoTitle: e.target.value }))}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono tracking-widest text-blue-400 block uppercase font-bold border-b border-gray-850 pb-1.5">SEO Meta Description</span>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">SEO Meta description</label>
                          <textarea
                            rows={2}
                            required
                            value={settingsCMS.seoDescription}
                            onChange={(e) => setSettingsCMS(prev => ({ ...prev, seoDescription: e.target.value }))}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 leading-relaxed text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer and Copyright */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono tracking-widest text-blue-400 block uppercase font-bold border-b border-gray-850 pb-1.5">Structured Footer Content</span>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Footer Narrative Paragraph</label>
                        <textarea
                          rows={2}
                          required
                          value={settingsCMS.footerText}
                          onChange={(e) => setSettingsCMS(prev => ({ ...prev, footerText: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 leading-relaxed text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Copyright Footer Line</label>
                        <input
                          type="text"
                          required
                          value={settingsCMS.copyrightText}
                          onChange={(e) => setSettingsCMS(prev => ({ ...prev, copyrightText: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer w-full shadow-lg shadow-blue-500/10"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Brand & SEO Settings</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* CMS MODAL OVERLAYS (PORTFOLIO, SERVICES, SKILLS, ETC.) */}
      {/* ============================================================== */}
      <AnimatePresence>
        {modalType && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div 
              className="absolute inset-0 bg-[#070b13]/85 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalType(null)}
            />

            {/* Modal Card body */}
            <motion.div
              className="relative bg-[#0d1527] border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col z-10"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gray-950/90 border-b border-gray-850 flex items-center justify-between shrink-0">
                <h3 className="font-display font-black text-xs uppercase tracking-widest text-blue-400">
                  {isEditMode ? 'Modify' : 'Create New'} {modalType.toUpperCase()} Record
                </h3>
                <button onClick={() => setModalType(null)} className="p-1.5 rounded-xl bg-gray-900 border border-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                
                {/* PORTFOLIO FIELD FORM */}
                {modalType === 'portfolio' && (
                  <form onSubmit={handleSavePortfolioItem} className="space-y-4 text-xs text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Project Unique ID</label>
                        <input
                          type="text"
                          required
                          disabled={isEditMode}
                          placeholder="branding-nexus"
                          value={activeItem.id}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Project Name / Title</label>
                        <input
                          type="text"
                          required
                          placeholder="Nexus Corp Branding Campaign"
                          value={activeItem.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActiveItem((prev: any) => {
                              const update: any = { ...prev, title: val };
                              if (!isEditMode) {
                                update.id = val.toLowerCase()
                                  .replace(/[^a-z0-9\s-_]/g, '') // remove special chars
                                  .trim()
                                  .replace(/\s+/g, '-')          // spaces to hyphens
                                  .replace(/-+/g, '-');          // dedupe hyphens
                              }
                              return update;
                            });
                          }}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Parent Category</label>
                        <select
                          value={activeItem.category}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, category: e.target.value, subcategory: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-blue-500"
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Subcategory / Label</label>
                        <input
                          type="text"
                          required
                          placeholder="Brand Identity Design"
                          value={activeItem.subcategory}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, subcategory: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Project Narrative Description</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Complete luxury brand identity campaign..."
                        value={activeItem.description}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 leading-relaxed"
                      />
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-950 border border-gray-850">
                      <div className="md:col-span-1 flex items-center space-x-2 h-full pt-6">
                        <input
                          type="checkbox"
                          id="isStartingFrom"
                          checked={activeItem.isStartingFrom}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, isStartingFrom: e.target.checked }))}
                          className="rounded border-gray-800 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isStartingFrom" className="text-[10px] font-mono text-gray-400 uppercase font-bold cursor-pointer">Starting From</label>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Base Price (₹)</label>
                        <input
                          type="number"
                          placeholder="₹9,999"
                          value={activeItem.price || ''}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, price: e.target.value ? Number(e.target.value) : undefined }))}
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Strikeout Price (₹)</label>
                        <input
                          type="number"
                          placeholder="₹14,999"
                          value={activeItem.discountPrice || ''}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, discountPrice: e.target.value ? Number(e.target.value) : undefined }))}
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Custom Price text</label>
                        <input
                          type="text"
                          placeholder="Per Brand Suite"
                          value={activeItem.customPricingText || ''}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, customPricingText: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Client Name</label>
                        <input
                          type="text"
                          placeholder="Nexus Technologies Ltd."
                          value={activeItem.client || ''}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, client: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Completion Year</label>
                        <input
                          type="text"
                          placeholder="2025"
                          value={activeItem.year}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, year: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Project Link URL</label>
                        <input
                          type="url"
                          placeholder="https://behance.net/portfolio"
                          value={activeItem.link || ''}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, link: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Visual Tags (Comma separated)</label>
                        <input
                          type="text"
                          placeholder="Branding, Typography, Vector Layout"
                          value={(activeItem.tags || []).join(', ')}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, tags: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Tools & Software (Comma separated)</label>
                        <input
                          type="text"
                          placeholder="Photoshop, Illustrator, After Effects, Premiere Pro"
                          value={(activeItem.tools || []).join(', ')}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, tools: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Sort Order / Display Priority</label>
                        <input
                          type="number"
                          placeholder="1, 2, 3..."
                          value={activeItem.sortOrder !== undefined ? activeItem.sortOrder : ''}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, sortOrder: e.target.value ? Number(e.target.value) : 0 }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-5">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isFeatured"
                            checked={activeItem.isFeatured}
                            onChange={(e) => setActiveItem((prev: any) => ({ ...prev, isFeatured: e.target.checked }))}
                            className="rounded border-gray-800 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="isFeatured" className="text-[10px] font-mono text-gray-400 uppercase font-bold cursor-pointer">Featured Project</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={activeItem.status || 'Active'}
                            onChange={(e) => setActiveItem((prev: any) => ({ ...prev, status: e.target.value }))}
                            className="bg-gray-950 border border-gray-850 text-[10px] font-mono uppercase font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 text-gray-300"
                          >
                            <option value="Active">Active</option>
                            <option value="Hidden">Hidden</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* ============================================================== */}
                    {/* COVER IMAGE & MULTI-IMAGE GALLERY MANAGEMENT */}
                    {/* ============================================================== */}
                    <div className="space-y-4 pt-3 border-t border-gray-850">
                      
                      {/* Upload Status Banner */}
                      {uploadStatus && (
                        <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl flex items-center space-x-2.5 text-blue-300 text-xs font-mono animate-pulse">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                          <span>{uploadStatus}</span>
                        </div>
                      )}

                      {/* Primary Cover Image Box */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-gray-950 border border-gray-850 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider">Cover Image</span>
                            <span className="px-2 py-0.5 rounded-full font-mono text-[9px] bg-amber-950/40 border border-amber-900/30 text-amber-400 font-bold flex items-center space-x-1">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />
                              <span>Primary Card & Thumbnail</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => coverUploadRef.current?.click()}
                            className="px-3 py-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-lg font-mono text-[10px] text-gray-300 hover:text-white transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Upload className="w-3 h-3 text-blue-400" />
                            <span>Replace Cover</span>
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                          <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden border border-gray-800 bg-gray-900 shrink-0 relative group">
                            {activeItem.image ? (
                              <img 
                                src={activeItem.image} 
                                alt="Cover preview" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 text-[10px] font-mono">
                                <ImageIcon className="w-6 h-6 mb-1 text-gray-700" />
                                <span>No cover set</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <p className="text-[11px] font-mono text-gray-300">
                              This image is displayed as the main card thumbnail on the public homepage and portfolio grid.
                            </p>
                            <input
                              type="url"
                              placeholder="Or paste direct cover image URL (https://...)"
                              value={activeItem.image || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActiveItem((prev: any) => {
                                  const currentImages = Array.isArray(prev.images) ? [...prev.images] : [];
                                  if (val && !currentImages.includes(val)) {
                                    currentImages.unshift(val);
                                  }
                                  return { ...prev, image: val, images: currentImages };
                                });
                              }}
                              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* MULTIPLE GALLERY IMAGES / CASE STUDY MOCKUPS */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-gray-950 border border-gray-850 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono text-gray-300 uppercase font-bold tracking-wider">
                                Project Gallery & Case Study Mockups
                              </span>
                              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] bg-blue-950/40 border border-blue-900/30 text-blue-400 font-bold">
                                {Array.isArray(activeItem.images) ? activeItem.images.length : 0} Images
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                              Upload multiple images (branding sheets, mockups, deliverables). Visitors can browse them in the interactive case study lightbox.
                            </p>
                          </div>

                          {/* Upload Multiple Images Button */}
                          <div className="shrink-0 flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => galleryUploadRef.current?.click()}
                              className="w-full sm:w-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-mono text-[10px] uppercase tracking-wider font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                              <span>Upload Multiple Images</span>
                            </button>
                          </div>
                        </div>

                        {/* Add image URL input row */}
                        <div className="flex items-center space-x-2 pt-1">
                          <div className="relative flex-1">
                            <LinkIcon className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="url"
                              placeholder="Or add single image by URL (https://...)"
                              value={galleryUrlInput}
                              onChange={(e) => setGalleryUrlInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddGalleryUrl();
                                }
                              }}
                              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddGalleryUrl}
                            className="px-3 py-2 bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer"
                          >
                            Add
                          </button>
                        </div>

                        {/* Gallery Thumbnails Grid */}
                        {Array.isArray(activeItem.images) && activeItem.images.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                            {activeItem.images.map((imgUrl: string, idx: number) => {
                              const isCover = activeItem.image === imgUrl;
                              return (
                                <div 
                                  key={`${imgUrl}-${idx}`} 
                                  className={`relative rounded-xl overflow-hidden border bg-gray-900 flex flex-col group ${
                                    isCover ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-gray-800'
                                  }`}
                                >
                                  {/* Image container */}
                                  <div className="w-full h-24 sm:h-28 relative overflow-hidden bg-black/40">
                                    <img 
                                      src={imgUrl} 
                                      alt={`Gallery ${idx + 1}`} 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                    />

                                    {/* Cover Badge */}
                                    {isCover && (
                                      <span className="absolute top-1.5 left-1.5 bg-amber-500 text-black text-[9px] font-mono font-black px-1.5 py-0.5 rounded shadow flex items-center space-x-0.5">
                                        <Star className="w-2.5 h-2.5 fill-black" />
                                        <span>COVER</span>
                                      </span>
                                    )}

                                    {/* Image Index Number */}
                                    <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-gray-400 text-[9px] font-mono px-1 rounded">
                                      #{idx + 1}
                                    </span>
                                  </div>

                                  {/* Control Bar beneath image */}
                                  <div className="p-1.5 bg-gray-950/90 border-t border-gray-850 flex items-center justify-between">
                                    {/* Reorder Buttons */}
                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveGalleryImage(idx, 'left')}
                                        className="p-1 rounded bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-gray-400 hover:text-white cursor-pointer"
                                        title="Move earlier"
                                      >
                                        <ChevronLeft className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === activeItem.images.length - 1}
                                        onClick={() => handleMoveGalleryImage(idx, 'right')}
                                        className="p-1 rounded bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-gray-400 hover:text-white cursor-pointer"
                                        title="Move later"
                                      >
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Set Cover or Remove Actions */}
                                    <div className="flex items-center space-x-1">
                                      {!isCover && (
                                        <button
                                          type="button"
                                          onClick={() => handleSetCover(imgUrl)}
                                          className="p-1 rounded bg-gray-900 hover:bg-amber-950/50 text-gray-400 hover:text-amber-400 border border-transparent hover:border-amber-800/40 cursor-pointer"
                                          title="Set as project cover"
                                        >
                                          <Star className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveGalleryImage(idx)}
                                        className="p-1 rounded bg-gray-900 hover:bg-red-950/50 text-gray-400 hover:text-red-400 border border-transparent hover:border-red-800/40 cursor-pointer"
                                        title="Remove image from gallery"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6 border border-dashed border-gray-800 rounded-xl text-gray-500 font-mono text-[11px] space-y-1">
                            <ImageIcon className="w-6 h-6 mx-auto text-gray-700" />
                            <p>No gallery images uploaded yet.</p>
                            <p className="text-[10px] text-gray-600">Click &quot;Upload Multiple Images&quot; above to select your design deliverables.</p>
                          </div>
                        )}
                      </div>

                      {/* Video Showcase Section */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-gray-950 border border-gray-850 space-y-3">
                        <span className="text-[10px] font-mono text-gray-400 block uppercase font-bold tracking-wider">
                          Video Showcase Reel (Optional)
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-gray-400 uppercase">Platform</label>
                            <select
                              value={activeItem.videoPlatform || 'Auto Detect'}
                              onChange={(e) => setActiveItem((prev: any) => ({ ...prev, videoPlatform: e.target.value }))}
                              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-amber-400 focus:outline-none focus:border-amber-500 font-mono"
                            >
                              <option value="Auto Detect">⚡ Auto Detect Platform</option>
                              <option value="YouTube">YouTube</option>
                              <option value="Instagram Reel">Instagram Reel</option>
                              <option value="Facebook Video">Facebook Video</option>
                              <option value="TikTok">TikTok</option>
                              <option value="Vimeo">Vimeo</option>
                              <option value="Google Drive">Google Drive</option>
                              <option value="Custom URL">Custom URL</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-gray-400 uppercase">Video URL</label>
                            <input
                              type="url"
                              placeholder="https://youtube.com/watch?v=... or reel/vimeo link"
                              value={activeItem.videoUrl || ''}
                              onChange={(e) => setActiveItem((prev: any) => ({ ...prev, videoUrl: e.target.value }))}
                              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer text-center text-white flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/10"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Portfolio Deliverable</span>
                    </button>
                  </form>
                )}

                {/* SERVICE FIELD FORM */}
                {modalType === 'service' && (
                  <form onSubmit={handleSaveService} className="space-y-4 text-xs text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Service Unique ID</label>
                      <input
                        type="text"
                        required
                        disabled={isEditMode}
                        placeholder="graphic-design"
                        value={activeItem.id}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Service Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Visual Graphic Artistry"
                        value={activeItem.title}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Lucide Icon Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Palette, Video, or Sparkles"
                        value={activeItem.icon}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, icon: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Description</label>
                      <textarea
                        required
                        rows={3}
                        value={activeItem.description}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase block">Nested Catalog list (Comma separated)</label>
                      <input
                        type="text"
                        required
                        value={activeItem.items.join(', ')}
                        placeholder="Logo Design, Banner Layout, Stationery Design"
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, items: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>

                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer text-center text-white">
                      Save Service Info
                    </button>
                  </form>
                )}

                {/* SKILL FIELD FORM */}
                {modalType === 'skill' && (
                  <form onSubmit={handleSaveSkill} className="space-y-4 text-xs text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Tool Name</label>
                      <input
                        type="text"
                        required
                        disabled={isEditMode}
                        placeholder="Adobe Premiere Pro"
                        value={activeItem.name}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Proficiency Level (0-100%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={activeItem.level}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, level: Number(e.target.value) }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Category Group</label>
                      <select
                        value={activeItem.category}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-300"
                      >
                        {skillCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Icon Label</label>
                      <input
                        type="text"
                        required
                        value={activeItem.icon}
                        placeholder="Layers, Film, PenTool, Tv"
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, icon: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>

                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer text-center text-white">
                      Save Tool Skill
                    </button>
                  </form>
                )}

                {/* EXPERIENCE TIMELINE FIELD FORM */}
                {modalType === 'experience' && (
                  <form onSubmit={handleSaveExperience} className="space-y-4 text-xs text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Role / Position</label>
                      <input
                        type="text"
                        required
                        placeholder="Lead Freelance Art Director"
                        value={activeItem.role}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, role: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Company / Agency</label>
                        <input
                          type="text"
                          required
                          placeholder="Independent Consultancy"
                          value={activeItem.company}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, company: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Period / Timeline</label>
                        <input
                          type="text"
                          required
                          placeholder="2023 - Present"
                          value={activeItem.period}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, period: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Narrative Description</label>
                      <textarea
                        required
                        rows={3}
                        value={activeItem.description}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Major Bullet Highlights (Comma separated)</label>
                      <textarea
                        required
                        rows={3}
                        value={activeItem.highlights.join('\n')}
                        placeholder="Successfully delivered 25+ identity campaigns.&#10;Grew social client CTR rates by 40%."
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, highlights: e.target.value.split('\n').map((x: string) => x.trim()).filter(Boolean) }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 leading-relaxed"
                      />
                    </div>

                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer text-center text-white">
                      Save Milestone Details
                    </button>
                  </form>
                )}

                {/* TESTIMONIAL FIELD FORM */}
                {modalType === 'testimonial' && (
                  <form onSubmit={handleSaveTestimonial} className="space-y-4 text-xs text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Client Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Michael Jenkins"
                          value={activeItem.name}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Role / Position</label>
                        <input
                          type="text"
                          required
                          placeholder="CEO & Founder"
                          value={activeItem.role}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, role: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Company Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Nexus Technologies Ltd."
                          value={activeItem.company}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, company: e.target.value }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Rating Score (1-5)</label>
                        <select
                          value={activeItem.rating}
                          onChange={(e) => setActiveItem((prev: any) => ({ ...prev, rating: Number(e.target.value) }))}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-300"
                        >
                          {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Client Feedback / Comment</label>
                      <textarea
                        required
                        rows={4}
                        value={activeItem.comment}
                        onChange={(e) => setActiveItem((prev: any) => ({ ...prev, comment: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 leading-relaxed"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-gray-950 border border-gray-850 space-y-2">
                      <span className="text-[10px] font-mono text-gray-500 block uppercase font-bold">Client Avatar image</span>
                      <div className="flex items-center space-x-3">
                        <img src={activeItem.avatar} alt="Avatar preview" className="w-10 h-10 object-cover rounded-xl border border-gray-800" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => triggerFileUpload('image')}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-850 rounded-lg font-mono text-[9px] tracking-wider text-gray-300 hover:text-white cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                          <span>Upload Image</span>
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer text-center text-white">
                      Save Testimonial
                    </button>
                  </form>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0a0f1d] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center space-x-3 text-red-400">
                <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-900/40">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-wide">Confirm Deletion</h3>
                  <p className="text-[11px] font-mono text-gray-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-white font-bold">"{itemToDelete.name}"</strong>? This project will be removed from both the Admin Dashboard and the public portfolio.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-red-500/20 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Project</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
