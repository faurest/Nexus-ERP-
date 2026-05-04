# Configuration de Supabase pour Nexus ERP

Pour garantir que vos données soient conservées de façon permanente, suivez ces étapes :

## 1. Création des Tables (Version Robuste)

**IMPORTANT : Réinitialisation**
Si vous avez déjà créé les tables et que vous avez des erreurs, exécutez d'abord ceci pour repartir sur une base propre :
```sql
DROP TABLE IF EXISTS companies, personnel, clients, sales, expenses, projects, resources, services, tasks, notifications CASCADE;
```

**Script de Création (Copiez tout le bloc ci-dessous)** :
```sql
-- Table des Entreprises
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ownerId TEXT,
  ownerEmail TEXT NOT NULL,
  joinCode TEXT UNIQUE NOT NULL,
  memberEmails JSONB DEFAULT '[]'::jsonb,
  employees JSONB DEFAULT '[]'::jsonb,
  roles JSONB DEFAULT '{}'::jsonb,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table du Personnel
CREATE TABLE IF NOT EXISTS personnel (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  companyId TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  interactions JSONB DEFAULT '[]'::jsonb,
  salesTotal REAL DEFAULT 0,
  loyaltyPoints INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Ventes
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Table des Dépenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  companyId TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Projets
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  companyId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Tâches
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  companyId TEXT NOT NULL,
  title TEXT NOT NULL,
  assignedTo TEXT,
  startDate TEXT,
  endDate TEXT,
  status TEXT DEFAULT 'pending',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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

## 3. Sécurité (RLS - Row Level Security)
Exécutez ce script SQL pour autoriser l'accès complet pour le moment (plus simple) :
```sql
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
```
