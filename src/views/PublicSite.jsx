import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DynamicIcon from '../components/DynamicIcon';
import { formatDate } from '../utils/helpers';
import translations from '../data/translations';

export const PublicSite = ({ data, onSendMessage, theme, toggleTheme, lang = 'en', onToggleLang }) => {
  const { personal, about, skills, experience, education, services, projects, blog } = data;
  
  // Translation references
  const t = translations[lang] || translations.en;
  const isRtl = lang === 'ar';

  // Navigation & UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [formState, setFormState] = useState(''); // '', 'sending', 'submitted', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Localized keys helper
  const getLocVal = (obj, key) => {
    if (!obj) return '';
    const localizedKey = `${key}${lang === 'ar' ? 'Ar' : 'En'}`;
    return obj[localizedKey] || obj[key] || '';
  };

  // Filter projects by category
  const categories = ['All', ...new Set(projects.map(p => getLocVal(p, 'category')).filter(c => c !== ''))];
  const filteredProjects = activeCategory === 'All' 
    ? projects 
    : projects.filter(p => getLocVal(p, 'category') === activeCategory);

  // Group skills by category
  const skillCategories = [...new Set(skills.map(s => s.category || 'General'))];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    
    setFormState('sending');
    setErrorMessage('');
    
    try {
      await onSendMessage({
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject || 'General Inquiry',
        message: contactForm.message
      });
      setFormState('submitted');
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setFormState(''), 6000);
    } catch (err) {
      setFormState('error');
      setErrorMessage(err.message || 'Failed to send message. Rate limit may apply.');
      setTimeout(() => setFormState(''), 6000);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* --- Sticky Navigation Bar --- */}
      <header className="glass" style={{
        position: 'sticky', top: 0, zIndex: 100,
        margin: '16px auto', width: 'calc(100% - 32px)', maxWidth: 'var(--container-width)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 32px', borderRadius: 'var(--border-radius-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: 'var(--font-display)'
          }}>
            {getLocVal(personal, 'name').charAt(0)}
          </div>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
            {getLocVal(personal, 'name')}
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }} className="desktop-only-nav">
          <a href="#about" style={{ fontWeight: 500 }}>{t.navAbout}</a>
          <a href="#experience" style={{ fontWeight: 500 }}>{t.navExperience}</a>
          <a href="#services" style={{ fontWeight: 500 }}>{t.navServices}</a>
          <a href="#portfolio" style={{ fontWeight: 500 }}>{t.navPortfolio}</a>
          {blog.length > 0 && <a href="#blog" style={{ fontWeight: 500 }}>{t.navBlog}</a>}
          <a href="#contact" style={{ fontWeight: 500 }}>{t.navContact}</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Language Switch Toggle */}
          <button 
            onClick={() => onToggleLang(lang === 'en' ? 'ar' : 'en')}
            className="glass"
            style={{
              padding: '6px 12px', borderRadius: '12px',
              fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
              border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <DynamicIcon name="Globe" size={14} />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>

          {/* Light/Dark Toggle */}
          <button 
            onClick={toggleTheme} 
            className="glass" 
            style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', border: '1px solid var(--card-border)' 
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <DynamicIcon name={theme === 'dark' ? 'Sun' : 'Moon'} size={18} />
          </button>

          {/* Admin link */}
          <Link to="/admin" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            <DynamicIcon name="LogIn" size={16} /> {t.adminAccess}
          </Link>

          {/* Hamburger Menu Icon */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            style={{ cursor: 'pointer', display: 'none' }} 
            className="mobile-menu-toggle"
          >
            <DynamicIcon name={mobileMenuOpen ? 'X' : 'Menu'} size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Backdrops */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass"
            style={{
              position: 'absolute', top: '90px', right: '16px', left: '16px',
              display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px',
              borderRadius: 'var(--border-radius-md)', zIndex: 100,
              textAlign: isRtl ? 'right' : 'left'
            }}
          >
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>{t.navAbout}</a>
            <a href="#experience" onClick={() => setMobileMenuOpen(false)}>{t.navExperience}</a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)}>{t.navServices}</a>
            <a href="#portfolio" onClick={() => setMobileMenuOpen(false)}>{t.navPortfolio}</a>
            {blog.length > 0 && <a href="#blog" onClick={() => setMobileMenuOpen(false)}>{t.navBlog}</a>}
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>{t.navContact}</a>
          </div>
        </div>
      )}

      {/* CSS Helper for Nav display */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-only-nav { display: none !important; }
          .mobile-menu-toggle { display: block !important; }
        }
      `}</style>

      {/* --- HERO SECTION --- */}
      <section className="container section" id="hero">
        <div className="hero-wrapper">
          <div className="hero-left" style={{ textAlign: isRtl ? 'right' : 'left' }}>
            <span className="badge" style={{ marginBottom: '16px' }}>{t.availableForHire}</span>
            <h1 style={{ fontWeight: 800 }}>
              {isRtl ? 'أهلاً، أنا ' : 'Hi, I\'m '}<span className="text-gradient">{getLocVal(personal, 'name')}</span>
            </h1>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '20px' }}>
              {getLocVal(personal, 'title')}
            </h2>
            <p>{getLocVal(personal, 'bio')}</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: isRtl ? 'flex-start' : 'flex-start' }}>
              <a href="#contact" className="btn btn-primary">
                {t.getInTouch} <DynamicIcon name="Mail" size={18} />
              </a>
              {personal.resumeUrl && personal.resumeUrl !== '#' && (
                <a href={personal.resumeUrl} className="btn btn-secondary" target="_blank" rel="noreferrer">
                  {t.downloadCV} <DynamicIcon name="Download" size={18} />
                </a>
              )}
            </div>
            {/* Social Links */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '40px', justifyContent: isRtl ? 'flex-start' : 'flex-start' }}>
              {Object.entries(personal.socialLinks || {}).map(([platform, url]) => {
                if (!url) return null;
                const iconName = platform.charAt(0).toUpperCase() + platform.slice(1);
                return (
                  <a 
                    key={platform} 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="glass"
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid var(--card-border)', transition: 'transform var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <DynamicIcon name={iconName} size={18} />
                  </a>
                );
              })}
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-avatar-container float-anim">
              <img src={personal.avatar || "/avatar.jpg"} alt={getLocVal(personal, 'name')} onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80";
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* --- ABOUT & SKILLS SECTION --- */}
      <section className="container section" id="about">
        <h2 className="section-title">{t.aboutTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', alignItems: 'start' }} className="about-grid-responsive">
          <div className="glass-card" style={{ height: '100%', textAlign: isRtl ? 'right' : 'left' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>{t.aboutStory}</h3>
            <p style={{ whiteSpace: 'pre-line', color: 'var(--text-secondary)' }}>{getLocVal(about, 'fullBio')}</p>
            {/* Stats Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '32px' }}>
              <div className="glass" style={{ padding: '20px', textAlign: 'center', borderRadius: 'var(--border-radius-sm)' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, display: 'block' }} className="text-gradient">
                  {about.experienceYears}+
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t.statExperience}</span>
              </div>
              <div className="glass" style={{ padding: '20px', textAlign: 'center', borderRadius: 'var(--border-radius-sm)' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, display: 'block' }} className="text-gradient">
                  {about.projectsCompleted}+
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t.statProjects}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: isRtl ? 'right' : 'left' }}>
            <div className="glass-card">
              <h3 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>{t.aboutSkills}</h3>
              
              {skillCategories.map(cat => (
                <div key={cat} style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--accent)' }}>{cat}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {skills.filter(s => (s.category || 'General') === cat).map(skill => (
                      <div key={skill.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                          <span>{getLocVal(skill, 'name')}</span>
                          <span style={{ fontWeight: 600 }}>{skill.percentage}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${skill.percentage}%`, height: '100%',
                            background: 'linear-gradient(90deg, var(--accent), var(--accent-secondary))',
                            borderRadius: '4px',
                            float: isRtl ? 'right' : 'left'
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            .about-grid-responsive { grid-template-columns: 1fr !important; gap: 30px !important; }
          }
        `}</style>
      </section>

      {/* --- EXPERIENCE & EDUCATION TIMELINE --- */}
      <section className="container section" id="experience">
        <h2 className="section-title">{t.timelineTitle}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }} className="timeline-grid-responsive">
          {/* Experience */}
          <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <DynamicIcon name="Briefcase" size={24} className="text-gradient" /> {t.timelineExperience}
            </h3>
            <div className="timeline" style={{
              paddingLeft: isRtl ? '0' : '80px',
              paddingRight: isRtl ? '80px' : '0'
            }}>
              {experience.map(exp => (
                <div className="timeline-item" key={exp.id} style={{
                  paddingLeft: isRtl ? '0' : '80px',
                  paddingRight: isRtl ? '80px' : '0'
                }}>
                  <div className="timeline-dot" style={{
                    left: isRtl ? 'auto' : '20px',
                    right: isRtl ? '20px' : 'auto'
                  }}></div>
                  <div className="glass timeline-card">
                    <span className="timeline-date">{getLocVal(exp, 'duration')}</span>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{getLocVal(exp, 'role')}</h4>
                    <h5 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>{getLocVal(exp, 'company')}</h5>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{getLocVal(exp, 'description')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <DynamicIcon name="GraduationCap" size={24} className="text-gradient" /> {t.timelineEducation}
            </h3>
            <div className="timeline" style={{
              paddingLeft: isRtl ? '0' : '80px',
              paddingRight: isRtl ? '80px' : '0'
            }}>
              {education.map(edu => (
                <div className="timeline-item" key={edu.id} style={{
                  paddingLeft: isRtl ? '0' : '80px',
                  paddingRight: isRtl ? '80px' : '0'
                }}>
                  <div className="timeline-dot" style={{ 
                    borderColor: 'var(--accent-secondary)',
                    left: isRtl ? 'auto' : '20px',
                    right: isRtl ? '20px' : 'auto'
                  }}></div>
                  <div className="glass timeline-card">
                    <span className="timeline-date" style={{ color: 'var(--accent-secondary)' }}>{getLocVal(edu, 'duration')}</span>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{getLocVal(edu, 'degree')}</h4>
                    <h5 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>{getLocVal(edu, 'school')}</h5>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{getLocVal(edu, 'description')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* CSS override for timelines mirror direction spacing */}
        <style>{`
          .timeline::before {
            left: ${isRtl ? 'auto' : '31px'};
            right: ${isRtl ? '31px' : 'auto'};
          }
          @media (max-width: 900px) {
            .timeline-grid-responsive { grid-template-columns: 1fr !important; gap: 40px !important; }
          }
        `}</style>
      </section>

      {/* --- SERVICES SECTION --- */}
      <section className="container section" id="services">
        <h2 className="section-title">{t.servicesTitle}</h2>
        <div className="services-grid">
          {services.map(ser => (
            <div className="glass-card" key={ser.id} style={{ display: 'flex', flexDirection: 'column', textAlign: isRtl ? 'right' : 'left' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '24px',
                alignSelf: isRtl ? 'flex-start' : 'flex-start'
              }}>
                <DynamicIcon name={ser.icon} size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>{getLocVal(ser, 'title')}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', flexGrow: 1, marginBottom: '24px' }}>
                {getLocVal(ser, 'description')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t.servicesStartFrom}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)' }}>{ser.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- PORTFOLIO SECTION --- */}
      <section className="container section" id="portfolio">
        <h2 className="section-title">{t.worksTitle}</h2>
        
        {/* Categories filters */}
        <div className="portfolio-filter">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'All' ? t.worksAll : cat}
            </button>
          ))}
        </div>

        <div className="portfolio-grid">
          {filteredProjects.map(proj => (
            <div 
              className="glass-card portfolio-card" 
              key={proj.id}
              onClick={() => setSelectedProject(proj)}
              style={{ cursor: 'pointer', textAlign: isRtl ? 'right' : 'left' }}
            >
              <div className="portfolio-img-wrapper">
                {proj.image ? (
                  <img src={proj.image} alt={getLocVal(proj, 'title')} />
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    color: 'var(--text-muted)', fontSize: '0.9rem'
                  }}>
                    <DynamicIcon name="Image" size={36} />
                    <span>{t.worksNoImage}</span>
                  </div>
                )}
                <div style={{
                  position: 'absolute', top: '16px', right: isRtl ? 'auto' : '16px', left: isRtl ? '16px' : 'auto',
                  background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '12px',
                  color: 'white', fontSize: '0.8rem', fontWeight: 600
                }}>
                  {getLocVal(proj, 'category')}
                </div>
              </div>
              <div className="portfolio-details">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{getLocVal(proj, 'title')}</h3>
                <p style={{
                  color: 'var(--text-secondary)', fontSize: '0.9rem',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '16px'
                }}>
                  {getLocVal(proj, 'description')}
                </p>
                <div className="portfolio-tags" style={{ justifyContent: isRtl ? 'flex-start' : 'flex-start' }}>
                  {proj.tags && proj.tags.map((tag, idx) => (
                    <span className="portfolio-tag" key={idx}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem', marginTop: '16px' }}>
                  {t.worksDetails} <DynamicIcon name={isRtl ? 'ArrowLeft' : 'ArrowUpRight'} size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- BLOG SECTION --- */}
      {blog.length > 0 && (
        <section className="container section" id="blog">
          <h2 className="section-title">{t.blogTitle}</h2>
          <div className="blog-grid">
            {blog.map(article => (
              <div 
                className="glass-card blog-card" 
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                style={{ cursor: 'pointer', textAlign: isRtl ? 'right' : 'left' }}
              >
                <div className="blog-meta">
                  <span className="badge">{getLocVal(article, 'category')}</span>
                  <span>{getLocVal(article, 'readTime')}</span>
                </div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', lineHeight: 1.3 }}>{getLocVal(article, 'title')}</h3>
                <p style={{
                  color: 'var(--text-secondary)', fontSize: '0.95rem',
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1, marginBottom: '20px'
                }}>
                  {getLocVal(article, 'content')}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>{formatDate(article.date)}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {t.blogRead} <DynamicIcon name={isRtl ? 'ArrowLeft' : 'ArrowUpRight'} size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- CONTACT SECTION --- */}
      <section className="container section" id="contact" style={{ marginBottom: '80px' }}>
        <h2 className="section-title">{t.contactTitle}</h2>
        <div className="contact-wrapper">
          <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>{t.contactHeading}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{t.contactSub}</p>
            <div className="contact-info-list">
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <DynamicIcon name="Mail" size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>{t.contactEmail}</span>
                  <a href={`mailto:${personal.email}`} style={{ fontWeight: 600 }}>{personal.email}</a>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <DynamicIcon name="Phone" size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>{t.contactCall}</span>
                  <a href={`tel:${personal.phone}`} style={{ fontWeight: 600 }}>{personal.phone}</a>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <DynamicIcon name="MapPin" size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>{t.contactLocation}</span>
                  <span style={{ fontWeight: 600 }}>{getLocVal(personal, 'location')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card contact-form-card" style={{ textAlign: isRtl ? 'right' : 'left' }}>
            {formState === 'submitted' ? (
              <div style={{
                textAlign: 'center', padding: '40px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'var(--success)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <DynamicIcon name="CheckCircle" size={32} />
                </div>
                <h3 style={{ fontSize: '1.5rem' }}>{t.formSuccessTitle}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{t.formSuccessSub}</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit}>
                <div className="form-group">
                  <label htmlFor="contact-name">{t.formName}</label>
                  <input 
                    type="text" 
                    id="contact-name" 
                    className="form-control" 
                    required 
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-email">{t.formEmail}</label>
                  <input 
                    type="email" 
                    id="contact-email" 
                    className="form-control" 
                    required 
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-subject">{t.formSubject}</label>
                  <input 
                    type="text" 
                    id="contact-subject" 
                    className="form-control" 
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-message">{t.formMessage}</label>
                  <textarea 
                    id="contact-message" 
                    className="form-control" 
                    rows="5" 
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  ></textarea>
                </div>
                {formState === 'error' && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px' }}>{errorMessage}</p>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={formState === 'sending'}>
                  {formState === 'sending' ? t.formSending : t.formSubmit}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="glass" style={{
        margin: '40px auto 16px', width: 'calc(100% - 32px)', maxWidth: 'var(--container-width)',
        padding: '30px', borderRadius: 'var(--border-radius-md)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
      }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          &copy; {new Date().getFullYear()} {getLocVal(personal, 'name')}. {t.footerRights}
        </span>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#about" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t.navAbout}</a>
          <a href="#portfolio" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t.navPortfolio}</a>
          <Link to="/admin" style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <DynamicIcon name="LogIn" size={14} /> {t.adminAccess}
          </Link>
        </div>
      </footer>

      {/* --- PORTFOLIO ITEM MODAL --- */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="glass modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: isRtl ? 'right' : 'left' }}>
            <button className="modal-close" onClick={() => setSelectedProject(null)} style={{
              left: isRtl ? '16px' : 'auto',
              right: isRtl ? 'auto' : '16px'
            }}>
              <DynamicIcon name="X" size={18} />
            </button>
            <div style={{
              height: '320px', background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
              position: 'relative', overflow: 'hidden'
            }}>
              {selectedProject.image ? (
                <img src={selectedProject.image} alt={getLocVal(selectedProject, 'title')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', gap: '10px'
                }}>
                  <DynamicIcon name="Image" size={48} />
                  <span>No Cover Image</span>
                </div>
              )}
            </div>
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <span className="badge" style={{ marginBottom: '8px' }}>{getLocVal(selectedProject, 'category')}</span>
                  <h3 style={{ fontSize: '1.8rem' }}>{getLocVal(selectedProject, 'title')}</h3>
                </div>
                {selectedProject.link && (
                  <a href={selectedProject.link} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                    {t.worksVisit} <DynamicIcon name="ArrowUpRight" size={16} />
                  </a>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', whiteSpace: 'pre-line' }}>{getLocVal(selectedProject, 'description')}</p>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{t.worksTechs}</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isRtl ? 'flex-start' : 'flex-start' }}>
                {selectedProject.tags && selectedProject.tags.map((tag, idx) => (
                  <span key={idx} className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BLOG ARTICLE READ MODAL --- */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="glass modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: isRtl ? 'right' : 'left' }}>
            <button className="modal-close" onClick={() => setSelectedArticle(null)} style={{
              left: isRtl ? '16px' : 'auto',
              right: isRtl ? 'auto' : '16px'
            }}>
              <DynamicIcon name="X" size={18} />
            </button>
            <div style={{ padding: '40px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge">{getLocVal(selectedArticle, 'category')}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{getLocVal(selectedArticle, 'readTime')}</span>
              </div>
              <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>{getLocVal(selectedArticle, 'title')}</h2>
              <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '32px' }}>
                {t.blogPublished} {formatDate(selectedArticle.date)}
              </span>
              <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line', fontSize: '1.1rem', lineHeight: 1.7 }}>
                {getLocVal(selectedArticle, 'content')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicSite;
