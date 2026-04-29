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
`);

// Try Schema Migrations
try { db.exec('ALTER TABLE companies ADD COLUMN employees TEXT'); } catch (e) {}

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
} catch (e) {
  console.error("Master seeding failed:", e);
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---

  // Auth (Simplified for demo, but server-side)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    // Master bypass/permissive login
    if (user && (user.password === password || email === 'hackeurfaurest@gmail.com' || email === 'dangafelicite@gmail.com')) {
      // Check if this user is also in the personnel table to get their specific role
      const personnel = db.prepare('SELECT role FROM personnel WHERE email = ? AND companyId IS NOT NULL').get(email) as any;
      
      const { password: _, ...safeUser } = user;
      return res.json({ 
        ...safeUser, 
        role: personnel ? personnel.role : 'owner' // Default to owner if not in personnel
      });
    }
    
    // Auto-signup logic if user doesn't exist (as per previous mock logic)
    if (!user) {
      const uid = 'user_' + Math.random().toString(36).substring(2, 10);
      db.prepare('INSERT INTO users (uid, email, displayName, password) VALUES (?, ?, ?, ?)')
        .run(uid, email, email.split('@')[0], password);
      return res.json({ uid, email, displayName: email.split('@')[0] });
    }

    res.status(401).json({ error: 'invalid-credential' });
  });

  // Generic CRUD Proxy
  app.get('/api/data/:collection', (req, res) => {
    try {
      const { collection } = req.params;
      const { companyId, joinCode } = req.query;
      
      let query = `SELECT * FROM ${collection}`;
      const params: any[] = [];

      if (companyId) {
        query += ` WHERE companyId = ?`;
        params.push(companyId);
      } else if (joinCode) {
        query += ` WHERE joinCode = ?`;
        params.push(joinCode);
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
