# Configuration de Supabase pour Nexus ERP

Pour garantir que vos données soient conservées de façon permanente, suivez ces étapes :

## 1. Création des Tables
Copiez le code SQL suivant et collez-le dans le **SQL Editor** de votre tableau de bord Supabase, puis cliquez sur **Run**.

```sql
-- Table des Entreprises
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownerId TEXT,
  ownerEmail TEXT NOT NULL,
  joinCode TEXT UNIQUE NOT NULL,
  memberEmails TEXT,
  employees TEXT,
  roles TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table du Personnel
CREATE TABLE personnel (
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
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Clients
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  interactions JSONB,
  salesTotal REAL DEFAULT 0,
  loyaltyPoints INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Ventes
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  itemName TEXT NOT NULL,
  type TEXT,
  quantity INTEGER,
  price REAL,
  total REAL,
  status TEXT,
  clientName TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Projets
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  name TEXT NOT NULL,
  partnerId TEXT,
  budget REAL,
  status TEXT,
  startDate TIMESTAMP WITH TIME ZONE,
  endDate TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Ressources
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  quantity INTEGER,
  location TEXT,
  status TEXT,
  condition TEXT,
  duration TEXT,
  warranty TEXT,
  price INTEGER,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Services
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Tâches
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  title TEXT NOT NULL,
  assignedTo TEXT,
  startDate TEXT,
  endDate TEXT,
  status TEXT DEFAULT 'pending',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  userId TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  isRead BOOLEAN DEFAULT FALSE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 2. Configuration des Secrets
Ajoutez les variables suivantes dans les paramètres de votre application Nexus ERP :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
