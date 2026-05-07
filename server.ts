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
    displayName TEXT
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

// Pre-seed Master User and Master Company
try {
  const masterEmail = 'hackeurfaurest@gmail.com';
  const masterUid = 'master_nexus_01';
  const masterPassword = 'NEXUS-ADMIN'; // Set to the requested access code
  
  // Create user if not exists
  const userExists = db.prepare('SELECT * FROM users WHERE email = ?').get(masterEmail);
  if (!userExists) {
    db.prepare('INSERT INTO users (uid, email, displayName) VALUES (?, ?, ?)')
      .run(masterUid, masterEmail, 'Nexus Master');
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

  // Generic CRUD Proxy
  const getPK = (collection: string) => collection === 'users' ? 'uid' : 'id';

  app.get('/api/data/:collection', (req, res) => {
    try {
      const { collection } = req.params;
      const { requestUserEmail, requestUserId, ownerId, ...otherQuerys } = req.query as any;
      
      // Get table columns
      const tableInfo = db.prepare(`PRAGMA table_info(${collection})`).all() as any[];
      const validColumns = tableInfo.map(c => c.name);

      let query = `SELECT * FROM ${collection}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (collection === 'companies') {
        if (requestUserEmail === 'hackeurfaurest@gmail.com' || requestUserEmail === 'dangafelicite@gmail.com') {
          // All companies
        } else if (ownerId) {
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

  app.get('/api/data/:collection/:id', (req, res) => {
    try {
      const { collection, id } = req.params;
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

  app.post('/api/data/:collection', (req, res) => {
    try {
      const { collection } = req.params;
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

  app.patch('/api/data/:collection/:id', (req, res) => {
    try {
      const { collection, id } = req.params;
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

  app.delete('/api/data/:collection/:id', (req, res) => {
    try {
      const { collection, id } = req.params;
      const pk = getPK(collection);
      db.prepare(`DELETE FROM ${collection} WHERE ${pk} = ?`).run(id);
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
