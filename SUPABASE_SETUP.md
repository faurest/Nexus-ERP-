# Configuration de Supabase pour Nexus ERP

Pour garantir que vos données soient conservées de façon permanente, suivez ces étapes :

## 1. Création des Tables
Copiez le code SQL suivant et collez-le dans le **SQL Editor** de votre tableau de bord Supabase, puis cliquez sur **Run**.

```sql
-- Table des Entreprises
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
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
  interactions JSONB,
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
Par défaut, Supabase active le RLS. Pour que l'application puisse accéder aux données, vous avez deux options :

### Option A : Désactiver le RLS (Rapide pour test)
Dans le tableau de bord Supabase, allez dans **Table Editor**, sélectionnez chaque table, cliquez sur **RLS disabled**.

### Option B : Configurer des politiques (Sécurisé)
Exécutez ce script SQL pour autoriser les membres de votre ERP à accéder aux données :
```sql
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated access" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow authenticated access" ON %I FOR ALL TO authenticated USING (true);', t);
  END LOOP;
END $$;
```
