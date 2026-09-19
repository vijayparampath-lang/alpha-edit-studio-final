import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api, ExtendedPortfolioItem, subscribeToPortfolioChanges } from '../lib/supabase';
import { Search, Filter, Play, ChevronLeft, ChevronRight, X, ZoomIn, DollarSign, Calendar, User, Tag, ArrowLeft, Facebook, Twitter, Linkedin, LayoutGrid, Wrench } from 'lucide-react';
import PortfolioVideoPlayer from './PortfolioVideoPlayer';

const CATEGORIES = [
  'All',
  'Logo Design',
  'Social Media',
  'Posters',
  'Branding',
  'Video Editing',
  'Reels',
  'Motion Graphics',
  'UI Design'
];

export default function PortfolioGrid() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ExtendedPortfolioItem[]>([]);
  const [activeItem, setActiveItem] = useState<ExtendedPortfolioItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'video' | 'gallery'>('video');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await api.getPortfolioItems();
      // Filter Active projects by default unless they are admin, but since this is frontend, we only display Active status
      const activeProjects = data.filter(item => !item.status || item.status === 'Active');
      setItems(activeProjects);
    } catch (e: any) {
      console.error('Error loading portfolio items from CMS:', e);
      setLoadError(e?.message || 'Failed to load portfolio items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('cms-update', loadData);
    const unsubscribe = subscribeToPortfolioChanges(() => {
      loadData();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('cms-update', loadData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }, []);

  // Hash-based browser back and deep-linking support (including image zoom sub-route)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#project-')) {
        const isZoom = hash.endsWith('-zoom');
        const id = hash.replace('#project-', '').replace('-zoom', '');
        const found = items.find(item => String(item.id) === id);
        if (found) {
          setActiveItem(found);
          setActiveMediaTab(found.videoUrl ? 'video' : 'gallery');
          if (isZoom) {
            setLightboxOpen(true);
          } else {
            setLightboxOpen(false);
          }
        } else {
          setActiveItem(null);
          setLightboxOpen(false);
        }
      } else {
        setActiveItem(null);
        setLightboxOpen(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (items.length > 0) {
      handleHashChange();
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [items]);

  // Lock body scroll when Project Detail modal or lightbox is open to prevent background bleed and overlap
  useEffect(() => {
    if (activeItem || lightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeItem, lightboxOpen]);

  // Keyboard navigation support: ESC and Arrow keys for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          if (activeItem) {
            window.location.hash = `project-${activeItem.id}`;
          } else {
            setLightboxOpen(false);
          }
        } else if (activeItem) {
          handleBack();
        }
      } else if (lightboxOpen && activeItem) {
        const gallery = activeItem.images && activeItem.images.length > 0 ? activeItem.images : [activeItem.image];
        if (e.key === 'ArrowLeft') {
          setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
        } else if (e.key === 'ArrowRight') {
          setActiveImageIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, activeItem]);

  // Filter and search logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subcategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (item.client && item.client.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Modal Navigation
  const handleBack = () => {
    setActiveItem(null);
    window.location.hash = 'portfolio';
  };

  const handlePrevItem = () => {
    if (!activeItem) return;
    const currentIndex = filteredItems.findIndex((x) => x.id === activeItem.id);
    let prevItem: ExtendedPortfolioItem;
    if (currentIndex > 0) {
      prevItem = filteredItems[currentIndex - 1];
    } else {
      prevItem = filteredItems[filteredItems.length - 1]; // wrap to end
    }
    (window as any).vjProjectNavigated = true;
    window.location.hash = `project-${prevItem.id}`;
  };

  const handleNextItem = () => {
    if (!activeItem) return;
    const currentIndex = filteredItems.findIndex((x) => x.id === activeItem.id);
    let nextItem: ExtendedPortfolioItem;
    if (currentIndex < filteredItems.length - 1) {
      nextItem = filteredItems[currentIndex + 1];
    } else {
      nextItem = filteredItems[0]; // wrap to start
    }
    (window as any).vjProjectNavigated = true;
    window.location.hash = `project-${nextItem.id}`;
  };

  // Helper to render pricing structure
  const renderPricing = (item: ExtendedPortfolioItem) => {
    if (item.customPricingText) {
      return (
        <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
          {item.customPricingText}
        </span>
      );
    }

    if (item.price !== undefined && item.price !== null) {
      const isDiscounted = item.discountPrice !== undefined && item.discountPrice !== null && Number(item.discountPrice) > 0;
      return (
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          {item.isStartingFrom && <span className="text-gray-500 font-bold uppercase text-[9px]">Starting From</span>}
          {isDiscounted ? (
            <div className="flex items-center space-x-1.5">
              <span className="text-emerald-400 font-extrabold font-mono">${item.discountPrice}</span>
              <span className="text-gray-500 line-through text-[10px]">${item.price}</span>
            </div>
          ) : (
            <span className="text-amber-400 font-extrabold font-mono">${item.price}</span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <section id="work" className="py-20 md:py-28 bg-[#080808] relative overflow-hidden scroll-mt-20">
      {/* Backward-compatibility alias for #portfolio hash */}
      <div id="portfolio" className="sr-only" aria-hidden="true" />

      {/* Decorative Blur */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <span className="font-mono text-xs text-amber-500 font-bold uppercase tracking-[0.25em]">CREATIVE OUTPUT</span>
          <h2 className="font-sans text-3xl md:text-5xl font-black text-white tracking-tight mt-2">
            SELECTED CREATIVE WORK
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mt-4" />
        </div>

        {/* Search & Category Filter bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-[#121212] p-4 rounded-2xl border border-amber-500/20 backdrop-blur-sm shadow-xl">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none snap-x">
            <Filter className="w-4 h-4 text-amber-500 shrink-0 mr-1 hidden sm:block" />
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap snap-center cursor-pointer interactive-target ${
                    isActive
                      ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20'
                      : 'text-gray-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
            <input
              type="text"
              placeholder="Search assets, tags, clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-amber-500/20 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs font-mono font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid or Loading Skeleton */}
        {isLoading && items.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((skeletonId) => (
              <div
                key={skeletonId}
                className="rounded-2xl border border-amber-500/10 bg-[#121212] overflow-hidden shadow-xl animate-pulse flex flex-col h-full"
              >
                <div className="aspect-[4/3] bg-gray-900/80 w-full" />
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="h-4 bg-gray-800 rounded w-3/4" />
                    <div className="h-3 bg-gray-800/60 rounded w-full" />
                    <div className="h-3 bg-gray-800/60 rounded w-2/3" />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-amber-500/10">
                    <div className="h-4 bg-gray-800/60 rounded w-12" />
                    <div className="h-4 bg-gray-800/60 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const isVideoCategory = ['Video Editing', 'Reels', 'Motion Graphics'].includes(item.category);
                const pricingLine = renderPricing(item);

                return (
                  <motion.div
                    key={item.id}
                    layoutId={`portfolio-card-${item.id}`}
                    className="group relative rounded-2xl border border-amber-500/20 bg-[#121212] overflow-hidden shadow-xl hover:shadow-2xl hover:border-amber-500/40 transition-all duration-300 flex flex-col h-full cursor-pointer interactive-target"
                    onClick={() => {
                      setActiveItem(item);
                      setActiveImageIndex(0);
                      (window as any).vjProjectNavigated = true;
                      window.location.hash = `project-${item.id}`;
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Card Image Wrapper */}
                    <div className="relative overflow-hidden aspect-[4/3] bg-gray-950">
                      <img
                        src={item.image}
                        alt={`${item.title} - ${item.subcategory} Project Portfolio`}
                        title={item.title}
                        loading="lazy"
                        width="400"
                        height="300"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Dark gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />

                      {/* Media Type Indicator */}
                      <div className="absolute top-4 right-4 flex items-center space-x-1.5 z-10">
                        {item.images && item.images.length > 1 && (
                          <span className="px-2 py-1 rounded-full bg-black/85 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center space-x-1 shadow-lg backdrop-blur-sm">
                            <span>📷</span>
                            <span>{item.images.length}</span>
                          </span>
                        )}
                        {isVideoCategory || item.videoUrl ? (
                          <div className="p-2.5 rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/20">
                            <Play className="w-3.5 h-3.5 fill-black" />
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/20">
                            <ZoomIn className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Quick Category Tag */}
                      <span className="absolute bottom-4 left-4 text-[10px] font-mono font-bold tracking-widest text-amber-400 bg-black/90 px-2.5 py-1 rounded-full border border-amber-500/30">
                        {item.subcategory}
                      </span>
                    </div>

                    {/* Card Details Panel */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-sans font-bold text-sm text-white tracking-wide group-hover:text-amber-400 transition-colors">
                            {item.title}
                          </h3>
                          {pricingLine && (
                            <div className="shrink-0 mt-0.5">
                              {pricingLine}
                            </div>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Card Footer Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-amber-500/10">
                        {item.tags && item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[9px] font-mono font-medium text-amber-400/80 bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-500/20">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty States */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-20 bg-[#121212] border border-dashed border-amber-500/30 rounded-3xl">
            <LayoutGrid className="w-10 h-10 text-amber-500/60 mx-auto mb-4" />
            <h3 className="text-white font-bold text-base">No portfolio projects published yet</h3>
            <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">Portfolio projects published in the database will appear here.</p>
          </div>
        )}

        {!isLoading && items.length > 0 && filteredItems.length === 0 && (
          <div className="text-center py-20 bg-[#121212] border border-dashed border-amber-500/30 rounded-3xl">
            <Search className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h3 className="text-white font-bold text-base">No creative items match your filters</h3>
            <p className="text-gray-400 text-xs mt-1 max-w-md mx-auto">Try typing a different search query or expanding your category selection filter.</p>
          </div>
        )}

        {/* Project Details Modal */}
        <AnimatePresence>
          {activeItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleBack}
              />

              {/* Modal Card content */}
              <motion.div
                layoutId={`portfolio-card-${activeItem.id}`}
                className="relative bg-[#0d0d0d] border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden shadow-2xl shadow-amber-950/20 flex flex-col z-10 my-auto"
              >
                {/* Modal Header controls */}
                <div className="flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b border-amber-500/20 bg-[#121212] z-20 gap-2 sm:gap-4 shrink-0">
                  <div className="flex items-center min-w-0 flex-1 mr-1">
                    <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-amber-500 truncate block">
                      {activeItem.subcategory || activeItem.category || 'Project Detail'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    <button
                      onClick={handleBack}
                      className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold transition-colors cursor-pointer text-xs font-sans shadow-md shadow-amber-500/20 whitespace-nowrap active:scale-95"
                      title="Back to Gallery"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Back to Gallery</span>
                      <span className="inline sm:hidden">Back</span>
                    </button>
                    <div className="h-5 w-[1px] bg-amber-500/20 shrink-0 hidden xs:block" />
                    <button
                      onClick={handlePrevItem}
                      className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors cursor-pointer shrink-0 active:scale-95"
                      title="Previous Project"
                      aria-label="Previous Project"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextItem}
                      className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors cursor-pointer shrink-0 active:scale-95"
                      title="Next Project"
                      aria-label="Next Project"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleBack}
                      className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors cursor-pointer shrink-0 active:scale-95 ml-0.5"
                      title="Close"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal Scrollable container */}
                <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 space-y-6 bg-[#0d0d0d] overscroll-contain">
                  
                  {/* Media Mode Switcher (if project has both video and gallery images) */}
                  {activeItem.videoUrl && activeItem.images && activeItem.images.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pb-1">
                      <button
                        onClick={() => setActiveMediaTab('video')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                          activeMediaTab === 'video'
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'bg-black/60 text-gray-400 hover:text-white border border-amber-500/20 hover:border-amber-500/40'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Video Reel</span>
                      </button>

                      <button
                        onClick={() => setActiveMediaTab('gallery')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                          activeMediaTab === 'gallery'
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'bg-black/60 text-gray-400 hover:text-white border border-amber-500/20 hover:border-amber-500/40'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Gallery & Mockups ({activeItem.images.length})</span>
                      </button>
                    </div>
                  )}

                  {/* Media Presentation Display */}
                  <div className="rounded-xl overflow-hidden bg-black border border-amber-500/20 relative shadow-inner aspect-[16/9] w-full flex items-center justify-center">
                    {activeItem.videoUrl && activeMediaTab === 'video' ? (
                      <PortfolioVideoPlayer
                        videoUrl={activeItem.videoUrl}
                        videoPlatform={activeItem.videoPlatform}
                        posterUrl={activeItem.image}
                        title={activeItem.title}
                      />
                    ) : (
                      <div className="relative group/light w-full h-full cursor-zoom-in" onClick={() => { if (activeItem) { window.location.hash = `project-${activeItem.id}-zoom`; } setLightboxOpen(true); }}>
                        <img
                          src={activeItem.images && activeItem.images.length > 0 ? activeItem.images[activeImageIndex] : activeItem.image}
                          alt={`${activeItem.title} - Showcase Display - Visual Artwork`}
                          title={`${activeItem.title} - Display`}
                          loading="lazy"
                          width="800"
                          height="450"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover/light:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover/light:opacity-100 p-2">
                          <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#121212] text-[10px] sm:text-xs font-bold text-amber-400 tracking-wider uppercase border border-amber-500/30 flex items-center space-x-2 shadow-xl whitespace-nowrap">
                            <ZoomIn className="w-4 h-4 text-amber-500" />
                            <span>Click to Zoom Mockup</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
 
                  {/* Multiple Images Selector Strip (shown when viewing images) */}
                  {(!activeItem.videoUrl || activeMediaTab === 'gallery') && activeItem.images && activeItem.images.length > 1 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                          Select Deliverable to Preview ({activeImageIndex + 1} of {activeItem.images.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-0.5 scrollbar-thin">
                        {activeItem.images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`relative w-20 sm:w-24 h-14 sm:h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                              activeImageIndex === idx ? 'border-amber-500 scale-95 shadow-md shadow-amber-500/30' : 'border-amber-500/20 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img 
                              src={img} 
                              alt={`${activeItem.title} - Alternate View Thumbnail ${idx + 1}`}
                              title={`${activeItem.title} - Alternate View ${idx + 1}`}
                              loading="lazy"
                              width="96"
                              height="64"
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                            <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono px-1 rounded text-amber-400">
                              #{idx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata Matrix Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start pt-2">
                    {/* Information Narrative Column */}
                    <div className="md:col-span-8 space-y-5 sm:space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                        <h3 className="font-sans text-xl sm:text-2xl font-black text-white tracking-tight leading-snug break-words">
                          {activeItem.title}
                        </h3>
                        {renderPricing(activeItem) && (
                          <div className="self-start shrink-0 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl">
                            <span className="text-[10px] text-amber-400 font-mono block uppercase leading-none mb-1">Pricing Detail</span>
                            {renderPricing(activeItem)}
                          </div>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm md:text-base leading-relaxed break-words">
                        {activeItem.description}
                      </p>

                      {/* Case Study Deliverables & Mockups Grid */}
                      {activeItem.images && activeItem.images.length > 1 && (
                        <div className="pt-6 border-t border-amber-500/20 space-y-3.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="font-sans font-bold text-base text-white tracking-tight flex items-center space-x-2">
                                <span>Project Deliverables & Case Study Mockups</span>
                              </h4>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">
                                Select any deliverable to preview or view in fullscreen zoom mode
                              </p>
                            </div>
                            <span className="self-start sm:self-auto text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 shrink-0">
                              {activeItem.images.length} Assets
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                            {activeItem.images.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setActiveImageIndex(idx);
                                  if (activeItem) {
                                    window.location.hash = `project-${activeItem.id}-zoom`;
                                  }
                                  setLightboxOpen(true);
                                }}
                                className={`group/mockup relative rounded-xl overflow-hidden border cursor-pointer aspect-[4/3] bg-gray-950 transition-all ${
                                  activeImageIndex === idx
                                    ? 'border-amber-500 ring-2 ring-amber-500/40'
                                    : 'border-amber-500/20 hover:border-amber-500/60'
                                }`}
                              >
                                <img
                                  src={img}
                                  alt={`${activeItem.title} - Deliverable mockup ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover/mockup:scale-105 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover/mockup:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover/mockup:opacity-100">
                                  <span className="px-2.5 py-1.5 rounded-lg bg-black/85 text-[10px] font-mono font-bold text-amber-400 flex items-center space-x-1.5 border border-amber-500/40 shadow-lg">
                                    <ZoomIn className="w-3 h-3 text-amber-500" />
                                    <span>Zoom</span>
                                  </span>
                                </div>
                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-gray-300 border border-white/10">
                                  Deliverable #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Key-Value details Column */}
                    <div className="md:col-span-4 bg-[#121212] p-4 sm:p-5 rounded-2xl border border-amber-500/20 text-xs space-y-3.5 w-full">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center space-x-2 text-amber-500 font-mono shrink-0">
                          <User className="w-3.5 h-3.5" />
                          <span>CLIENT</span>
                        </div>
                        <span className="text-white font-bold text-right truncate ml-2">{activeItem.client || 'Agency Showcase'}</span>
                      </div>

                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center space-x-2 text-amber-500 font-mono shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>YEAR</span>
                        </div>
                        <span className="text-white font-bold">{activeItem.year}</span>
                      </div>

                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center space-x-2 text-amber-500 font-mono shrink-0">
                          <Tag className="w-3.5 h-3.5" />
                          <span>CATEGORY</span>
                        </div>
                        <span className="text-amber-400 font-bold text-right truncate ml-2">{activeItem.subcategory}</span>
                      </div>

                      {activeItem.link && (
                        <div className="pt-2">
                          <a
                            href={activeItem.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold tracking-wider uppercase transition-all shadow-lg shadow-amber-500/20"
                          >
                            <span>Visit Live Project</span>
                          </a>
                        </div>
                      )}

                      {activeItem.tools && activeItem.tools.length > 0 && (
                        <div className="pt-2 border-t border-amber-500/10">
                          <span className="text-amber-500 text-[10px] font-mono tracking-widest flex items-center space-x-1 mb-2 uppercase">
                            <Wrench className="w-3 h-3 text-amber-500 inline mr-1" />
                            <span>Tools & Software</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {activeItem.tools.map((tool) => (
                              <span key={tool} className="text-[10px] font-mono text-white bg-gray-900 px-2.5 py-1 rounded-md border border-amber-500/30">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-amber-500/10">
                        <span className="text-amber-500 text-[10px] font-mono tracking-widest block mb-2 uppercase">Tags</span>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {activeItem.tags && activeItem.tags.map((t) => (
                            <span key={t} className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-amber-500/20">
                        <span className="text-amber-500 text-[10px] font-mono tracking-widest block mb-2 uppercase">Share Project</span>
                        <div className="flex items-center flex-wrap gap-2">
                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black transition-all duration-200 cursor-pointer border border-amber-500/20"
                            title="Share on Facebook"
                            aria-label="Share on Facebook"
                          >
                            <Facebook className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out Alpha Edit Studio's creative project: ${activeItem.title}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black transition-all duration-200 cursor-pointer border border-amber-500/20"
                            title="Share on Twitter"
                            aria-label="Share on Twitter"
                          >
                            <Twitter className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black transition-all duration-200 cursor-pointer border border-amber-500/20"
                            title="Share on LinkedIn"
                            aria-label="Share on LinkedIn"
                          >
                            <Linkedin className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out Alpha Edit Studio's project: ${activeItem.title} - ${window.location.href}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black transition-all duration-200 cursor-pointer text-[10px] font-mono font-bold leading-none border border-amber-500/20"
                            title="Share on WhatsApp"
                            aria-label="Share on WhatsApp"
                          >
                            WA
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Image Full-Screen Lightbox Portal */}
        <AnimatePresence>
          {lightboxOpen && activeItem && (
            <div 
              className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/95 cursor-zoom-out"
              onClick={() => {
                window.location.hash = `project-${activeItem.id}`;
              }}
            >
              {/* Close Zoom Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.hash = `project-${activeItem.id}`;
                }}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 rounded-full bg-gray-900/90 text-white border border-gray-700 hover:bg-gray-800 hover:border-amber-500/50 cursor-pointer transition-colors z-[80] shadow-2xl"
                title="Close Zoom (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Lightbox Navigation Buttons (if project has multiple images) */}
              {activeItem.images && activeItem.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => 
                        prev > 0 ? prev - 1 : activeItem.images!.length - 1
                      );
                    }}
                    className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 p-2.5 sm:p-4 rounded-full bg-black/80 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/40 cursor-pointer transition-all z-[80] shadow-2xl"
                    title="Previous Image (Left Arrow)"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => 
                        prev < activeItem.images!.length - 1 ? prev + 1 : 0
                      );
                    }}
                    className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 p-2.5 sm:p-4 rounded-full bg-black/80 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/40 cursor-pointer transition-all z-[80] shadow-2xl"
                    title="Next Image (Right Arrow)"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  {/* Image Counter & Title Badge */}
                  <div 
                    className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-black/85 text-amber-400 border border-amber-500/30 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono text-[10px] sm:text-xs font-bold shadow-2xl z-[80] flex items-center space-x-2 sm:space-x-3 pointer-events-none max-w-[90%] truncate"
                  >
                    <span className="text-gray-300 truncate max-w-[150px] sm:max-w-[250px]">{activeItem.title}</span>
                    <span className="text-amber-500">•</span>
                    <span className="shrink-0">{activeImageIndex + 1} / {activeItem.images.length}</span>
                  </div>
                </>
              )}

              <motion.img
                key={`zoom-${activeImageIndex}`}
                src={activeItem.images && activeItem.images.length > 0 ? activeItem.images[activeImageIndex] : activeItem.image}
                alt={activeItem.title}
                className="max-w-full max-h-[85vh] sm:max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-default"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
