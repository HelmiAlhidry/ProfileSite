import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DynamicIcon from '../components/DynamicIcon';
import { fileToBase64, generateId, validateImportedData } from '../utils/helpers';
import { adminLogin, deleteContactMessage } from '../utils/api';

export const AdminPanel = ({ data, onSave, onReset, onRefreshData }) => {
  const navigate = useNavigate();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('general');

  // Custom Category States
  const [customSkillCategory, setCustomSkillCategory] = useState('');
  const [isCustomSkillCategory, setIsCustomSkillCategory] = useState(false);
  const [customProjCatEn, setCustomProjCatEn] = useState('');
  const [customProjCatAr, setCustomProjCatAr] = useState('');
  const [isCustomProjCategory, setIsCustomProjCategory] = useState(false);

  // Local data copy
  const [editedData, setEditedData] = useState(JSON.parse(JSON.stringify(data)));
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const [saveError, setSaveError] = useState('');
  const [newPasscode, setNewPasscode] = useState('');

  // Sync edits if parent data updates
  useEffect(() => {
    setEditedData(JSON.parse(JSON.stringify(data)));
  }, [data]);

  // Derive dynamic categories from data copy
  const uniqueSkillCategories = [...new Set((editedData.skills || []).map(s => s.category || 'General'))];
  
  const existingProjCats = [];
  const seenProjCats = new Set();
  (editedData.projects || []).forEach(p => {
    if (p.categoryEn && !seenProjCats.has(p.categoryEn)) {
      seenProjCats.add(p.categoryEn);
      existingProjCats.push({ en: p.categoryEn, ar: p.categoryAr || p.categoryEn });
    }
  });

  // Check login token
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!passcodeAttempt) return;
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const result = await adminLogin(passcodeAttempt);
      if (result.success) {
        setIsAuthenticated(true);
        onRefreshData(); // Reload inbox and fresh data from DB
      }
    } catch (err) {
      setAuthError(err.message || 'Incorrect passcode.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const triggerSave = async (customData = editedData) => {
    setSaveStatus('saving');
    setSaveError('');
    
    // Inject passcode update if typed
    const payload = JSON.parse(JSON.stringify(customData));
    if (newPasscode.trim()) {
      payload.settings.newPasscode = newPasscode.trim();
    }

    try {
      const success = await onSave(payload);
      if (success) {
        setSaveStatus('saved');
        setNewPasscode('');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('error');
        setSaveError('Failed to save settings.');
        setTimeout(() => { setSaveStatus(''); setSaveError(''); }, 5000);
      }
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err.message || 'Failed to save settings.');
      setTimeout(() => { setSaveStatus(''); setSaveError(''); }, 5000);
    }
  };

  // Helper to change general details
  const handleGeneralChange = (section, field, value) => {
    const updated = { ...editedData };
    updated[section][field] = value;
    setEditedData(updated);
  };

  const handleSocialChange = (platform, value) => {
    const updated = { ...editedData };
    if (!updated.personal.socialLinks) updated.personal.socialLinks = {};
    updated.personal.socialLinks[platform] = value;
    setEditedData(updated);
  };

  // Handle image conversion
  const handleImageUpload = async (e, section, field) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      const updated = { ...editedData };
      updated[section][field] = base64;
      setEditedData(updated);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Choose a smaller compressed file.');
    }
  };

  /* --- CRUD SECTION MANAGERS --- */

  // 1. SKILLS
  const [skillForm, setSkillForm] = useState({ id: '', nameEn: '', nameAr: '', category: 'Frontend', percentage: 90 });
  const [editingSkillId, setEditingSkillId] = useState(null);

  const handleSaveSkill = () => {
    if (!skillForm.nameEn) return;
    const finalCategory = isCustomSkillCategory ? (customSkillCategory.trim() || 'General') : skillForm.category;
    
    const updated = { ...editedData };
    const skillEntry = {
      ...skillForm,
      category: finalCategory
    };

    if (editingSkillId) {
      updated.skills = updated.skills.map(s => s.id === editingSkillId ? { ...skillEntry, id: editingSkillId } : s);
      setEditingSkillId(null);
    } else {
      updated.skills.push({ ...skillEntry, id: generateId('skill') });
    }
    setEditedData(updated);
    setSkillForm({ id: '', nameEn: '', nameAr: '', category: 'Frontend', percentage: 90 });
    setIsCustomSkillCategory(false);
    setCustomSkillCategory('');
    triggerSave(updated);
  };

  const handleEditSkill = (skill) => {
    setEditingSkillId(skill.id);
    setSkillForm(skill);
    setIsCustomSkillCategory(false);
    setCustomSkillCategory('');
  };

  const handleDeleteSkill = (id) => {
    if (!window.confirm('Delete this skill?')) return;
    const updated = { ...editedData };
    updated.skills = updated.skills.filter(s => s.id !== id);
    setEditedData(updated);
    triggerSave(updated);
  };

  // 2. TIMELINE (Experience & Education)
  const [timelineForm, setTimelineForm] = useState({ 
    id: '', 
    type: 'experience', 
    roleEn: '', roleAr: '',
    companyOrSchoolEn: '', companyOrSchoolAr: '',
    durationEn: '', durationAr: '',
    descriptionEn: '', descriptionAr: '' 
  });
  const [editingTimelineId, setEditingTimelineId] = useState(null);

  const handleSaveTimeline = () => {
    const form = timelineForm;
    if (!form.roleEn || !form.companyOrSchoolEn || !form.durationEn) return;
    
    const updated = { ...editedData };
    const targetArray = form.type === 'experience' ? 'experience' : 'education';
    
    const newEntry = {
      id: editingTimelineId || generateId('timeline'),
      roleEn: form.roleEn,
      roleAr: form.roleAr || form.roleEn,
      [form.type === 'experience' ? 'companyEn' : 'schoolEn']: form.companyOrSchoolEn,
      [form.type === 'experience' ? 'companyAr' : 'schoolAr']: form.companyOrSchoolAr || form.companyOrSchoolEn,
      durationEn: form.durationEn,
      durationAr: form.durationAr || form.durationEn,
      descriptionEn: form.descriptionEn,
      descriptionAr: form.descriptionAr || form.descriptionEn
    };

    if (editingTimelineId) {
      const wasExperience = updated.experience.some(e => e.id === editingTimelineId);
      
      if (wasExperience && form.type === 'experience') {
        updated.experience = updated.experience.map(e => e.id === editingTimelineId ? newEntry : e);
      } else if (!wasExperience && form.type === 'education') {
        updated.education = updated.education.map(e => e.id === editingTimelineId ? newEntry : e);
      } else {
        // Switched type! Remove from old list, append to new list
        if (wasExperience) {
          updated.experience = updated.experience.filter(e => e.id !== editingTimelineId);
          updated.education.push(newEntry);
        } else {
          updated.education = updated.education.filter(e => e.id !== editingTimelineId);
          updated.experience.push(newEntry);
        }
      }
      setEditingTimelineId(null);
    } else {
      updated[targetArray].push(newEntry);
    }
    
    setEditedData(updated);
    setTimelineForm({ 
      id: '', type: 'experience', 
      roleEn: '', roleAr: '',
      companyOrSchoolEn: '', companyOrSchoolAr: '',
      durationEn: '', durationAr: '',
      descriptionEn: '', descriptionAr: '' 
    });
    triggerSave(updated);
  };

  const handleEditTimeline = (item, type) => {
    setEditingTimelineId(item.id);
    setTimelineForm({
      id: item.id,
      type: type,
      roleEn: item.roleEn || '',
      roleAr: item.roleAr || '',
      companyOrSchoolEn: type === 'experience' ? (item.companyEn || '') : (item.schoolEn || ''),
      companyOrSchoolAr: type === 'experience' ? (item.companyAr || '') : (item.schoolAr || ''),
      durationEn: item.durationEn || '',
      durationAr: item.durationAr || '',
      descriptionEn: item.descriptionEn || '',
      descriptionAr: item.descriptionAr || ''
    });
  };

  const handleDeleteTimeline = (id, type) => {
    if (!window.confirm('Delete this timeline entry?')) return;
    const updated = { ...editedData };
    updated[type] = updated[type].filter(e => e.id !== id);
    setEditedData(updated);
    triggerSave(updated);
  };

  // 3. SERVICES
  const [serviceForm, setServiceForm] = useState({ id: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', price: '', icon: 'Code' });
  const [editingServiceId, setEditingServiceId] = useState(null);

  const handleSaveService = () => {
    if (!serviceForm.titleEn || !serviceForm.descriptionEn) return;
    const updated = { ...editedData };
    
    const serviceEntry = {
      ...serviceForm,
      titleAr: serviceForm.titleAr || serviceForm.titleEn,
      descriptionAr: serviceForm.descriptionAr || serviceForm.descriptionEn
    };

    if (editingServiceId) {
      updated.services = updated.services.map(s => s.id === editingServiceId ? { ...serviceEntry, id: editingServiceId } : s);
      setEditingServiceId(null);
    } else {
      updated.services.push({ ...serviceEntry, id: generateId('service') });
    }
    setEditedData(updated);
    setServiceForm({ id: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', price: '', icon: 'Code' });
    triggerSave(updated);
  };

  const handleDeleteService = (id) => {
    if (!window.confirm('Delete this service?')) return;
    const updated = { ...editedData };
    updated.services = updated.services.filter(s => s.id !== id);
    setEditedData(updated);
    triggerSave(updated);
  };

  // 4. PORTFOLIO / WORKS
  const [projectForm, setProjectForm] = useState({ id: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', categoryEn: 'Frontend', categoryAr: 'واجهة أمامية', image: '', link: '', tags: '' });
  const [editingProjectId, setEditingProjectId] = useState(null);

  const handleSaveProject = () => {
    if (!projectForm.titleEn) return;
    const finalCatEn = isCustomProjCategory ? (customProjCatEn.trim() || 'General') : projectForm.categoryEn;
    const finalCatAr = isCustomProjCategory ? (customProjCatAr.trim() || 'عام') : projectForm.categoryAr;

    const updated = { ...editedData };
    
    const formattedTags = typeof projectForm.tags === 'string'
      ? projectForm.tags.split(',').map(t => t.trim()).filter(t => t !== '')
      : projectForm.tags;

    const projectEntry = {
      ...projectForm,
      titleAr: projectForm.titleAr || projectForm.titleEn,
      descriptionAr: projectForm.descriptionAr || projectForm.descriptionEn,
      categoryEn: finalCatEn,
      categoryAr: finalCatAr,
      tags: formattedTags
    };

    if (editingProjectId) {
      updated.projects = updated.projects.map(p => p.id === editingProjectId ? { ...projectEntry, id: editingProjectId } : p);
      setEditingProjectId(null);
    } else {
      updated.projects.push({ ...projectEntry, id: generateId('project') });
    }
    setEditedData(updated);
    setProjectForm({ id: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', categoryEn: 'Frontend', categoryAr: 'واجهة أمامية', image: '', link: '', tags: '' });
    setIsCustomProjCategory(false);
    setCustomProjCatEn('');
    setCustomProjCatAr('');
    triggerSave(updated);
  };

  const handleProjectImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setProjectForm({ ...projectForm, image: base64 });
    } catch (err) {
      console.error(err);
      alert('Failed to convert cover image.');
    }
  };

  const handleDeleteProject = (id) => {
    if (!window.confirm('Delete this project?')) return;
    const updated = { ...editedData };
    updated.projects = updated.projects.filter(p => p.id !== id);
    setEditedData(updated);
    triggerSave(updated);
  };

  // 5. BLOG
  const [blogForm, setBlogForm] = useState({ 
    id: '', 
    titleEn: '', titleAr: '',
    categoryEn: 'General', categoryAr: 'عام',
    date: new Date().toISOString().split('T')[0], 
    readTimeEn: '5 min read', readTimeAr: 'قراءة في 5 دقائق',
    contentEn: '', contentAr: '' 
  });
  const [editingBlogId, setEditingBlogId] = useState(null);

  const handleSaveBlog = () => {
    if (!blogForm.titleEn || !blogForm.contentEn) return;
    const updated = { ...editedData };
    
    const blogEntry = {
      ...blogForm,
      titleAr: blogForm.titleAr || blogForm.titleEn,
      categoryAr: blogForm.categoryAr || blogForm.categoryEn,
      readTimeAr: blogForm.readTimeAr || blogForm.readTimeEn,
      contentAr: blogForm.contentAr || blogForm.contentEn
    };

    if (editingBlogId) {
      updated.blog = updated.blog.map(b => b.id === editingBlogId ? { ...blogEntry, id: editingBlogId } : b);
      setEditingBlogId(null);
    } else {
      updated.blog.push({ ...blogEntry, id: generateId('blog') });
    }
    setEditedData(updated);
    setBlogForm({ 
      id: '', titleEn: '', titleAr: '',
      categoryEn: 'General', categoryAr: 'عام',
      date: new Date().toISOString().split('T')[0], 
      readTimeEn: '5 min read', readTimeAr: 'قراءة في 5 دقائق',
      contentEn: '', contentAr: '' 
    });
    triggerSave(updated);
  };

  const handleDeleteBlog = (id) => {
    if (!window.confirm('Delete this article?')) return;
    const updated = { ...editedData };
    updated.blog = updated.blog.filter(b => b.id !== id);
    setEditedData(updated);
    triggerSave(updated);
  };

  // 6. MESSAGES (Inbox)
  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this message log from database?')) return;
    try {
      await deleteContactMessage(id);
      onRefreshData(); // Fetch fresh data list from server
    } catch (err) {
      alert(err.message || 'Failed to delete message.');
    }
  };

  // 7. DATA BACKUPS
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (validateImportedData(parsed)) {
          setEditedData(parsed);
          triggerSave(parsed);
          alert('Data backup file restored and saved successfully!');
        } else {
          alert('Invalid backup structure.');
        }
      } catch (err) {
        alert('Failed to read file.');
      }
    };
    reader.readAsText(file);
  };

  const triggerReset = () => {
    if (window.confirm('Reset database back to template defaults? All changes will be overridden.')) {
      onReset();
    }
  };

  const handleDownloadBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(editedData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `portfolio_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  /* --- LOGIN VIEW --- */
  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <div className="glass admin-login-card" style={{ direction: 'ltr' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', margin: '0 auto 20px'
          }}>
            <DynamicIcon name="Key" size={28} />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Database Access</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Verify passcode to sync with database.
          </p>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label htmlFor="admin-passcode">Admin Passcode</label>
              <input 
                type="password" 
                id="admin-passcode" 
                className="form-control" 
                placeholder="default is admin123" 
                value={passcodeAttempt}
                onChange={(e) => setPasscodeAttempt(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
            {authError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'left' }}>{authError}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isLoggingIn}>
              {isLoggingIn ? 'Verifying...' : 'Unlock Dashboard'}
            </button>
          </form>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', marginTop: '24px', color: 'var(--text-muted)' }}>
            <DynamicIcon name="ArrowLeft" size={14} /> Back to Live Site
          </Link>
        </div>
      </div>
    );
  }

  /* --- DASHBOARD LAYOUT --- */
  return (
    <div className="admin-layout" style={{ direction: 'ltr' }}>
      {/* Fullscreen Syncing Loader Overlay */}
      {saveStatus === 'saving' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(5, 8, 16, 0.75)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 99999, transition: 'all 0.3s ease', fontFamily: "'Outfit', 'Tajawal', sans-serif"
        }}>
          <div style={{
            padding: '36px 48px', borderRadius: '20px', textAlign: 'center',
            background: 'rgba(12, 18, 33, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            maxWidth: '90%', width: '420px'
          }}>
            <div style={{
              position: 'relative', width: '56px', height: '56px', margin: '0 auto 24px'
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                border: '4px solid rgba(236, 72, 153, 0.1)',
                borderTopColor: '#ec4899', borderBottomColor: '#6366f1',
                animation: 'spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite',
                boxShadow: '0 0 15px rgba(236, 72, 153, 0.2)'
              }}></div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
              Saving Changes...
            </h3>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '12px', fontFamily: "'Tajawal', sans-serif" }}>
              جاري حفظ التعديلات...
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
              Updating database in cloud. Please wait.
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '0.85rem', fontFamily: "'Tajawal', sans-serif", marginTop: '2px' }}>
              مزامنة البيانات على السيرفر. يرجى الانتظار.
            </p>
          </div>
        </div>
      )}
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Admin Panel</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bilingual SQL-JSON Database</span>
        </div>

        <nav className="admin-nav">
          <div className={`admin-nav-item ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
            <DynamicIcon name="User" size={18} /> General & About
          </div>
          <div className={`admin-nav-item ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>
            <DynamicIcon name="Sliders" size={18} /> Skill Metrics
          </div>
          <div className={`admin-nav-item ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
            <DynamicIcon name="Calendar" size={18} /> Experience & Edu
          </div>
          <div className={`admin-nav-item ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
            <DynamicIcon name="Database" size={18} /> Services
          </div>
          <div className={`admin-nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
            <DynamicIcon name="Layout" size={18} /> Works / Portfolio
          </div>
          <div className={`admin-nav-item ${activeTab === 'blog' ? 'active' : ''}`} onClick={() => setActiveTab('blog')}>
            <DynamicIcon name="Edit3" size={18} /> Blog Manager
          </div>
          <div className={`admin-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')} style={{ position: 'relative' }}>
            <DynamicIcon name="Mail" size={18} /> Client Inbox
            {editedData.messages && editedData.messages.length > 0 && (
              <span style={{
                position: 'absolute', right: '16px', top: '12px',
                background: 'var(--danger)', color: 'white', fontSize: '0.75rem',
                borderRadius: '10px', padding: '1px 6px', fontWeight: 'bold'
              }}>{editedData.messages.length}</span>
            )}
          </div>
          <div className={`admin-nav-item ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
            <DynamicIcon name="Download" size={18} /> Backup & Settings
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
            <DynamicIcon name="LogOut" size={16} /> Logout
          </button>
          <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
            <DynamicIcon name="ArrowLeft" size={16} /> Live Site
          </Link>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 style={{ textTransform: 'capitalize' }}>{activeTab} Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure and update bilingual contents.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {saveStatus === 'saving' && <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>Syncing Database...</span>}
            {saveStatus === 'saved' && <span style={{ color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <DynamicIcon name="CheckCircle" size={16} /> Database Updated!
            </span>}
            {saveStatus === 'error' && <span style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{saveError || 'Failed to update database.'}</span>}
            
            <button onClick={() => triggerSave()} className="btn btn-primary">
              <DynamicIcon name="Save" size={18} /> Save Settings
            </button>
          </div>
        </header>

        {/* --- TAB CONTENT: GENERAL & ABOUT --- */}
        {activeTab === 'general' && (
          <div>
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Personal Names & Titles</h2>
              <div className="admin-grid-2">
                <div className="form-group">
                  <label>Full Name (English)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editedData.personal.nameEn}
                    onChange={(e) => handleGeneralChange('personal', 'nameEn', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>الاسم الكامل (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editedData.personal.nameAr}
                    onChange={(e) => handleGeneralChange('personal', 'nameAr', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Professional Title (English)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editedData.personal.titleEn}
                    onChange={(e) => handleGeneralChange('personal', 'titleEn', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>المسمى الوظيفي (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editedData.personal.titleAr}
                    onChange={(e) => handleGeneralChange('personal', 'titleAr', e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Brief Bio Intro (English)</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={editedData.personal.bioEn}
                    onChange={(e) => handleGeneralChange('personal', 'bioEn', e.target.value)}
                  ></textarea>
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>النبذة التعريفية (العربية)</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={editedData.personal.bioAr}
                    onChange={(e) => handleGeneralChange('personal', 'bioAr', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="admin-grid-3" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={editedData.personal.email}
                    onChange={(e) => handleGeneralChange('personal', 'email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editedData.personal.phone}
                    onChange={(e) => handleGeneralChange('personal', 'phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Location (English)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editedData.personal.locationEn}
                    onChange={(e) => handleGeneralChange('personal', 'locationEn', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Profile Image / Avatar</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-control" 
                  onChange={(e) => handleImageUpload(e, 'personal', 'avatar')}
                />
                <div className="image-preview-wrapper">
                  <img src={editedData.personal.avatar} alt="Avatar" className="image-preview" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Instantly converts image to compressed Base64 string for database storage.</span>
                </div>
              </div>
            </div>

            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>About Full Biography Story</h2>
              <div className="admin-grid-2">
                <div className="form-group">
                  <label>Full Biography Story (English)</label>
                  <textarea 
                    className="form-control" 
                    rows="6" 
                    value={editedData.about.fullBioEn}
                    onChange={(e) => handleGeneralChange('about', 'fullBioEn', e.target.value)}
                  ></textarea>
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>القصة / السيرة الكاملة (العربية)</label>
                  <textarea 
                    className="form-control" 
                    rows="6" 
                    value={editedData.about.fullBioAr}
                    onChange={(e) => handleGeneralChange('about', 'fullBioAr', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="admin-grid-3" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={editedData.about.experienceYears}
                    onChange={(e) => handleGeneralChange('about', 'experienceYears', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label>Completed Projects</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={editedData.about.projectsCompleted}
                    onChange={(e) => handleGeneralChange('about', 'projectsCompleted', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label>Happy Clients Rating</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editedData.about.rating}
                    onChange={(e) => handleGeneralChange('about', 'rating', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Social Profiles</h2>
              <div className="admin-grid-2">
                {Object.keys(editedData.personal.socialLinks || {}).map(platform => (
                  <div className="form-group" key={platform}>
                    <label style={{ textTransform: 'capitalize' }}>{platform} URL</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editedData.personal.socialLinks[platform] || ''}
                      onChange={(e) => handleSocialChange(platform, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: SKILLS --- */}
        {activeTab === 'skills' && (
          <div>
              <div className="glass admin-card">
                <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>{editingSkillId ? 'Edit Skill Metric' : 'Add New Skill Metric'}</h2>
                <div className="admin-grid-3">
                  <div className="form-group">
                    <label>Skill Name (English)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. JavaScript"
                      value={skillForm.nameEn}
                      onChange={(e) => setSkillForm({ ...skillForm, nameEn: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                    <label>اسم المهارة (العربية)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="مثال: جافا سكريبت"
                      value={skillForm.nameAr}
                      onChange={(e) => setSkillForm({ ...skillForm, nameAr: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category Group</label>
                    <select 
                      className="form-control"
                      value={isCustomSkillCategory ? 'NEW_CUSTOM_CAT' : skillForm.category}
                      onChange={(e) => {
                        if (e.target.value === 'NEW_CUSTOM_CAT') {
                          setIsCustomSkillCategory(true);
                        } else {
                          setIsCustomSkillCategory(false);
                          setSkillForm({ ...skillForm, category: e.target.value });
                        }
                      }}
                    >
                      {uniqueSkillCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="NEW_CUSTOM_CAT">-- Create New Category... --</option>
                    </select>
                  </div>
                </div>

                {isCustomSkillCategory && (
                  <div className="form-group" style={{ marginTop: '16px', maxWidth: '400px' }}>
                    <label>New Custom Category Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Surgery, Marketing, SEO" 
                      value={customSkillCategory}
                      onChange={(e) => setCustomSkillCategory(e.target.value)}
                    />
                  </div>
                )}
              <div className="form-group" style={{ marginTop: '16px', maxWidth: '300px' }}>
                <label>Proficiency Percentage ({skillForm.percentage}%)</label>
                <input 
                  type="range" 
                  min="0" max="100" 
                  className="form-control"
                  style={{ padding: '0px' }}
                  value={skillForm.percentage}
                  onChange={(e) => setSkillForm({ ...skillForm, percentage: parseInt(e.target.value) })}
                />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button onClick={handleSaveSkill} className="btn btn-primary">
                  {editingSkillId ? 'Update Skill' : 'Add Skill'}
                </button>
                {editingSkillId && (
                  <button onClick={() => {
                    setEditingSkillId(null);
                    setSkillForm({ id: '', nameEn: '', nameAr: '', category: 'Frontend', percentage: 90 });
                  }} className="btn btn-secondary">Cancel</button>
                )}
              </div>
            </div>

            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Existing Skills</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name (EN)</th>
                    <th>الاسم (AR)</th>
                    <th>Category</th>
                    <th>Percentage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.skills.map(skill => (
                    <tr key={skill.id}>
                      <td>{skill.nameEn}</td>
                      <td>{skill.nameAr}</td>
                      <td><span className="badge">{skill.category}</span></td>
                      <td>{skill.percentage}%</td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleEditSkill(skill)} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                            <DynamicIcon name="Edit2" size={16} />
                          </button>
                          <button onClick={() => handleDeleteSkill(skill.id)} style={{ color: 'var(--danger)', cursor: 'pointer' }}>
                            <DynamicIcon name="Trash2" size={16} />
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

        {/* --- TAB CONTENT: TIMELINE --- */}
        {activeTab === 'timeline' && (
          <div>
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>{editingTimelineId ? 'Edit Timeline Entry' : 'Add New Timeline Entry'}</h2>
              <div className="admin-grid-3">
                <div className="form-group">
                  <label>Type</label>
                  <select 
                    className="form-control"
                    value={timelineForm.type}
                    onChange={(e) => setTimelineForm({ ...timelineForm, type: e.target.value })}
                  >
                    <option value="experience">Work Experience</option>
                    <option value="education">Education / Certificate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Role / Degree Title (English)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Senior Developer"
                    value={timelineForm.roleEn}
                    onChange={(e) => setTimelineForm({ ...timelineForm, roleEn: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>المسمى / الشهادة (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="مثال: مطور ويب أول"
                    value={timelineForm.roleAr}
                    onChange={(e) => setTimelineForm({ ...timelineForm, roleAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>{timelineForm.type === 'experience' ? 'Company Name (English)' : 'School Name (English)'}</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Google"
                    value={timelineForm.companyOrSchoolEn}
                    onChange={(e) => setTimelineForm({ ...timelineForm, companyOrSchoolEn: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>{timelineForm.type === 'experience' ? 'اسم الشركة (العربية)' : 'اسم المدرسة/الجامعة (العربية)'}</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="مثال: جوجل"
                    value={timelineForm.companyOrSchoolAr}
                    onChange={(e) => setTimelineForm({ ...timelineForm, companyOrSchoolAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Duration / Period (English)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. 2022 - Present"
                    value={timelineForm.durationEn}
                    onChange={(e) => setTimelineForm({ ...timelineForm, durationEn: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>الفترة الزمنية (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="مثال: 2022 - الآن"
                    value={timelineForm.durationAr}
                    onChange={(e) => setTimelineForm({ ...timelineForm, durationAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Description / Core Achievements (English)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={timelineForm.descriptionEn}
                    onChange={(e) => setTimelineForm({ ...timelineForm, descriptionEn: e.target.value })}
                  ></textarea>
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>تفاصيل الإنجازات (العربية)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={timelineForm.descriptionAr}
                    onChange={(e) => setTimelineForm({ ...timelineForm, descriptionAr: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button onClick={handleSaveTimeline} className="btn btn-primary">
                  {editingTimelineId ? 'Update Entry' : 'Add Entry'}
                </button>
                {editingTimelineId && (
                  <button onClick={() => {
                    setEditingTimelineId(null);
                    setTimelineForm({ 
                      id: '', type: 'experience', 
                      roleEn: '', roleAr: '',
                      companyOrSchoolEn: '', companyOrSchoolAr: '',
                      durationEn: '', durationAr: '',
                      descriptionEn: '', descriptionAr: '' 
                    });
                  }} className="btn btn-secondary">Cancel</button>
                )}
              </div>
            </div>

            {/* Experience List */}
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Experience List</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Role (EN)</th>
                    <th>الجهة (AR)</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.experience.map(exp => (
                    <tr key={exp.id}>
                      <td>{exp.roleEn}</td>
                      <td>{exp.companyAr}</td>
                      <td>{exp.durationEn}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleEditTimeline(exp, 'experience')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                            <DynamicIcon name="Edit2" size={16} />
                          </button>
                          <button onClick={() => handleDeleteTimeline(exp.id, 'experience')} style={{ color: 'var(--danger)', cursor: 'pointer' }}>
                            <DynamicIcon name="Trash2" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Education List */}
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Education List</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Degree (EN)</th>
                    <th>المدرسة (AR)</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.education.map(edu => (
                    <tr key={edu.id}>
                      <td>{edu.roleEn || edu.degreeEn}</td>
                      <td>{edu.schoolAr}</td>
                      <td>{edu.durationEn}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleEditTimeline(edu, 'education')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                            <DynamicIcon name="Edit2" size={16} />
                          </button>
                          <button onClick={() => handleDeleteTimeline(edu.id, 'education')} style={{ color: 'var(--danger)', cursor: 'pointer' }}>
                            <DynamicIcon name="Trash2" size={16} />
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

        {/* --- TAB CONTENT: SERVICES --- */}
        {activeTab === 'services' && (
          <div>
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>{editingServiceId ? 'Edit Service' : 'Add New Service'}</h2>
              <div className="admin-grid-3">
                <div className="form-group">
                  <label>Service Title (English)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={serviceForm.titleEn}
                    onChange={(e) => setServiceForm({ ...serviceForm, titleEn: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>اسم الخدمة (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={serviceForm.titleAr}
                    onChange={(e) => setServiceForm({ ...serviceForm, titleAr: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Starting Price</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. $1,200"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Service Description (English)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={serviceForm.descriptionEn}
                    onChange={(e) => setServiceForm({ ...serviceForm, descriptionEn: e.target.value })}
                  ></textarea>
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>تفاصيل الخدمة (العربية)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={serviceForm.descriptionAr}
                    onChange={(e) => setServiceForm({ ...serviceForm, descriptionAr: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px', maxWidth: '300px' }}>
                <label>Dynamic Lucide Icon Component</label>
                <select 
                  className="form-control"
                  value={serviceForm.icon}
                  onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}
                >
                  <option value="Code">Code (Developers)</option>
                  <option value="Database">Database (Backends)</option>
                  <option value="Palette">Palette (Designers)</option>
                  <option value="Smartphone">Smartphone (Mobile)</option>
                  <option value="TrendingUp">TrendingUp (Marketing)</option>
                  <option value="Megaphone">Megaphone (Publicity/Ads)</option>
                  <option value="Layout">Layout (UX)</option>
                  <option value="Globe">Globe (Websites)</option>
                  <option value="Cpu">Cpu (Hardware/Systems)</option>
                  <option value="Heart">Heart (Medical/Health)</option>
                  <option value="Activity">Activity (Clinical/Exercise)</option>
                  <option value="Users">Users (Coaching/Consulting)</option>
                  <option value="PenTool">PenTool (Writing/Content)</option>
                  <option value="DollarSign">DollarSign (Finance/Sales)</option>
                  <option value="Shield">Shield (Security/Legal)</option>
                  <option value="Award">Award (Certifications/Quality)</option>
                </select>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button onClick={handleSaveService} className="btn btn-primary">
                  {editingServiceId ? 'Update Service' : 'Add Service'}
                </button>
                {editingServiceId && (
                  <button onClick={() => {
                    setEditingServiceId(null);
                    setServiceForm({ id: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', price: '', icon: 'Code' });
                  }} className="btn btn-secondary">Cancel</button>
                )}
              </div>
            </div>

            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Active Services</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {editedData.services.map(ser => (
                  <div className="glass" key={ser.id} style={{ padding: '20px', position: 'relative' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '8px',
                      background: 'var(--accent-glow)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
                    }}>
                      <DynamicIcon name={ser.icon} size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{ser.titleEn} ({ser.titleAr})</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', height: '60px', overflow: 'hidden' }}>{ser.descriptionEn}</p>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{ser.price}</span>
                    
                    <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '10px' }}>
                      <button onClick={() => {
                        setEditingServiceId(ser.id);
                        setServiceForm(ser);
                      }} style={{ cursor: 'pointer', color: 'var(--accent)' }}>
                        <DynamicIcon name="Edit2" size={16} />
                      </button>
                      <button onClick={() => handleDeleteService(ser.id)} style={{ cursor: 'pointer', color: 'var(--danger)' }}>
                        <DynamicIcon name="Trash2" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: PORTFOLIO --- */}
        {activeTab === 'portfolio' && (
          <div>
              <div className="glass admin-card">
                <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>{editingProjectId ? 'Edit Project' : 'Add New Project'}</h2>
                <div className="admin-grid-2">
                  <div className="form-group">
                    <label>Project Title (English)</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={projectForm.titleEn}
                      onChange={(e) => setProjectForm({ ...projectForm, titleEn: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                    <label>عنوان المشروع (العربية)</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={projectForm.titleAr}
                      onChange={(e) => setProjectForm({ ...projectForm, titleAr: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Project Category</label>
                  <select 
                    className="form-control"
                    value={isCustomProjCategory ? 'NEW_CUSTOM_CAT' : `${projectForm.categoryEn}|${projectForm.categoryAr}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'NEW_CUSTOM_CAT') {
                        setIsCustomProjCategory(true);
                      } else {
                        setIsCustomProjCategory(false);
                        const [en, ar] = val.split('|');
                        setProjectForm({ ...projectForm, categoryEn: en, categoryAr: ar });
                      }
                    }}
                  >
                    {existingProjCats.map(cat => (
                      <option key={cat.en} value={`${cat.en}|${cat.ar}`}>{cat.en} ({cat.ar})</option>
                    ))}
                    <option value="NEW_CUSTOM_CAT">-- Create New Category... --</option>
                  </select>
                </div>

                {isCustomProjCategory && (
                  <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                    <div className="form-group">
                      <label>New Category (English)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Health, Finance, Analytics"
                        value={customProjCatEn}
                        onChange={(e) => setCustomProjCatEn(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                      <label>التصنيف الجديد (العربية)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="مثال: صحة، مالية، تحليلات"
                        value={customProjCatAr}
                        onChange={(e) => setCustomProjCatAr(e.target.value)}
                      />
                    </div>
                  </div>
                )}

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Demo Link / GitHub URL</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={projectForm.link}
                    onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Tech Stack Tags (Comma Separated)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. React, Node.js, MongoDB"
                    value={projectForm.tags}
                    onChange={(e) => setProjectForm({ ...projectForm, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Project Description (English)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={projectForm.descriptionEn}
                    onChange={(e) => setProjectForm({ ...projectForm, descriptionEn: e.target.value })}
                  ></textarea>
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>وصف المشروع تفصيلياً (العربية)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={projectForm.descriptionAr}
                    onChange={(e) => setProjectForm({ ...projectForm, descriptionAr: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Project Cover Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-control" 
                  onChange={handleProjectImageUpload}
                />
                <div className="image-preview-wrapper">
                  {projectForm.image ? (
                    <img src={projectForm.image} alt="Cover Preview" className="image-preview" />
                  ) : (
                    <div className="glass" style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <DynamicIcon name="Image" size={24} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button onClick={handleSaveProject} className="btn btn-primary">
                  {editingProjectId ? 'Update Project' : 'Add Project'}
                </button>
                {editingProjectId && (
                  <button onClick={() => {
                    setEditingProjectId(null);
                    setProjectForm({ id: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', categoryEn: 'Frontend', categoryAr: 'واجهة أمامية', image: '', link: '', tags: '' });
                  }} className="btn btn-secondary">Cancel</button>
                )}
              </div>
            </div>

            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Current Showcase Grid</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cover</th>
                    <th>Project Name (EN)</th>
                    <th>التصنيف (AR)</th>
                    <th>Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.projects.map(proj => (
                    <tr key={proj.id}>
                      <td>
                        {proj.image ? (
                          <img src={proj.image} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                            <DynamicIcon name="Image" size={16} />
                          </div>
                        )}
                      </td>
                      <td>{proj.titleEn}</td>
                      <td>{proj.categoryAr}</td>
                      <td>
                        {proj.link ? <a href={proj.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Open Link</a> : 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => {
                            setEditingProjectId(proj.id);
                            setIsCustomProjCategory(false);
                            setCustomProjCatEn('');
                            setCustomProjCatAr('');
                            setProjectForm({
                              id: proj.id,
                              titleEn: proj.titleEn,
                              titleAr: proj.titleAr || '',
                              descriptionEn: proj.descriptionEn || '',
                              descriptionAr: proj.descriptionAr || '',
                              categoryEn: proj.categoryEn || 'Frontend',
                              categoryAr: proj.categoryAr || 'واجهة أمامية',
                              image: proj.image || '',
                              link: proj.link || '',
                              tags: Array.isArray(proj.tags) ? proj.tags.join(', ') : proj.tags
                            });
                          }} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                            <DynamicIcon name="Edit2" size={16} />
                          </button>
                          <button onClick={() => handleDeleteProject(proj.id)} style={{ color: 'var(--danger)', cursor: 'pointer' }}>
                            <DynamicIcon name="Trash2" size={16} />
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

        {/* --- TAB CONTENT: BLOG --- */}
        {activeTab === 'blog' && (
          <div>
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>{editingBlogId ? 'Edit Article' : 'Write New Article'}</h2>
              <div className="admin-grid-3">
                <div className="form-group">
                  <label>Article Title (English)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={blogForm.titleEn}
                    onChange={(e) => setBlogForm({ ...blogForm, titleEn: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>عنوان المقال (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={blogForm.titleAr}
                    onChange={(e) => setBlogForm({ ...blogForm, titleAr: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Category (English)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={blogForm.categoryEn}
                    onChange={(e) => setBlogForm({ ...blogForm, categoryEn: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-3" style={{ marginTop: '16px' }}>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>التصنيف (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={blogForm.categoryAr}
                    onChange={(e) => setBlogForm({ ...blogForm, categoryAr: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Read Time Estimate (English)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={blogForm.readTimeEn}
                    onChange={(e) => setBlogForm({ ...blogForm, readTimeEn: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>تقدير وقت القراءة (العربية)</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={blogForm.readTimeAr}
                    onChange={(e) => setBlogForm({ ...blogForm, readTimeAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Article Date</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={blogForm.date}
                    onChange={(e) => setBlogForm({ ...blogForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Article Content (English)</label>
                  <textarea 
                    className="form-control"
                    rows="8"
                    value={blogForm.contentEn}
                    onChange={(e) => setBlogForm({ ...blogForm, contentEn: e.target.value })}
                  ></textarea>
                </div>
                <div className="form-group" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <label>محتوى المقال (العربية)</label>
                  <textarea 
                    className="form-control"
                    rows="8"
                    value={blogForm.contentAr}
                    onChange={(e) => setBlogForm({ ...blogForm, contentAr: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button onClick={handleSaveBlog} className="btn btn-primary">
                  {editingBlogId ? 'Update Article' : 'Publish Article'}
                </button>
                {editingBlogId && (
                  <button onClick={() => {
                    setEditingBlogId(null);
                    setBlogForm({ 
                      id: '', titleEn: '', titleAr: '',
                      categoryEn: 'General', categoryAr: 'عام',
                      date: new Date().toISOString().split('T')[0], 
                      readTimeEn: '5 min read', readTimeAr: 'قراءة في 5 دقائق',
                      contentEn: '', contentAr: '' 
                    });
                  }} className="btn btn-secondary">Cancel</button>
                )}
              </div>
            </div>

            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Published Articles</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title (EN)</th>
                    <th>العنوان (AR)</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.blog.map(article => (
                    <tr key={article.id}>
                      <td>{article.titleEn}</td>
                      <td>{article.titleAr}</td>
                      <td>{article.date}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => {
                            setEditingBlogId(article.id);
                            setBlogForm(article);
                          }} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                            <DynamicIcon name="Edit2" size={16} />
                          </button>
                          <button onClick={() => handleDeleteBlog(article.id)} style={{ color: 'var(--danger)', cursor: 'pointer' }}>
                            <DynamicIcon name="Trash2" size={16} />
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

        {/* --- TAB CONTENT: MESSAGES --- */}
        {activeTab === 'messages' && (
          <div>
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Messages Inbox</h2>
              {(!editedData.messages || editedData.messages.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <DynamicIcon name="Inbox" size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p>Inbox is empty.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {editedData.messages.map(msg => (
                    <div className="glass" key={msg.id} style={{ padding: '24px', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', marginBottom: '2px' }}>{msg.subject}</h3>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            From: <strong>{msg.name}</strong> ({msg.email})
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(msg.date).toLocaleString()}
                        </span>
                      </div>
                      <p style={{
                        whiteSpace: 'pre-line', fontSize: '0.95rem',
                        background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--border-radius-sm)',
                        color: 'var(--text-primary)', borderLeft: '3px solid var(--accent)'
                      }}>{msg.message}</p>
                      
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)} 
                        className="btn btn-secondary" 
                        style={{ position: 'absolute', right: '20px', bottom: '20px', padding: '6px 12px', fontSize: '0.8rem', color: 'var(--danger)' }}
                      >
                        <DynamicIcon name="Trash2" size={14} /> Delete message
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: BACKUP & SETTINGS --- */}
        {activeTab === 'backup' && (
          <div>
            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>Site Visuals & Security Config</h2>
              <div className="admin-grid-2">
                <div className="form-group">
                  <label>Default Visitor Language</label>
                  <select 
                    className="form-control"
                    value={editedData.settings.language}
                    onChange={(e) => {
                      const updated = { ...editedData };
                      updated.settings.language = e.target.value;
                      setEditedData(updated);
                    }}
                  >
                    <option value="en">English (LTR)</option>
                    <option value="ar">العربية (RTL)</option>
                  </select>
                  <small style={{ color: 'var(--text-muted)' }}>Sets default layout viewing direction.</small>
                </div>
                
                <div className="form-group">
                  <label>Update Admin Passcode</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="password" 
                      placeholder="Enter new password"
                      className="form-control"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                    />
                    <button onClick={() => triggerSave()} className="btn btn-primary" style={{ flexShrink: 0 }} disabled={!newPasscode.trim()}>
                      Update Passcode
                    </button>
                  </div>
                  <small style={{ color: 'var(--text-muted)' }}>Changes password access key securely.</small>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Accent Color Palette Preset</label>
                  <select 
                    className="form-control"
                    value={
                      (editedData.settings.accentColor === '#6366f1' && editedData.settings.accentSecondaryColor === '#ec4899') ? 'indigo' :
                      (editedData.settings.accentColor === '#10b981' && editedData.settings.accentSecondaryColor === '#06b6d4') ? 'emerald' :
                      (editedData.settings.accentColor === '#f43f5e' && editedData.settings.accentSecondaryColor === '#f59e0b') ? 'rose' :
                      (editedData.settings.accentColor === '#f59e0b' && editedData.settings.accentSecondaryColor === '#f97316') ? 'amber' :
                      (editedData.settings.accentColor === '#0ea5e9' && editedData.settings.accentSecondaryColor === '#2563eb') ? 'ocean' :
                      (editedData.settings.accentColor === '#8b5cf6' && editedData.settings.accentSecondaryColor === '#d946ef') ? 'violet' : 'custom'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = { ...editedData };
                      if (val === 'indigo') {
                        updated.settings.accentColor = '#6366f1';
                        updated.settings.accentSecondaryColor = '#ec4899';
                      } else if (val === 'emerald') {
                        updated.settings.accentColor = '#10b981';
                        updated.settings.accentSecondaryColor = '#06b6d4';
                      } else if (val === 'rose') {
                        updated.settings.accentColor = '#f43f5e';
                        updated.settings.accentSecondaryColor = '#f59e0b';
                      } else if (val === 'amber') {
                        updated.settings.accentColor = '#f59e0b';
                        updated.settings.accentSecondaryColor = '#f97316';
                      } else if (val === 'ocean') {
                        updated.settings.accentColor = '#0ea5e9';
                        updated.settings.accentSecondaryColor = '#2563eb';
                      } else if (val === 'violet') {
                        updated.settings.accentColor = '#8b5cf6';
                        updated.settings.accentSecondaryColor = '#d946ef';
                      }
                      setEditedData(updated);
                    }}
                  >
                    <option value="indigo">Indigo Glow (Default)</option>
                    <option value="emerald">Emerald Forest</option>
                    <option value="rose">Rose Crimson</option>
                    <option value="amber">Amber Sun</option>
                    <option value="ocean">Ocean Breeze</option>
                    <option value="violet">Violet Amethyst</option>
                    <option value="custom">Custom Color Palette...</option>
                  </select>
                  <small style={{ color: 'var(--text-muted)' }}>Choose a gorgeous predefined color set.</small>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Custom Color Pickers</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Primary Color</span>
                      <input 
                        type="color" 
                        className="form-control"
                        style={{ height: '40px', padding: '2px', cursor: 'pointer' }}
                        value={editedData.settings.accentColor || '#6366f1'}
                        onChange={(e) => {
                          const updated = { ...editedData };
                          updated.settings.accentColor = e.target.value;
                          setEditedData(updated);
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Secondary Color</span>
                      <input 
                        type="color" 
                        className="form-control"
                        style={{ height: '40px', padding: '2px', cursor: 'pointer' }}
                        value={editedData.settings.accentSecondaryColor || '#ec4899'}
                        onChange={(e) => {
                          const updated = { ...editedData };
                          updated.settings.accentSecondaryColor = e.target.value;
                          setEditedData(updated);
                        }}
                      />
                    </div>
                  </div>
                  <small style={{ color: 'var(--text-muted)' }}>Set your own custom branding colors.</small>
                </div>
              </div>
            </div>

            <div className="glass admin-card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px' }}>SQL-JSON Database Backups</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.95rem' }}>
                Your data is stored inside a secure file-based database (`server/data/db.json`) on your web host. You can export a JSON copy of all contents at any time, or import a previously downloaded backup.
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button onClick={handleDownloadBackup} className="btn btn-primary">
                  <DynamicIcon name="Download" size={18} /> Export Database (JSON)
                </button>
                
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <DynamicIcon name="Upload" size={18} /> Import Database (JSON)
                  <input 
                    type="file" 
                    accept=".json" 
                    style={{ display: 'none' }} 
                    onChange={handleImportJSON} 
                  />
                </label>

                <button onClick={triggerReset} className="btn btn-secondary" style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                  <DynamicIcon name="RefreshCw" size={18} /> Reset Database to Template
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
