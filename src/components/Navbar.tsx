import { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, SettingsCMS } from '../lib/supabase';
import finalLogo from '../assets/images/final-logo.jpg';

interface NavbarProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  openResume: () => void;
  openAdmin: () => void;
  activeSection: string;
}

const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar({ activeSection }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [settings, setSettings] = useState<SettingsCMS>({
    websiteName: 'Alpha Edit Studio',
    logoText: 'AES',
    heroTitle: 'PREMIUM POST-PRODUCTION & CREATIVE BRANDING STUDIO',
    heroSubtitle: 'Crafting high-retention vertical videos, aesthetic brand vectors, and luxury identity systems that capture absolute attention.',
    whatsappNumber: '+91 93434 12416',
    footerText: 'Luxury post-production studio crafting original geometric vector branding structures and cinematic reels post-production assets for creators and agencies globally.',
    copyrightText: '© 2026 Alpha Edit Studio. All rights reserved.',
    seoTitle: 'Alpha Edit Studio | Premium Post-Production & Branding Agency',
    seoDescription: 'Official portfolio of Alpha Edit Studio - Video Editing, Graphic Design, and Branding Specialist.',
    themeColor: '#f59e0b',
    accentColor: '#eab308'
  });

  const loadNavbarSettings = async () => {
    try {
      const setts = await api.getSettings();
      setSettings(setts);
    } catch (e) {
      console.error('Failed to load navbar settings:', e);
    }
  };

  useEffect(() => {
    loadNavbarSettings();
    window.addEventListener('cms-update', loadNavbarSettings);
    return () => window.removeEventListener('cms-update', loadNavbarSettings);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#080808]/95 border-b border-amber-500/20 backdrop-blur-md shadow-2xl shadow-amber-950/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      {/* Scroll Progress Bar */}
      <div
        className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 z-50 transition-all duration-75 shadow-sm shadow-amber-500/50"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6 relative">
        {/* Logo Branding */}
        <div className="flex items-center justify-start shrink-0">
          <a href="#home" className="flex items-center space-x-3 group interactive-target">
            <img
              src={finalLogo}
              alt="Alpha Edit Studio Official Logo"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = '/final-logo.jpg'; }}
              className="w-9 h-9 sm:w-10 sm:h-10 aspect-square object-contain rounded-xl shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300 ring-1 ring-amber-500/30 bg-black/40 p-0.5 shrink-0"
            />
            <div className="flex flex-col justify-center leading-tight">
              <span className="font-sans font-black text-sm tracking-wider uppercase group-hover:text-amber-400 transition-colors whitespace-nowrap text-white">
                {settings.websiteName}
              </span>
              <span className="text-[9px] font-mono tracking-[0.25em] uppercase leading-none text-amber-400/90 font-semibold whitespace-nowrap mt-0.5">
                Post-Production & Design
              </span>
            </div>
          </a>
        </div>

        {/* Clean Desktop Navigation Links */}
        <nav className="hidden md:flex items-center justify-center space-x-7 lg:space-x-10 shrink-0">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.href.slice(1);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`relative py-1 font-sans text-xs uppercase tracking-[0.22em] font-semibold transition-colors duration-200 interactive-target whitespace-nowrap flex items-center h-8 ${
                  isActive
                    ? 'text-amber-400 font-extrabold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="activeIndicator"
                    className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-sm shadow-amber-500/50"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Desktop CTA & Mobile Hamburger */}
        <div className="flex items-center justify-end space-x-3 shrink-0">
          <a
            href="#contact"
            aria-label="Start a Project or Contact Studio"
            className="hidden sm:inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black tracking-widest uppercase transition-all shadow-md shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer interactive-target"
          >
            <span>Let's Talk</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </a>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay - Compact & Professional */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 w-screen h-screen z-[99999] p-6 flex flex-col justify-between bg-[#080808]/98 backdrop-blur-2xl overflow-y-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 border-b border-amber-500/20">
                <div className="flex items-center space-x-3">
                  <img
                    src={finalLogo}
                    alt="Alpha Edit Studio Logo"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/final-logo.jpg'; }}
                    className="w-10 h-10 aspect-square object-contain rounded-xl ring-1 ring-amber-500/30 bg-black/40 p-0.5 shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-sans font-black text-sm tracking-wider text-white uppercase">ALPHA EDIT STUDIO</span>
                    <span className="text-[9px] font-mono tracking-widest text-amber-400 font-semibold uppercase">Agency Portfolio</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close Navigation Drawer"
                  className="p-2.5 rounded-xl transition-colors bg-amber-500/10 text-amber-400 hover:text-white border border-amber-500/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Compact Mobile Navigation List: HOME, WORK, SERVICES, ABOUT, CONTACT */}
              <nav className="flex flex-col space-y-3 pt-8">
                {NAV_ITEMS.map((item, idx) => {
                  const isActive = activeSection === item.href.slice(1);
                  return (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`font-sans text-sm font-extrabold uppercase tracking-[0.25em] transition-all py-3 px-3 rounded-xl flex items-center justify-between ${
                        isActive
                          ? 'text-amber-400 bg-amber-500/10 border-l-4 border-amber-400'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                      )}
                    </motion.a>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Footer CTA */}
            <div className="pt-6 border-t border-amber-500/20 flex flex-col space-y-4">
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black uppercase tracking-widest text-center shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2"
              >
                <span>Let's Talk • Start a Project</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </a>
              <p className="text-center text-[10px] text-amber-500/70 font-mono tracking-widest uppercase">
                ALPHA EDIT STUDIO • CREATIVE AGENCY
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
