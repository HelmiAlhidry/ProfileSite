import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicSite from './views/PublicSite';
import AdminPanel from './views/AdminPanel';
import { fetchSiteData, saveSiteData, sendContactMessage, resetToTemplate } from './utils/api';

const hexToRgb = (hex) => {
  if (!hex) return '99, 102, 241';
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241';
};

const applyAccents = (data) => {
  if (!data || !data.settings) return;
  const accent = data.settings.accentColor || '#6366f1';
  const accentSecondary = data.settings.accentSecondaryColor || '#ec4899';
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-secondary', accentSecondary);
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accent));
};

function App() {
  const [siteData, setSiteData] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [currentLang, setCurrentLang] = useState('en');

  // Load site data on initial mount
  const loadData = async () => {
    try {
      const data = await fetchSiteData();
      setSiteData(data);
      
      // Load active theme
      const visitorTheme = localStorage.getItem('visitor_theme');
      const activeTheme = visitorTheme || data.settings?.theme || 'dark';
      setTheme(activeTheme);
      document.documentElement.setAttribute('data-theme', activeTheme);

      // Load active language
      const activeLang = data.settings?.language || 'en';
      setCurrentLang(activeLang);
      document.documentElement.setAttribute('dir', activeLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', activeLang);

      // Apply accents
      applyAccents(data);
    } catch (error) {
      console.error('Failed to load portfolio database:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update theme dynamically
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('visitor_theme', nextTheme);
  };

  // Toggle active site language (LTR vs RTL layout)
  const handleToggleLanguage = (langCode) => {
    setCurrentLang(langCode);
    document.documentElement.setAttribute('dir', langCode === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', langCode);
  };

  // Save changes from Admin Panel
  const handleSaveChanges = async (updatedData) => {
    const result = await saveSiteData(updatedData);
    if (result.success) {
      setSiteData(result.data);
      
      // Sync local states
      const activeTheme = result.data.settings?.theme || 'dark';
      setTheme(activeTheme);
      document.documentElement.setAttribute('data-theme', activeTheme);
      
      const activeLang = result.data.settings?.language || 'en';
      setCurrentLang(activeLang);
      document.documentElement.setAttribute('dir', activeLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', activeLang);

      // Apply accents
      applyAccents(result.data);
      return true;
    }
    return false;
  };

  // Reset to default template
  const handleResetData = async () => {
    try {
      const result = await resetToTemplate();
      if (result.success) {
        setSiteData(result.data);
        
        const defaultTheme = result.data.settings?.theme || 'dark';
        setTheme(defaultTheme);
        document.documentElement.setAttribute('data-theme', defaultTheme);
        
        const defaultLang = result.data.settings?.language || 'en';
        setCurrentLang(defaultLang);
        document.documentElement.setAttribute('dir', defaultLang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', defaultLang);

        // Apply accents
        applyAccents(result.data);
        alert('Database restored back to defaults successfully.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to reset database.');
    }
  };

  // Log contact messages
  const handleSendMessage = async (messageBody) => {
    try {
      await sendContactMessage(messageBody);
      // Reload server data to fetch new messages if admin is looking
      await loadData();
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Render initialization loading screen
  if (!siteData) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', backgroundColor: '#060a13', color: '#ffffff',
        fontFamily: "'Outfit', 'Tajawal', sans-serif", position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute', width: '300px', height: '300px',
          background: 'radial-gradient(circle, var(--accent, #6366f1) 0%, transparent 70%)',
          top: '20%', left: '20%', filter: 'blur(50px)', opacity: 0.15, pointerEvents: 'none'
        }}></div>
        <div style={{
          position: 'absolute', width: '300px', height: '300px',
          background: 'radial-gradient(circle, var(--accent-secondary, #ec4899) 0%, transparent 70%)',
          bottom: '20%', right: '20%', filter: 'blur(50px)', opacity: 0.15, pointerEvents: 'none'
        }}></div>

        <div className="glass" style={{
          padding: '40px 60px', borderRadius: '24px', textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(16px)', zIndex: 10, maxWidth: '90%', width: '450px'
        }}>
          {/* Neon Loader */}
          <div style={{
            position: 'relative', width: '64px', height: '64px', margin: '0 auto 28px'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              border: '4px solid rgba(99, 102, 241, 0.1)',
              borderTopColor: '#6366f1', borderBottomColor: '#ec4899',
              animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
            }}></div>
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Connecting to Database...
          </h3>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '16px', fontFamily: "'Tajawal', sans-serif" }}>
            جاري الاتصال بقاعدة البيانات...
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
            Synchronizing secure cloud schemas. Please wait.
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '0.85rem', fontFamily: "'Tajawal', sans-serif", marginTop: '2px' }}>
            مزامنة جداول البيانات السحابية. يرجى الانتظار.
          </p>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .glass {
              background: rgba(10, 15, 30, 0.7) !important;
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <PublicSite 
              data={siteData} 
              onSendMessage={handleSendMessage} 
              theme={theme}
              toggleTheme={handleToggleTheme}
              lang={currentLang}
              onToggleLang={handleToggleLanguage}
            />
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AdminPanel 
              data={siteData} 
              onSave={handleSaveChanges} 
              onReset={handleResetData}
              onRefreshData={loadData}
            />
          } 
        />
        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
