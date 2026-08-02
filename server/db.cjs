const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const defaultData = require('../src/data/defaultData.json');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Load local .env or DATABASE_URL.txt file if present
const tryLoadEnv = (filename) => {
  try {
    const envPath = path.join(__dirname, '..', filename);
    if (fs.existsSync(envPath)) {
      console.log(`Loading configurations from ${filename}...`);
      fs.readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const key = trimmed.substring(0, eqIdx).trim();
              const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
              if (key && !process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
    }
  } catch (e) {
    console.log(`Skipped loading ${filename}:`, e.message);
  }
};

tryLoadEnv('.env');
tryLoadEnv('DATABASE_URL.txt');

const usePostgres = !!process.env.DATABASE_URL;
let pool = null;

if (usePostgres) {
  console.log('Connecting to PostgreSQL database cluster...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Ensure database folder and file exist (for JSON file fallback)
const initDb = () => {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
  }
};

// Initialize PostgreSQL Schemas & Tables if they don't exist
const initSqlDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY,
        theme VARCHAR(20) DEFAULT 'dark',
        language VARCHAR(5) DEFAULT 'en',
        passcode_hash VARCHAR(64) DEFAULT '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        accent_color VARCHAR(10) DEFAULT '#6366f1',
        accent_secondary_color VARCHAR(10) DEFAULT '#ec4899'
      )
    `);

    // 2. Personal Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS personal_profile (
        id VARCHAR(50) PRIMARY KEY,
        name_en VARCHAR(255),
        name_ar VARCHAR(255),
        title_en VARCHAR(255),
        title_ar VARCHAR(255),
        bio_en TEXT,
        bio_ar TEXT,
        image TEXT,
        cv_url VARCHAR(255),
        github VARCHAR(255),
        linkedin VARCHAR(255),
        twitter VARCHAR(255),
        email VARCHAR(255)
      )
    `);

    // 3. About Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS about_profile (
        id VARCHAR(50) PRIMARY KEY,
        full_bio_en TEXT,
        full_bio_ar TEXT,
        experience_years INT DEFAULT 0,
        projects_completed INT DEFAULT 0,
        rating VARCHAR(50),
        avatar TEXT
      )
    `);

    // 4. Skills Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id VARCHAR(100) PRIMARY KEY,
        name_en VARCHAR(255),
        name_ar VARCHAR(255),
        category VARCHAR(255),
        percentage INT DEFAULT 0
      )
    `);

    // 5. Timeline Entries
    await client.query(`
      CREATE TABLE IF NOT EXISTS timeline_entries (
        id VARCHAR(100) PRIMARY KEY,
        type VARCHAR(20),
        role_en VARCHAR(255),
        role_ar VARCHAR(255),
        company_or_school_en VARCHAR(255),
        company_or_school_ar VARCHAR(255),
        duration_en VARCHAR(255),
        duration_ar VARCHAR(255),
        description_en TEXT,
        description_ar TEXT
      )
    `);

    // 6. Services Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(100) PRIMARY KEY,
        title_en VARCHAR(255),
        title_ar VARCHAR(255),
        description_en TEXT,
        description_ar TEXT,
        price VARCHAR(255),
        icon VARCHAR(100)
      )
    `);

    // 7. Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(100) PRIMARY KEY,
        title_en VARCHAR(255),
        title_ar VARCHAR(255),
        description_en TEXT,
        description_ar TEXT,
        category_en VARCHAR(255),
        category_ar VARCHAR(255),
        image TEXT,
        link VARCHAR(255),
        tags TEXT
      )
    `);

    // 8. Blog Posts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id VARCHAR(100) PRIMARY KEY,
        title_en VARCHAR(255),
        title_ar VARCHAR(255),
        category_en VARCHAR(255),
        category_ar VARCHAR(255),
        date VARCHAR(50),
        read_time_en VARCHAR(100),
        read_time_ar VARCHAR(100),
        content_en TEXT,
        content_ar TEXT
      )
    `);

    // 9. Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        subject VARCHAR(255),
        message TEXT,
        date VARCHAR(50)
      )
    `);

    // Seed default data if settings table is empty
    const checkSettings = await client.query('SELECT COUNT(*) FROM settings');
    if (parseInt(checkSettings.rows[0].count) === 0) {
      console.log('SQL database is empty. Seeding defaults from defaultData.json...');
      
      // Insert Settings
      await client.query(`
        INSERT INTO settings (id, theme, language, passcode_hash, accent_color, accent_secondary_color)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'global',
        defaultData.settings.theme || 'dark',
        defaultData.settings.language || 'en',
        defaultData.settings.passcodeHash || '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        defaultData.settings.accentColor || '#6366f1',
        defaultData.settings.accentSecondaryColor || '#ec4899'
      ]);

      // Insert Personal Profile
      await client.query(`
        INSERT INTO personal_profile (id, name_en, name_ar, title_en, title_ar, bio_en, bio_ar, image, cv_url, github, linkedin, twitter, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        'personal',
        defaultData.personal.nameEn,
        defaultData.personal.nameAr,
        defaultData.personal.titleEn,
        defaultData.personal.titleAr,
        defaultData.personal.bioEn,
        defaultData.personal.bioAr,
        defaultData.personal.avatar,
        defaultData.personal.cvUrl,
        defaultData.personal.socialLinks?.github || '',
        defaultData.personal.socialLinks?.linkedin || '',
        defaultData.personal.socialLinks?.twitter || '',
        defaultData.personal.socialLinks?.email || ''
      ]);

      // Insert About Profile
      await client.query(`
        INSERT INTO about_profile (id, full_bio_en, full_bio_ar, experience_years, projects_completed, rating, avatar)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'about',
        defaultData.about.fullBioEn,
        defaultData.about.fullBioAr,
        defaultData.about.experienceYears || 0,
        defaultData.about.projectsCompleted || 0,
        defaultData.about.rating,
        defaultData.about.avatar
      ]);

      // Insert Skills
      for (const s of defaultData.skills || []) {
        await client.query(`
          INSERT INTO skills (id, name_en, name_ar, category, percentage)
          VALUES ($1, $2, $3, $4, $5)
        `, [s.id, s.nameEn, s.nameAr, s.category, s.percentage]);
      }

      // Insert Timeline Entries (Experience and Education)
      for (const e of defaultData.experience || []) {
        await client.query(`
          INSERT INTO timeline_entries (id, type, role_en, role_ar, company_or_school_en, company_or_school_ar, duration_en, duration_ar, description_en, description_ar)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [e.id, 'experience', e.roleEn, e.roleAr, e.companyEn, e.companyAr, e.durationEn, e.durationAr, e.descriptionEn, e.descriptionAr]);
      }
      for (const e of defaultData.education || []) {
        await client.query(`
          INSERT INTO timeline_entries (id, type, role_en, role_ar, company_or_school_en, company_or_school_ar, duration_en, duration_ar, description_en, description_ar)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [e.id, 'education', e.roleEn, e.roleAr, e.schoolEn, e.schoolAr, e.durationEn, e.durationAr, e.descriptionEn, e.descriptionAr]);
      }

      // Insert Services
      for (const s of defaultData.services || []) {
        await client.query(`
          INSERT INTO services (id, title_en, title_ar, description_en, description_ar, price, icon)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [s.id, s.titleEn, s.titleAr, s.descriptionEn, s.descriptionAr, s.price, s.icon]);
      }

      // Insert Projects
      for (const p of defaultData.projects || []) {
        await client.query(`
          INSERT INTO projects (id, title_en, title_ar, description_en, description_ar, category_en, category_ar, image, link, tags)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [p.id, p.titleEn, p.titleAr, p.descriptionEn, p.descriptionAr, p.categoryEn, p.categoryAr, p.image, p.link, (p.tags || []).join(',')]);
      }

      // Insert Blogs
      for (const b of defaultData.blog || []) {
        await client.query(`
          INSERT INTO blog_posts (id, title_en, title_ar, category_en, category_ar, date, read_time_en, read_time_ar, content_en, content_ar)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [b.id, b.titleEn, b.titleAr, b.categoryEn, b.categoryAr, b.date, b.readTimeEn, b.readTimeAr, b.contentEn, b.contentAr]);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SQL initialization error, rolling back:', error);
  } finally {
    client.release();
  }
};

if (usePostgres) {
  initSqlDb()
    .then(() => console.log('PostgreSQL schemas initialized.'))
    .catch(err => console.error('PostgreSQL initialization failed:', err));
}

// Fetch dynamic Postgres database structures
const getSqlData = async () => {
  const client = await pool.connect();
  try {
    const [
      settingsRes,
      personalRes,
      aboutRes,
      skillsRes,
      timelineRes,
      servicesRes,
      projectsRes,
      blogRes,
      messagesRes
    ] = await Promise.all([
      client.query('SELECT * FROM settings LIMIT 1'),
      client.query('SELECT * FROM personal_profile LIMIT 1'),
      client.query('SELECT * FROM about_profile LIMIT 1'),
      client.query('SELECT * FROM skills'),
      client.query('SELECT * FROM timeline_entries'),
      client.query('SELECT * FROM services'),
      client.query('SELECT * FROM projects'),
      client.query('SELECT * FROM blog_posts'),
      client.query('SELECT * FROM messages ORDER BY date DESC')
    ]);

    const settingsRow = settingsRes.rows[0] || {};
    const personalRow = personalRes.rows[0] || {};
    const aboutRow = aboutRes.rows[0] || {};

    const reconstructed = {
      personal: {
        nameEn: personalRow.name_en || '',
        nameAr: personalRow.name_ar || '',
        titleEn: personalRow.title_en || '',
        titleAr: personalRow.title_ar || '',
        bioEn: personalRow.bio_en || '',
        bioAr: personalRow.bio_ar || '',
        avatar: personalRow.image || '',
        cvUrl: personalRow.cv_url || '',
        socialLinks: {
          github: personalRow.github || '',
          linkedin: personalRow.linkedin || '',
          twitter: personalRow.twitter || '',
          email: personalRow.email || ''
        }
      },
      about: {
        fullBioEn: aboutRow.full_bio_en || '',
        fullBioAr: aboutRow.full_bio_ar || '',
        experienceYears: aboutRow.experience_years || 0,
        projectsCompleted: aboutRow.projects_completed || 0,
        rating: aboutRow.rating || '',
        avatar: aboutRow.avatar || ''
      },
      skills: skillsRes.rows.map(row => ({
        id: row.id,
        nameEn: row.name_en,
        nameAr: row.name_ar,
        category: row.category,
        percentage: row.percentage
      })),
      experience: timelineRes.rows
        .filter(row => row.type === 'experience')
        .map(row => ({
          id: row.id,
          roleEn: row.role_en,
          roleAr: row.role_ar,
          companyEn: row.company_or_school_en,
          companyAr: row.company_or_school_ar,
          durationEn: row.duration_en,
          durationAr: row.duration_ar,
          descriptionEn: row.description_en,
          descriptionAr: row.description_ar
        })),
      education: timelineRes.rows
        .filter(row => row.type === 'education')
        .map(row => ({
          id: row.id,
          roleEn: row.role_en,
          roleAr: row.role_ar,
          schoolEn: row.company_or_school_en,
          schoolAr: row.company_or_school_ar,
          durationEn: row.duration_en,
          durationAr: row.duration_ar,
          descriptionEn: row.description_en,
          descriptionAr: row.description_ar
        })),
      services: servicesRes.rows.map(row => ({
        id: row.id,
        titleEn: row.title_en,
        titleAr: row.title_ar,
        descriptionEn: row.description_en,
        descriptionAr: row.description_ar,
        price: row.price,
        icon: row.icon
      })),
      projects: projectsRes.rows.map(row => ({
        id: row.id,
        titleEn: row.title_en,
        titleAr: row.title_ar,
        descriptionEn: row.description_en,
        descriptionAr: row.description_ar,
        categoryEn: row.category_en,
        categoryAr: row.category_ar,
        image: row.image || '',
        link: row.link || '',
        tags: row.tags ? row.tags.split(',').filter(Boolean) : []
      })),
      blog: blogRes.rows.map(row => ({
        id: row.id,
        titleEn: row.title_en,
        titleAr: row.title_ar,
        categoryEn: row.category_en,
        categoryAr: row.category_ar,
        date: row.date,
        readTimeEn: row.read_time_en,
        readTimeAr: row.read_time_ar,
        contentEn: row.content_en,
        contentAr: row.content_ar
      })),
      messages: messagesRes.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        subject: row.subject,
        message: row.message,
        date: row.date
      })),
      settings: {
        theme: settingsRow.theme || 'dark',
        language: settingsRow.language || 'en',
        passcodeHash: settingsRow.passcode_hash || '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        accentColor: settingsRow.accent_color || '#6366f1',
        accentSecondaryColor: settingsRow.accent_secondary_color || '#ec4899'
      }
    };

    return reconstructed;
  } catch (error) {
    console.error('SQL query failure, loading default JSON fallback:', error);
    return defaultData;
  } finally {
    client.release();
  }
};

// Write visual settings and lists in PostgreSQL tables inside transaction block
const saveSqlData = async (data) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Settings Upsert
    if (data.settings) {
      await client.query(`
        INSERT INTO settings (id, theme, language, passcode_hash, accent_color, accent_secondary_color)
        VALUES ('global', $1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          theme = EXCLUDED.theme,
          language = EXCLUDED.language,
          passcode_hash = EXCLUDED.passcode_hash,
          accent_color = EXCLUDED.accent_color,
          accent_secondary_color = EXCLUDED.accent_secondary_color
      `, [
        data.settings.theme || 'dark',
        data.settings.language || 'en',
        data.settings.passcodeHash || '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        data.settings.accentColor || '#6366f1',
        data.settings.accentSecondaryColor || '#ec4899'
      ]);
    }

    // 2. Personal Upsert
    if (data.personal) {
      await client.query(`
        INSERT INTO personal_profile (id, name_en, name_ar, title_en, title_ar, bio_en, bio_ar, image, cv_url, github, linkedin, twitter, email)
        VALUES ('personal', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          name_en = EXCLUDED.name_en,
          name_ar = EXCLUDED.name_ar,
          title_en = EXCLUDED.title_en,
          title_ar = EXCLUDED.title_ar,
          bio_en = EXCLUDED.bio_en,
          bio_ar = EXCLUDED.bio_ar,
          image = EXCLUDED.image,
          cv_url = EXCLUDED.cv_url,
          github = EXCLUDED.github,
          linkedin = EXCLUDED.linkedin,
          twitter = EXCLUDED.twitter,
          email = EXCLUDED.email
      `, [
        data.personal.nameEn,
        data.personal.nameAr,
        data.personal.titleEn,
        data.personal.titleAr,
        data.personal.bioEn,
        data.personal.bioAr,
        data.personal.avatar,
        data.personal.cvUrl,
        data.personal.socialLinks?.github || '',
        data.personal.socialLinks?.linkedin || '',
        data.personal.socialLinks?.twitter || '',
        data.personal.socialLinks?.email || ''
      ]);
    }

    // 3. About Upsert
    if (data.about) {
      await client.query(`
        INSERT INTO about_profile (id, full_bio_en, full_bio_ar, experience_years, projects_completed, rating, avatar)
        VALUES ('about', $1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          full_bio_en = EXCLUDED.full_bio_en,
          full_bio_ar = EXCLUDED.full_bio_ar,
          experience_years = EXCLUDED.experience_years,
          projects_completed = EXCLUDED.projects_completed,
          rating = EXCLUDED.rating,
          avatar = EXCLUDED.avatar
      `, [
        data.about.fullBioEn,
        data.about.fullBioAr,
        data.about.experienceYears || 0,
        data.about.projectsCompleted || 0,
        data.about.rating,
        data.about.avatar
      ]);
    }

    // 4. Skills Sync
    if (Array.isArray(data.skills)) {
      await client.query('DELETE FROM skills');
      for (const s of data.skills) {
        await client.query(`
          INSERT INTO skills (id, name_en, name_ar, category, percentage)
          VALUES ($1, $2, $3, $4, $5)
        `, [s.id, s.nameEn, s.nameAr, s.category, s.percentage]);
      }
    }

    // 5. Timeline Entries Sync (Experience and Education)
    if (Array.isArray(data.experience) || Array.isArray(data.education)) {
      await client.query('DELETE FROM timeline_entries');
      if (Array.isArray(data.experience)) {
        for (const e of data.experience) {
          await client.query(`
            INSERT INTO timeline_entries (id, type, role_en, role_ar, company_or_school_en, company_or_school_ar, duration_en, duration_ar, description_en, description_ar)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [e.id, 'experience', e.roleEn, e.roleAr, e.companyEn, e.companyAr, e.durationEn, e.durationAr, e.descriptionEn, e.descriptionAr]);
        }
      }
      if (Array.isArray(data.education)) {
        for (const e of data.education) {
          await client.query(`
            INSERT INTO timeline_entries (id, type, role_en, role_ar, company_or_school_en, company_or_school_ar, duration_en, duration_ar, description_en, description_ar)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [e.id, 'education', e.roleEn, e.roleAr, e.schoolEn, e.schoolAr, e.durationEn, e.durationAr, e.descriptionEn, e.descriptionAr]);
        }
      }
    }

    // 6. Services Sync
    if (Array.isArray(data.services)) {
      await client.query('DELETE FROM services');
      for (const s of data.services) {
        await client.query(`
          INSERT INTO services (id, title_en, title_ar, description_en, description_ar, price, icon)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [s.id, s.titleEn, s.titleAr, s.descriptionEn, s.descriptionAr, s.price, s.icon]);
      }
    }

    // 7. Projects Sync
    if (Array.isArray(data.projects)) {
      await client.query('DELETE FROM projects');
      for (const p of data.projects) {
        await client.query(`
          INSERT INTO projects (id, title_en, title_ar, description_en, description_ar, category_en, category_ar, image, link, tags)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [p.id, p.titleEn, p.titleAr, p.descriptionEn, p.descriptionAr, p.categoryEn, p.categoryAr, p.image, p.link, (p.tags || []).join(',')]);
      }
    }

    // 8. Blog Posts Sync
    if (Array.isArray(data.blog)) {
      await client.query('DELETE FROM blog_posts');
      for (const b of data.blog) {
        await client.query(`
          INSERT INTO blog_posts (id, title_en, title_ar, category_en, category_ar, date, read_time_en, read_time_ar, content_en, content_ar)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [b.id, b.titleEn, b.titleAr, b.categoryEn, b.categoryAr, b.date, b.readTimeEn, b.readTimeAr, b.contentEn, b.contentAr]);
      }
    }

    // 9. Messages Sync (Updates messages log)
    if (Array.isArray(data.messages)) {
      await client.query('DELETE FROM messages');
      for (const m of data.messages) {
        await client.query(`
          INSERT INTO messages (id, name, email, subject, message, date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [m.id, m.name, m.email, m.subject, m.message, m.date]);
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('SQL save transaction failed, rolling back:', error);
    return false;
  } finally {
    client.release();
  }
};

const getData = async () => {
  if (usePostgres) {
    return await getSqlData();
  }
  // Local JSON File Fallback
  try {
    initDb();
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read database file, loading fallback:', error);
    return defaultData;
  }
};

const saveData = async (data) => {
  if (usePostgres) {
    return await saveSqlData(data);
  }
  // Local JSON File Fallback
  try {
    initDb();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (error) {
    console.error('Failed to save to database file:', error);
    return false;
  }
};

module.exports = {
  getData,
  saveData
};
