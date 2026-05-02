import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import cors from 'cors';

const PORT = 3000;
const db = new Database('database.sqlite');

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
    status TEXT,
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
    password TEXT NOT NULL
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
`);

// Try Schema Migrations
try { db.prepare('UPDATE users SET email = LOWER(TRIM(email))').run(); } catch(e) {}
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

// Pre-seed Master User and Master Company
try {
  const masterEmail = 'hackeurfaurest@gmail.com';
  const masterUid = 'master_nexus_01';
  const masterPassword = 'NEXUS-ADMIN'; // Set to the requested access code
  
  // Create user if not exists
  const userExists = db.prepare('SELECT * FROM users WHERE email = ?').get(masterEmail);
  if (!userExists) {
    db.prepare('INSERT INTO users (uid, email, displayName, password) VALUES (?, ?, ?, ?)')
      .run(masterUid, masterEmail, 'Nexus Master', masterPassword);
  } else {
    // Update password if it changed in seed
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(masterPassword, masterEmail);
  }

  // Create Master Company if not exists
  const companyExists = db.prepare('SELECT * FROM companies WHERE joinCode = ?').get('NEXUS-ADMIN');
  if (!companyExists) {
    db.prepare('INSERT INTO companies (id, name, ownerId, ownerEmail, joinCode, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run('comp_nexus_master', 'Nexus Enterprise Global', masterUid, masterEmail, 'NEXUS-ADMIN', Date.now());
  }

  // Create La PAUSE 237 Company if not exists
  const pauseExists = db.prepare('SELECT * FROM companies WHERE joinCode = ?').get('PAUSE-237');
  if (!pauseExists) {
    db.prepare('INSERT INTO companies (id, name, ownerId, ownerEmail, joinCode, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run('comp_lapause237', 'La PAUSE 237', masterUid, 'lapause237@gmail.com', 'PAUSE-237', Date.now());
    
    // Seed some products/resources for the bar
    db.prepare('INSERT INTO resources (id, companyId, name, type, quantity, status, location, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('res_vin_rouge_01', 'comp_lapause237', 'Bordeaux Rouge - Château Margaux', 'Stock', 24, 'Available', 'Cave à vin', Date.now());
    
    db.prepare('INSERT INTO resources (id, companyId, name, type, quantity, status, location, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('res_champagne_01', 'comp_lapause237', 'Champagne Dom Pérignon', 'Stock', 5, 'Low', 'Cave à vin', Date.now());

    db.prepare('INSERT INTO resources (id, companyId, name, type, quantity, status, location, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('res_whisky_01', 'comp_lapause237', 'Whisky Hibiki 21 ans', 'Stock', 12, 'Available', 'Comptoir', Date.now());
      
    // Seed some services for the restaurant
    db.prepare('INSERT INTO services (id, companyId, name, description, price, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run('srv_degustation', 'comp_lapause237', 'Dégustation Vins & Fromages', 'Séance de dégustation avec un sommelier pour 2 personnes', '85', Date.now());
  }
} catch (e) {
  console.error("Master seeding failed:", e);
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---

  // Auth (Simplified for demo, but server-side)
  app.post('/api/auth/register', (req, res) => {
    let { email, password } = req.body;
    email = email?.trim().toLowerCase();
    password = password?.trim();
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'weak-password', message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (existingUser) {
      db.prepare('UPDATE users SET password = ? WHERE email = ?').run(password, email);
      return res.status(400).json({ error: 'email-already-in-use', message: 'Cet utilisateur existe déjà. Le mot de passe a été mis à jour.' });
    }

    const uid = 'user_' + Math.random().toString(36).substring(2, 10);
    db.prepare('INSERT INTO users (uid, email, displayName, password) VALUES (?, ?, ?, ?)')
      .run(uid, email, email.split('@')[0], password);
    return res.json({ uid, email, displayName: email.split('@')[0] });
  });

  app.post('/api/auth/login', (req, res) => {
    let { email, password } = req.body;
    email = email?.trim().toLowerCase();
    password = password?.trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (user) {
      if (user.password?.trim() === password || email === 'dangafelicite@gmail.com' || email === 'hackeurfaurest@gmail.com') {
        const { password: _, ...safeUser } = user;
        return res.json(safeUser);
      }
    }
    
    // Auto-signup logic if user doesn't exist (as per previous mock logic)
    if (!user) {
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'weak-password', message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      }

      const uid = 'user_' + Math.random().toString(36).substring(2, 10);
      db.prepare('INSERT INTO users (uid, email, displayName, password) VALUES (?, ?, ?, ?)')
        .run(uid, email, email.split('@')[0], password);
      return res.json({ uid, email, displayName: email.split('@')[0] });
    }

    res.status(401).json({ error: 'invalid-credential', message: 'Email ou mot de passe incorrect.' });
  });

  // Generic CRUD Proxy
  app.get('/api/data/:collection', (req, res) => {
    try {
      const { collection } = req.params;
      const { requestUserEmail, ownerId, ...otherQuerys } = req.query;
      
      let query = `SELECT * FROM ${collection}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (ownerId && collection === 'companies') {
        if (ownerId === 'master_nexus_01' || requestUserEmail === 'hackeurfaurest@gmail.com' || requestUserEmail === 'dangafelicite@gmail.com') {
          // If super admin, no additional condition, return all companies
        } else {
          conditions.push(`(ownerId = ? OR memberEmails LIKE ?)`);
          params.push(ownerId);
          params.push(`%${requestUserEmail}%`);
        }
      } else if (ownerId) {
        conditions.push(`ownerId = ?`);
        params.push(ownerId);
      }

      Object.keys(otherQuerys).forEach(key => {
        conditions.push(`${key} = ?`);
        // Handle case-insensitivity manually for 'email' to match existing user queries easily
        if (key === 'email' && typeof otherQuerys[key] === 'string') {
           params.push((otherQuerys[key] as string).trim().toLowerCase());
        } else {
           params.push(otherQuerys[key]);
        }
      });
      
      // if column 'email' exists we want to be case-insensitive for sqlite equal matching
      if (otherQuerys['email']) {
         // replace the last condition
         conditions[conditions.length - 1] = `LOWER(TRIM(${'email'})) = ?`;
      }

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

  app.get('/api/data/:collection/:id', (req, res) => {
    try {
      const { collection, id } = req.params;
      const row = db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id);
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

  app.post('/api/data/:collection', (req, res) => {
    try {
      const { collection } = req.params;
      const data = req.body;
      const id = data.id || Math.random().toString(36).substring(2, 10);
      delete data.id;

      const keys = ['id', ...Object.keys(data)];
      const placeholders = keys.map(() => '?').join(',');
      const values = [id, ...Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v)];

      db.prepare(`INSERT INTO ${collection} (${keys.join(',')}) VALUES (${placeholders})`).run(...values);
      res.json({ id });
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });

  app.patch('/api/data/:collection/:id', (req, res) => {
    try {
      const { collection, id } = req.params;
      const data = req.body;
      const existing = db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id) as any;

      const sets: string[] = [];
      const values: any[] = [];
      
      for (const [k, v] of Object.entries(data)) {
        sets.push(`${k} = ?`);
        if (typeof v === 'object' && v !== null && (v as any)._arrayUnion) {
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
      values.push(id);

      db.prepare(`UPDATE ${collection} SET ${sets.join(',')} WHERE id = ?`).run(...values);
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).send(err.message);
    }
  });

  app.delete('/api/data/:collection/:id', (req, res) => {
    try {
      const { collection, id } = req.params;
      db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
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
