import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Briefcase, GraduationCap, Award, Phone, Mail, MapPin, Globe, CheckCircle, FileText, ExternalLink, Printer } from 'lucide-react';
import { api, AboutCMS, ContactCMS } from '../lib/supabase';
import { Experience, Skill } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import finalLogo from '../assets/images/final-logo.jpg';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  const [activeTab, setActiveTab] = useState<'interactive' | 'pdf'>('interactive');
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [about, setAbout] = useState<AboutCMS>({
    name: 'Alpha Edit Studio',
    title: 'Creative Agency Credentials & Capabilities',
    bio: 'Alpha Edit Studio is an elite Visual Production Studio based in Indore, M.P., India. We specialize in high-end vector branding, luxury identity design, and premium cinematic video post-production.',
    profileImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    resumeUrl: ''
  });
  const [timeline, setTimeline] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [contact, setContact] = useState<ContactCMS>({
    email: 'alphaeditstudio8@gmail.com',
    phone: '+91 93434 12416',
    address: 'Indore, M.P., India'
  });
  const [loading, setLoading] = useState(true);
  const [safePdfUrl, setSafePdfUrl] = useState<string>('');

  useEffect(() => {
    let objectUrl = '';
    if (about.resumeUrl) {
      if (about.resumeUrl.startsWith('data:application/pdf;base64,')) {
        try {
          const parts = about.resumeUrl.split(';base64,');
          const contentType = parts[0].split(':')[1] || 'application/pdf';
          const byteCharacters = atob(parts[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          objectUrl = URL.createObjectURL(blob);
          setSafePdfUrl(objectUrl);
        } catch (e) {
          console.error('Error creating Object URL:', e);
          setSafePdfUrl(about.resumeUrl);
        }
      } else {
        setSafePdfUrl(about.resumeUrl);
      }
    } else {
      setSafePdfUrl('');
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [about.resumeUrl]);

  const loadResumeData = async () => {
    try {
      setLoading(true);
      const aData = await api.getAbout();
      const tData = await api.getExperiences();
      const sData = await api.getSkills();
      const cData = await api.getContact();

      setAbout(aData);
      setTimeline(tData);
      setSkills(sData);
      setContact(cData);

      // Auto toggle to PDF view if it is present and configured
      if (aData.resumeUrl) {
        setActiveTab('pdf');
      } else {
        setActiveTab('interactive');
      }
    } catch (e) {
      console.error('Failed to load resume CMS details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadResumeData();
    }
  }, [isOpen]);

  // Listen for real-time cms updates
  useEffect(() => {
    window.addEventListener('cms-update', loadResumeData);
    return () => window.removeEventListener('cms-update', loadResumeData);
  }, []);

  // Helper to get safe base64 image data URL
  const getImageDataUrl = async (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 64;
          canvas.height = img.naturalHeight || 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
            return;
          }
        } catch {
          // fallback
        }
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  };

  // Generate printable HTML document markup
  const buildCvHtml = (logoBase64: string) => {
    const skillsList = skills.length > 0 ? skills : [
      { name: 'Adobe Photoshop', level: 95, category: 'Design', icon: 'Layers' },
      { name: 'Adobe Illustrator', level: 95, category: 'Design', icon: 'Layers' },
      { name: 'Adobe Premiere Pro', level: 98, category: 'Video', icon: 'Film' },
      { name: 'After Effects', level: 90, category: 'Video', icon: 'Film' },
      { name: 'Figma Prototyping', level: 92, category: 'UI', icon: 'Layout' },
      { name: 'DaVinci Resolve', level: 88, category: 'Video', icon: 'Film' }
    ];

    const expList = timeline.length > 0 ? timeline : [
      {
        id: '1',
        role: 'Lead Video Producer & Visual Art Director',
        company: 'Alpha Edit Studio, Indore',
        period: '2022 - Present',
        description: 'Directing high-retention video editing pipelines, brand identities, and high-impact motion assets for global brands and content creators.',
        highlights: [
          'Managed 100+ creative post-production deliverables across international campaigns',
          'Spearheaded viral vertical content strategies generating over 50M+ collective impressions',
          'Engineered bespoke vector identity systems for luxury, e-commerce, and tech startups'
        ]
      }
    ];

    const skillsHtml = skillsList.map(s => `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 2px;">
          <span>${s.name}</span>
          <span>${s.level}%</span>
        </div>
        <div style="width: 100%; background-color: #e2e8f0; height: 5px; border-radius: 9999px; overflow: hidden;">
          <div style="background-color: #f59e0b; width: ${s.level}%; height: 100%;"></div>
        </div>
      </div>
    `).join('');

    const expHtml = expList.map(item => `
      <div style="margin-bottom: 18px; border-left: 2px solid #f59e0b; padding-left: 14px; margin-left: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px;">
          <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${item.role}</span>
          <span style="font-size: 10px; font-family: monospace; color: #d97706; font-weight: 600; background-color: #fffbeb; padding: 2px 6px; border-radius: 4px;">${item.period}</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">${item.company}</div>
        <p style="font-size: 11px; color: #334155; line-height: 1.5; margin: 0 0 6px 0;">${item.description}</p>
        ${item.highlights && item.highlights.length > 0 ? `
          <ul style="margin: 0; padding-left: 14px; font-size: 10.5px; color: #475569; line-height: 1.4;">
            ${item.highlights.map(h => `<li style="margin-bottom: 3px;">${h}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('');

    return `
      <div style="border: 1px solid #e2e8f0; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); background-color: #ffffff; color: #1e293b; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
        <!-- Header Card -->
        <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${logoBase64}" alt="Alpha Edit Studio Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; background-color: #080808; padding: 2px;" />
              <div>
                <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: -0.02em;">${about.name}</h1>
                <p style="font-size: 11px; font-weight: 700; color: #d97706; margin: 3px 0 0 0; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">${about.title}</p>
              </div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.6;">
              <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">📍 ${contact.address}</div>
              <div>✉️ ${contact.email}</div>
              <div>📞 ${contact.phone}</div>
              <div>🌐 alphaeditstudio.com</div>
            </div>
          </div>
        </div>

        <!-- Professional Biography -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Studio Overview</h2>
          <p style="font-size: 11.5px; color: #334155; line-height: 1.6; margin: 0;">${about.bio}</p>
        </div>

        <!-- Two Column Grid -->
        <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px;">
          <!-- Left Column: Work Experience -->
          <div>
            <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Experience & Track Record</h2>
            <div>
              ${expHtml}
            </div>
          </div>

          <!-- Right Column: Skills & Details -->
          <div>
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Technical Skills</h2>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${skillsHtml}
              </div>
            </div>

            <div>
              <h2 style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Core Capabilities</h2>
              <div style="font-size: 11px; color: #334155; line-height: 1.6;">
                <div style="margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px;">
                  <span style="color: #f59e0b;">✦</span>
                  <div><strong>Cinematic Video Post-Production</strong><br/>Premiere Pro, DaVinci Resolve & After Effects.</div>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px;">
                  <span style="color: #f59e0b;">✦</span>
                  <div><strong>Brand Identity & Vector Systems</strong><br/>High-end vector and visual identity packaging.</div>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px;">
                  <span style="color: #f59e0b;">✦</span>
                  <div><strong>Motion Graphics & Vertical Reels</strong><br/>High-retention social commercials & motion reveal assets.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Credit -->
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; text-align: center; font-size: 9px; color: #94a3b8; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em;">
          Generated via Alpha Edit Studio CMS Engine • Indore, M.P., India • Confidential Document
        </div>
      </div>
    `;
  };

  const handleDownloadInteractiveCV = async () => {
    setIsGeneratingCV(true);
    setCvError(null);
    try {
      // 1. Get base64 data url for the logo
      const logoBase64 = await getImageDataUrl(finalLogo || '/final-logo.jpg');

      // 2. Create offscreen capture node
      const printContainer = document.createElement('div');
      printContainer.style.position = 'fixed';
      printContainer.style.left = '0';
      printContainer.style.top = '0';
      printContainer.style.width = '820px';
      printContainer.style.backgroundColor = '#ffffff';
      printContainer.style.color = '#1e293b';
      printContainer.style.padding = '40px';
      printContainer.style.boxSizing = 'border-box';
      printContainer.style.zIndex = '-9999';
      printContainer.style.opacity = '1';

      printContainer.innerHTML = buildCvHtml(logoBase64);
      document.body.appendChild(printContainer);

      // Brief delay for rendering styles
      await new Promise(resolve => setTimeout(resolve, 350));

      let pdfDownloaded = false;

      try {
        const canvas = await html2canvas(printContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('Alpha_Edit_Studio_Interactive_CV.pdf');
        pdfDownloaded = true;
      } catch (canvasErr) {
        console.warn('html2canvas capture warning, falling back to direct vector PDF:', canvasErr);
      }

      // Fallback: Direct vector jsPDF creation if canvas method encounters browser limitations
      if (!pdfDownloaded) {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        doc.setFillColor(8, 8, 8);
        doc.rect(0, 0, 210, 297, 'F');

        doc.setTextColor(245, 158, 11);
        doc.setFontSize(20);
        doc.text(about.name.toUpperCase(), 20, 25);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text(about.title, 20, 33);

        doc.setFontSize(9);
        doc.setTextColor(180, 180, 180);
        doc.text(`Location: ${contact.address}`, 20, 42);
        doc.text(`Email: ${contact.email} | Phone: ${contact.phone}`, 20, 47);
        doc.text(`Website: https://alphaeditstudio.com`, 20, 52);

        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.5);
        doc.line(20, 56, 190, 56);

        doc.setTextColor(245, 158, 11);
        doc.setFontSize(13);
        doc.text('STUDIO OVERVIEW', 20, 66);

        doc.setTextColor(230, 230, 230);
        doc.setFontSize(9.5);
        const splitBio = doc.splitTextToSize(about.bio, 170);
        doc.text(splitBio, 20, 73);

        doc.setTextColor(245, 158, 11);
        doc.setFontSize(13);
        doc.text('WORK EXPERIENCE', 20, 95);

        let yPos = 103;
        (timeline.length > 0 ? timeline : [{ role: 'Lead Video Editor', company: 'Alpha Edit Studio', period: '2022 - Present', description: 'Post-production and branding' }]).forEach(item => {
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10.5);
          doc.text(`${item.role} - ${item.company}`, 20, yPos);
          doc.setTextColor(245, 158, 11);
          doc.setFontSize(8.5);
          doc.text(`(${item.period})`, 160, yPos);
          yPos += 5;
          doc.setTextColor(190, 190, 190);
          doc.setFontSize(9);
          const splitDesc = doc.splitTextToSize(item.description, 170);
          doc.text(splitDesc, 20, yPos);
          yPos += splitDesc.length * 4.5 + 4;
        });

        doc.save('Alpha_Edit_Studio_Interactive_CV.pdf');
      }

      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
    } catch (e: any) {
      console.error('Interactive CV conversion failed:', e);
      setCvError(e?.message || 'Failed to capture or build Interactive CV PDF document.');
    } finally {
      setIsGeneratingCV(false);
    }
  };

  const handlePrint = async () => {
    try {
      const existing = document.getElementById('print-resume-container');
      if (existing) existing.remove();

      const logoBase64 = await getImageDataUrl(finalLogo || '/final-logo.jpg');
      const printDiv = document.createElement('div');
      printDiv.id = 'print-resume-container';
      printDiv.innerHTML = buildCvHtml(logoBase64);
      document.body.appendChild(printDiv);

      window.print();

      setTimeout(() => {
        const el = document.getElementById('print-resume-container');
        if (el) el.remove();
      }, 1000);
    } catch (e) {
      console.error('Print trigger error:', e);
      window.print();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-[#070b13]/85 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Modal Container */}
            <motion.div
              className="relative bg-[#121212] border border-amber-500/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col z-10"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-amber-500/20 bg-[#080808] gap-4">
                <div>
                  <h3 className="font-sans text-lg sm:text-xl font-bold text-white tracking-tight">Professional Resume</h3>
                  <p className="text-xs text-amber-400 font-mono uppercase mt-0.5 tracking-wider">
                    {about.name} • {about.title}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-[#121212] border border-amber-500/20 p-0.5 rounded-xl">
                    <button
                      onClick={() => {
                        if (about.resumeUrl) {
                          setActiveTab('pdf');
                        }
                      }}
                      disabled={!about.resumeUrl}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        !about.resumeUrl
                          ? 'opacity-40 cursor-not-allowed text-gray-600 font-bold'
                          : activeTab === 'pdf'
                          ? 'bg-amber-500 text-black font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title={!about.resumeUrl ? "No Resume Uploaded" : "View Document PDF"}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{about.resumeUrl ? "Document PDF" : "No Resume Uploaded"}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('interactive')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        activeTab === 'interactive'
                          ? 'bg-amber-500 text-black font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Interactive CV</span>
                    </button>
                  </div>

                  {activeTab === 'interactive' && (
                    <button
                      onClick={handleDownloadInteractiveCV}
                      disabled={isGeneratingCV}
                      className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50"
                      title="Download Interactive CV as PDF"
                    >
                      {isGeneratingCV ? (
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Download Interactive CV as PDF</span>
                    </button>
                  )}

                  {activeTab === 'pdf' && safePdfUrl ? (
                    <a
                      href={safePdfUrl}
                      download={`Resume-${about.name.replace(/\s+/g, '-')}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>DOWNLOAD CV</span>
                    </a>
                  ) : (
                    <button
                      onClick={handlePrint}
                      className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>PRINT/EXPORT CV</span>
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-gray-400 hover:text-white transition-all cursor-pointer border border-amber-500/20"
                    aria-label="Close Resume Window"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body Content */}
              {cvError && (
                <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex items-center justify-between text-xs text-red-400">
                  <div className="flex items-center space-x-2">
                    <span>⚠️</span>
                    <span className="font-semibold">{cvError}</span>
                  </div>
                  <button onClick={() => setCvError(null)} className="text-[10px] font-bold uppercase tracking-wider hover:underline cursor-pointer">
                    Dismiss
                  </button>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4 flex-1">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <p className="text-xs font-mono text-gray-400">Loading profile credentials...</p>
                </div>
              ) : activeTab === 'pdf' && safePdfUrl ? (
                /* PDF DOCUMENT VIEWER MODE */
                <div className="p-4 bg-[#080808] overflow-hidden flex-1 flex flex-col items-stretch h-[65vh]">
                  <iframe
                    src={safePdfUrl}
                    className="w-full h-full border-0 rounded-xl bg-white shadow-inner flex-1"
                    title="Resume PDF Document preview"
                  />
                  <div className="pt-3 text-center">
                    <p className="text-[10px] font-mono text-gray-500">
                      Problems displaying PDF? <a href={safePdfUrl} target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300 inline-flex items-center space-x-1"><span>Open in a new tab</span><ExternalLink className="w-3 h-3 ml-0.5 inline" /></a>
                    </p>
                  </div>
                </div>
              ) : (
                /* INTERACTIVE HTML/CSS DIGITAL CV */
                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 font-sans text-sm text-gray-300 space-y-6 sm:space-y-8 select-text">
                  
                  {/* Profile Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#080808] p-4 sm:p-6 rounded-2xl border border-amber-500/20">
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={finalLogo}
                          alt="Alpha Edit Studio Official Logo"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/final-logo.jpg'; }}
                          className="w-10 h-10 aspect-square object-contain rounded-xl shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/30 bg-black/40 p-0.5 shrink-0"
                        />
                        <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{about.name}</h4>
                      </div>
                      <p className="text-amber-400 font-medium text-xs sm:text-sm">{about.title}</p>
                      <p className="text-gray-400 leading-relaxed text-xs">
                        {about.bio || 'Alpha Edit Studio is an elite Visual Production Studio based in Indore, M.P., India.'}
                      </p>
                    </div>
                    <div className="space-y-2 border-t md:border-t-0 md:border-l border-amber-500/20 pt-4 md:pt-0 md:pl-6 text-xs">
                      <div className="flex items-center space-x-2 text-gray-400">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{contact.address}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>alphaeditstudio.com</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid Section: Experience & Sidebar */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                    
                    {/* Main Experience Column */}
                    <div className="lg:col-span-2 space-y-6">
                      <h5 className="text-white font-bold text-base flex items-center space-x-2 border-b border-amber-500/20 pb-2">
                        <Briefcase className="w-4 h-4 text-amber-400" />
                        <span>PROFESSIONAL EXPERIENCES</span>
                      </h5>

                      {timeline.length > 0 ? (
                        <div className="space-y-6">
                          {timeline.map((item) => (
                            <div key={item.id} className="space-y-2 relative pl-5 border-l-2 border-amber-500/30">
                              <div className="absolute w-3 h-3 bg-amber-500 rounded-full -left-[7px] top-1.5 ring-4 ring-[#121212]" />
                              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                                <h6 className="font-bold text-white text-sm">{item.role}</h6>
                                <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 mt-1 md:mt-0 self-start">
                                  {item.period}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 font-medium">{item.company}</p>
                              <p className="text-xs text-gray-300 leading-relaxed pt-1">
                                {item.description}
                              </p>
                              {item.highlights && item.highlights.length > 0 && (
                                <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 pl-1 pt-1">
                                  {item.highlights.map((h, hIdx) => (
                                    <li key={hIdx}>{h}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No professional milestones saved yet.</p>
                      )}
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                      
                      {/* Creative Stack */}
                      <div className="space-y-3 bg-[#080808] p-4 rounded-xl border border-amber-500/20">
                        <h5 className="text-white font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>Creative Skills</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {skills.length > 0 ? (
                            skills.map((s) => (
                              <span key={s.name} className="text-[10px] font-mono bg-[#121212] text-gray-300 px-2 py-0.5 rounded border border-amber-500/20">
                                {s.name} ({s.level}%)
                              </span>
                            ))
                          ) : (
                            ['Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'Adobe Premiere Pro', 'After Effects'].map((soft) => (
                              <span key={soft} className="text-[10px] font-mono bg-[#121212] text-gray-300 px-2 py-0.5 rounded border border-amber-500/20">
                                {soft}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Services Sidebar */}
                      <div className="space-y-3 bg-[#080808] p-4 rounded-xl border border-amber-500/20">
                        <h5 className="text-white font-bold text-xs uppercase tracking-widest">
                          Core Expertises
                        </h5>
                        <div className="space-y-2 text-xs">
                          {[
                            'Corporate Logo Systems',
                            'High-Retention Shorts & Reels',
                            'Branded Marketing Posters',
                            'Cinematic Vlog Grading',
                            'Figma Interface Prototyping',
                            'Advanced Photo Enhancements'
                          ].map((item) => (
                            <div key={item} className="flex items-center space-x-2 text-gray-300">
                              <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Education */}
                      <div className="space-y-3 bg-[#080808] p-4 rounded-xl border border-amber-500/20 text-xs">
                        <h5 className="text-white font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5">
                          <GraduationCap className="w-4 h-4 text-amber-400" />
                          <span>Education</span>
                        </h5>
                        <div className="space-y-1">
                          <p className="font-bold text-white">Bachelor of Fine Arts (BFA)</p>
                          <p className="text-gray-400 text-[11px]">Communication Design & Media Arts</p>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
