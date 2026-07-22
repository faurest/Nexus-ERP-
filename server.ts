import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const PORT = 3000;
const db = new Database('database.sqlite');
// Support both legacy local JWT secret and Supabase JWT secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'nexus-fallback-auth-secret-key-2026';

// Allowed collections whitelist (prevents SQL injection via collection name)
const ALLOWED_COLLECTIONS = [
  'companies', 'personnel', 'clients', 'sales', 'projects', 'partners',
  'sales_invoices', 'expenses', 'invoices', 'payments', 'resources',
  'users', 'sessions', 'refresh_tokens', 'tasks', 'services',
  'interventions', 'notifications', 'open_orders'
];

// JWT Auth Middleware - Supports both Supabase and legacy local tokens
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, any>;
    req.user = {
      uid: decoded.sub || decoded.uid,
      email: decoded.email,
      role: decoded.role || 'Personnel',
      ...decoded
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Twilio Client Lazy Init
let twilioClient: twilio.Twilio | null = null;
function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

// Supabase Lazy Init & Keep Alive
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    supabaseClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Keep Supabase project from pausing (free tier inactivity)
async function pingSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    // Lightweight query to register activity on the database
    // Even if the table doesn't exist, the API request registers as activity
    await supabase.from('users').select('uid').limit(1);
    console.log('[Supabase Keep-Alive] Ping réussi à', new Date().toISOString());
  } catch (err: any) {
    console.error('[Supabase Keep-Alive] Erreur lors du ping:', err.message);
  }
}

// Periodic ping locally every 6 hours
setInterval(pingSupabase, 1000 * 60 * 60 * 6);

// Initialize AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ownerId TEXT,
    ownerEmail TEXT NOT NULL,
    joinCode TEXT UNIQUE NOT NULL,
    memberEmails TEXT,
    employees TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS personnel (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    firstName TEXT,
    lastName TEXT,
    phone TEXT,
    notes TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT,
    department TEXT,
    status TEXT DEFAULT 'active',
    tasksAssignedCount INTEGER DEFAULT 0,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    interactions TEXT,
    salesTotal REAL DEFAULT 0,
    loyaltyPoints INTEGER DEFAULT 0,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    itemName TEXT NOT NULL,
    type TEXT,
    quantity INTEGER,
    price REAL,
    total REAL,
    amount REAL,
    status TEXT,
    clientName TEXT,
    date INTEGER
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    partnerId TEXT,
    budget REAL,
    status TEXT,
    startDate INTEGER,
    endDate INTEGER,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    contactEmail TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    saleId TEXT NOT NULL,
    invoiceNumber TEXT NOT NULL,
    amount REAL,
    status TEXT,
    date INTEGER
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    projectId TEXT NOT NULL,
    amount REAL,
    date INTEGER,
    category TEXT,
    description TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    projectId TEXT NOT NULL,
    partnerId TEXT NOT NULL,
    amount REAL,
    issueDate INTEGER,
    dueDate INTEGER,
    status TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    projectId TEXT NOT NULL,
    amount REAL,
    date INTEGER,
    type TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    quantity INTEGER,
    location TEXT,
    status TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    displayName TEXT,
    passwordHash TEXT,
    role TEXT DEFAULT 'Personnel'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt INTEGER NOT NULL,
    revokedAt INTEGER,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    title TEXT NOT NULL,
    assignedTo TEXT,
    startDate TEXT,
    endDate TEXT,
    status TEXT DEFAULT 'pending',
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    client TEXT NOT NULL,
    message TEXT NOT NULL,
    date TEXT,
    status TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    userId TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    isRead INTEGER DEFAULT 0,
    date INTEGER,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS open_orders (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    clientName TEXT,
    tableNumber TEXT,
    items TEXT,
    status TEXT DEFAULT 'open',
    createdAt INTEGER,
    updatedAt INTEGER
  );
`);

// Try Schema Migrations
try { db.prepare('UPDATE users SET email = LOWER(TRIM(email))').run(); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN passwordHash TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "Personnel"'); } catch(e) {}
try { db.exec('ALTER TABLE companies ADD COLUMN employees TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE companies ADD COLUMN roles TEXT'); } catch (e) {}

try { db.exec('ALTER TABLE personnel ADD COLUMN firstName TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE personnel ADD COLUMN lastName TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE personnel ADD COLUMN phone TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE personnel ADD COLUMN notes TEXT'); } catch (e) {}
try { 
  db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    title TEXT NOT NULL,
    assignedTo TEXT,
    startDate TEXT,
    endDate TEXT,
    status TEXT DEFAULT 'pending',
    createdAt INTEGER
  )`);
} catch (e) {}

try { db.exec('ALTER TABLE resources ADD COLUMN condition TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE resources ADD COLUMN duration TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE resources ADD COLUMN warranty TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN clientName TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN amount REAL'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN total REAL'); } catch (e) {}
try { db.exec('ALTER TABLE sales_invoices ADD COLUMN clientName TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE sales_invoices ADD COLUMN tableNumber TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE sales_invoices ADD COLUMN items TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN address TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE clients ADD COLUMN interactions TEXT'); } catch (e) {}

try {
  db.exec(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    userId TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    isRead INTEGER DEFAULT 0,
    date INTEGER,
    createdAt INTEGER
  )`);
} catch (e) {}

try {
  db.exec(`CREATE TABLE IF NOT EXISTS open_orders (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    clientName TEXT,
    tableNumber TEXT,
    items TEXT,
    status TEXT DEFAULT 'open',
    createdAt INTEGER,
    updatedAt INTEGER
  )`);
} catch (e) {}

// Pre-seed Master User and Master Company (only if MASTER_EMAIL and MASTER_PASSWORD env vars are set)
try {
  const masterEmail = process.env.MASTER_EMAIL;
  const masterPassword = process.env.MASTER_PASSWORD;
  
  if (masterEmail && masterPassword) {
    const masterUid = 'master_nexus_01';
    
    // Create user if not exists
    const userExists = db.prepare('SELECT * FROM users WHERE email = ?').get(masterEmail);
    const masterHash = bcrypt.hashSync(masterPassword, 10);
    if (!userExists) {
      db.prepare('INSERT INTO users (uid, email, displayName, passwordHash, role) VALUES (?, ?, ?, ?, ?)')
        .run(masterUid, masterEmail, 'Nexus Master', masterHash, 'owner');
    } else {
      // Force updating master password if needed
      db.prepare('UPDATE users SET passwordHash = ?, role = ? WHERE email = ?')
        .run(masterHash, 'owner', masterEmail);
    }

    // Create Master Company if not exists
    const companyExists = db.prepare('SELECT * FROM companies WHERE ownerId = ?').get(masterUid);
    if (!companyExists) {
      const joinCode = process.env.MASTER_JOIN_CODE || 'NEXUS-ADMIN';
      db.prepare('INSERT INTO companies (id, name, ownerId, ownerEmail, joinCode, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
        .run('comp_nexus_master', 'Nexus Enterprise Global', masterUid, masterEmail, joinCode, Date.now());
    }
  } else {
    console.warn('[SECURITY] MASTER_EMAIL and MASTER_PASSWORD env vars not set. Master account not seeded.');
  }
} catch (e) {
  console.error("Master seeding failed:", e);
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- AUTH ROUTES ---
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const match = bcrypt.compareSync(password, user.passwordHash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ uid: user.uid, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const expiresAt = Date.now() + 3600 * 1000;
      
      db.prepare('INSERT INTO refresh_tokens (id, userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)')
        .run(Math.random().toString(36).substring(2), user.uid, refreshToken, Date.now() + 7 * 24 * 3600 * 1000, Date.now());

      res.json({
        token,
        refreshToken,
        expiresAt,
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role || 'Personnel'
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const cleanEmail = email.trim().toLowerCase();
      const existing = db.prepare('SELECT uid FROM users WHERE email = ?').get(cleanEmail);
      if (existing) return res.status(400).json({ error: 'Email already exists' });

      const hash = bcrypt.hashSync(password, 10);
      const uid = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      db.prepare('INSERT INTO users (uid, email, displayName, passwordHash, role) VALUES (?, ?, ?, ?, ?)')
        .run(uid, cleanEmail, displayName || '', hash, 'Personnel');

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- API ROUTES ---

  // Supabase Keep-Alive API (Can be called by cron-job.org or Cloud Scheduler)
  app.get('/api/supabase/keep-alive', async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return res.json({ status: 'ignored', message: 'Supabase n\'est pas configuré.' });
      }
      await pingSupabase();
      res.json({ status: 'ok', message: 'Ping Supabase exécuté avec succès.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Notifications API (WhatsApp/SMS via Twilio)
  app.post('/api/orders/notify', async (req, res) => {
    try {
      const { orderId, clientName, totalAmount, items, messageType = 'whatsapp', companyPhone } = req.body;
      
      // Fallback à la variable d'environnement si le client ne fournit pas le numéro de l'entreprise
      let finalCompanyPhone = companyPhone || process.env.COMPANY_PHONE_NUMBER;
      
      // Ensure phone number has a + prefix for international format if it doesn't already
      if (finalCompanyPhone && /^\d+$/.test(finalCompanyPhone.replace(/\s+/g, ''))) {
         finalCompanyPhone = '+' + finalCompanyPhone.replace(/\s+/g, '');
      }
      
      // Déterminer le type de message en fonction des variables d'environnement disponibles
      let finalMessageType = messageType;
      if (finalMessageType === 'whatsapp' && !process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_PHONE_NUMBER) {
        finalMessageType = 'sms';
      }

      const twilioNumber = finalMessageType === 'whatsapp' ? process.env.TWILIO_WHATSAPP_NUMBER : process.env.TWILIO_PHONE_NUMBER;
      
      const messageContent = `🔔 Nouvelle commande reçue !\n\nID: ${orderId}\nClient: ${clientName || 'Anonyme'}\nTotal: ${totalAmount || 0} FCFA\n\nArticles:\n${items || 'Non spécifié'}\n\nMerci de traiter cette commande rapidement.`;

      const client = getTwilioClient();
      
      if (!client) {
        console.warn('Twilio non configuré. Clés manquantes. Le message n\'a pas pu être envoyé.');
        console.log('Message simulé:', messageContent);
        return res.json({ success: true, simulated: true, message: 'Twilio n\'est pas configuré. Simulation réussie.' });
      }

      if (!finalCompanyPhone || !twilioNumber) {
        return res.status(400).json({ error: 'Numéros d\'envoi ou de destination non configurés.' });
      }

      const to = finalMessageType === 'whatsapp' ? `whatsapp:${finalCompanyPhone}` : finalCompanyPhone;

      const messageResult = await client.messages.create({
        body: messageContent,
        from: twilioNumber,
        to: to
      });

      res.json({ success: true, messageId: messageResult.sid, type: finalMessageType });
    } catch (e: any) {
      console.error('Erreur Twilio:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Generic CRUD Proxy (Protected with JWT Auth)
  const getPK = (collection: string) => collection === 'users' ? 'uid' : 'id';

  // Validate collection name against whitelist
  function validateCollection(collection: string): boolean {
    return ALLOWED_COLLECTIONS.includes(collection);
  }

  app.get('/api/data/:collection', authenticateToken, (req, res) => {
    try {
      const { collection } = req.params;
      
      if (!validateCollection(collection)) {
        return res.status(400).json({ error: 'Invalid collection name' });
      }
      
      const { requestUserEmail, requestUserId, ownerId, ...otherQuerys } = req.query as any;
      
      // Get table columns
      const tableInfo = db.prepare(`PRAGMA table_info(${collection})`).all() as any[];
      const validColumns = tableInfo.map(c => c.name);

      let query = `SELECT * FROM ${collection}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (collection === 'companies') {
        // Only allow querying companies the user owns or is a member of
        if (ownerId) {
          conditions.push(`(ownerId = ? OR memberEmails LIKE ?)`);
          params.push(ownerId);
          params.push(`%${requestUserEmail}%`);
        }
      } else if (ownerId && validColumns.includes('ownerId')) {
        conditions.push(`ownerId = ?`);
        params.push(ownerId);
      }

      Object.keys(otherQuerys).forEach(key => {
        let normalizedKey = key;
        if (key.toLowerCase() === 'companyid' && validColumns.includes('companyId')) {
          normalizedKey = 'companyId';
        }
        
        if (validColumns.includes(normalizedKey)) {
          if (normalizedKey === 'email' && typeof otherQuerys[key] === 'string') {
             conditions.push(`LOWER(TRIM(email)) = ?`);
             params.push((otherQuerys[key] as string).trim().toLowerCase());
          } else {
             conditions.push(`${normalizedKey} = ?`);
             params.push(otherQuerys[key]);
          }
        }
      });

      if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
      }

      const rows = db.prepare(query).all(...params).map((row: any) => {
        const parsedRow: any = {};
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              parsedRow[key] = JSON.parse(value);
            } catch {
              parsedRow[key] = value;
            }
          } else {
            parsedRow[key] = value;
          }
        }
        return parsedRow;
      });
      res.json(rows);
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });

  app.get('/api/data/:collection/:id', authenticateToken, (req, res) => {
    try {
      const { collection, id } = req.params;
      
      if (!validateCollection(collection)) {
        return res.status(400).json({ error: 'Invalid collection name' });
      }
      
      const pk = getPK(collection);
      const row = db.prepare(`SELECT * FROM ${collection} WHERE ${pk} = ?`).get(id);
      if (!row) return res.json(null);
      
      const parsedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            parsedRow[key] = JSON.parse(value);
          } catch {
            parsedRow[key] = value;
          }
        } else {
          parsedRow[key] = value;
        }
      }
      res.json(parsedRow);
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });

  app.post('/api/data/:collection', authenticateToken, (req, res) => {
    try {
      const { collection } = req.params;
      
      if (!validateCollection(collection)) {
        return res.status(400).json({ error: 'Invalid collection name' });
      }
      
      const data = { ...req.body };
      
      // Normalize companyId
      if (data.companyid) {
        data.companyId = data.companyid;
        delete data.companyid;
      }

      const pk = getPK(collection);
      const id = data[pk] || Math.random().toString(36).substring(2, 10);
      delete data[pk];

      // Get table columns to prevent "no such column" errors
      const tableInfo = db.prepare(`PRAGMA table_info(${collection})`).all() as any[];
      const validColumns = tableInfo.map(c => c.name);

      const keys: string[] = [pk];
      const values: any[] = [id];

      Object.keys(data).forEach(key => {
         if (validColumns.includes(key)) {
            keys.push(key);
            values.push(typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
         }
      });

      const placeholders = keys.map(() => '?').join(',');

      db.prepare(`INSERT INTO ${collection} (${keys.join(',')}) VALUES (${placeholders})`).run(...values);
      res.json({ id });
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });

  app.patch('/api/data/:collection/:id', authenticateToken, (req, res) => {
    try {
      const { collection, id } = req.params;
      
      if (!validateCollection(collection)) {
        return res.status(400).json({ error: 'Invalid collection name' });
      }
      
      const data = { ...req.body };

      // Normalize companyId
      if (data.companyid) {
        data.companyId = data.companyid;
        delete data.companyid;
      }

      const pk = getPK(collection);
      const existing = db.prepare(`SELECT * FROM ${collection} WHERE ${pk} = ?`).get(id) as any;

      // Get table columns to prevent "no such column" errors
      const tableInfo = db.prepare(`PRAGMA table_info(${collection})`).all() as any[];
      const validColumns = tableInfo.map(c => c.name);

      const sets: string[] = [];
      const values: any[] = [];
      
      for (const [k, v] of Object.entries(data)) {
        if (!validColumns.includes(k)) continue;

        sets.push(`${k} = ?`);
        if (v && typeof v === 'object' && (v as any)._arrayUnion) {
          let currentArray: any[] = [];
          if (existing && existing[k]) {
             try { currentArray = JSON.parse(existing[k]); } catch {}
             if (!Array.isArray(currentArray)) currentArray = [];
          }
          currentArray.push(...(v as any)._arrayUnion);
          currentArray = [...new Set(currentArray)];
          values.push(JSON.stringify(currentArray));
        } else {
          values.push(typeof v === 'object' ? JSON.stringify(v) : v);
        }
      }
      
      if (sets.length === 0) return res.json({ success: true, message: 'No valid fields to update' });

      values.push(id);

      db.prepare(`UPDATE ${collection} SET ${sets.join(',')} WHERE ${pk} = ?`).run(...values);
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });

  app.delete('/api/data/:collection/:id', authenticateToken, (req, res) => {
    try {
      const { collection, id } = req.params;
      
      if (!validateCollection(collection)) {
        return res.status(400).json({ error: 'Invalid collection name' });
      }
      
      const pk = getPK(collection);
      db.prepare(`DELETE FROM ${collection} WHERE ${pk} = ?`).run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });

  // --- AI ENDPOINTS ---

  app.post('/api/ai/generate', authenticateToken, async (req, res) => {
    try {
      const { type, context } = req.body;
      
      let prompt = '';
      
      switch (type) {
        case 'product_doc':
          prompt = `Génère une fiche produit professionnelle complète pour le produit suivant :
            Nom: ${context.name}
            Catégorie: ${context.category}
            Prix: ${context.price} FCFA
            Description de base: ${context.description || 'N/A'}
            
            Format de réponse attendu (JSON uniquement) :
            {
              "shortDescription": "Une phrase accrocheuse",
              "longDescription": "Description détaillée et persuasive",
              "benefits": ["Avantage 1", "Avantage 2", "Avantage 3"],
              "technicalSpecs": {"Caractéristique": "Valeur"},
              "faq": [{"q": "Question?", "a": "Réponse."}],
              "usageTips": "Conseils d'utilisation",
              "qualityScore": 0-100
            }`;
          break;
          
        case 'seo':
          prompt = `Génère des métadonnées SEO pour ce produit Marketplace :
            Nom: ${context.name}
            Catégorie: ${context.category}
            Description: ${context.description}
            
            Format de réponse (JSON uniquement) :
            {
              "metaTitle": "Titre optimisé",
              "metaDescription": "Description meta 160 chars",
              "keywords": ["keyword1", "keyword2"],
              "tags": ["tag1", "tag2"]
            }`;
          break;
          
        case 'marketing':
          prompt = `Génère du contenu marketing pour ce produit :
            Nom: ${context.name}
            
            Format de réponse (JSON uniquement) :
            {
              "facebookPost": "Texte engageant avec emojis",
              "instagramCaption": "Caption courte avec hashtags",
              "adCopy": "Texte publicitaire percutant",
              "smsPromo": "SMS court de 160 chars"
            }`;
          break;
          
        default:
          return res.status(400).send('Invalid generation type');
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean JSON string if model adds markdown blocks
      text = text.replace(/```json|```/g, '').trim();
      
      try {
        const jsonResponse = JSON.parse(text);
        res.json(jsonResponse);
      } catch (e) {
        res.json({ raw: text });
      }
    } catch (err: any) {
      console.error('AI Error:', err);
      res.status(500).send(err.message);
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexusERP Server running on http://localhost:${PORT}`);
  });
}

startServer();
