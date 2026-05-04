# 🛠️ Guide Ultime Configuration Connection Supabase

Si vous voyez l'erreur **"Failed to fetch (api.supabase.com)"**, c'est que l'URL configurée est incorrecte.

## 🏁 Étape 1 : Trouver les bonnes clés
1. Connectez-vous à votre [Dashboard Supabase](https://supabase.com/dashboard).
2. Sélectionnez votre projet.
3. Cliquez sur l'icône **Settings** (Engrenage en bas à gauche).
4. Cliquez sur **API**.
5. Copiez les deux valeurs dans la section **Project API Keys** :
   - **Project URL** : Doit ressembler à `https://abcdefghijklm.supabase.co`
     - ⚠️ **NE PAS** utiliser `https://api.supabase.com`
   - **anon / public** : C'est votre `VITE_SUPABASE_ANON_KEY`.

## ⚙️ Étape 2 : Configurer Nexus ERP
1. Dans cette interface (AI Studio), ouvrez les **Paramètres** (Settings) de l'application (icône engrenage en haut à droite).
2. Allez dans l'onglet **Secrets** ou **Environment Variables**.
3. Ajoutez ou modifiez :
   - `VITE_SUPABASE_URL` = (Collez votre Project URL)
   - `VITE_SUPABASE_ANON_KEY` = (Collez votre clé anon)
4. **Important** : Ne mettez pas de guillemets autour des valeurs.

## 🗄️ Étape 3 : Initialiser la Base de Données (RÉPARTION COMPLÈTE)
Si vous voyez des erreurs sur 'services', 'tasks', 'personnel', etc., exécutez ce script dans le **SQL Editor** de Supabase :

```sql
-- Création de toutes les tables nécessaires
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "ownerId" TEXT,
  "ownerEmail" TEXT NOT NULL,
  "joinCode" TEXT UNIQUE NOT NULL,
  "memberEmails" JSONB DEFAULT '[]'::jsonb,
  employees JSONB DEFAULT '[]'::jsonb,
  roles JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personnel (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  phone TEXT,
  notes TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  department TEXT,
  status TEXT DEFAULT 'active',
  "tasksAssignedCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  interactions JSONB DEFAULT '[]'::jsonb,
  "salesTotal" REAL DEFAULT 0,
  "loyaltyPoints" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  type TEXT,
  quantity INTEGER,
  price REAL,
  total REAL,
  status TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "partnerId" TEXT,
  budget REAL,
  status TEXT,
  "startDate" TIMESTAMP WITH TIME ZONE,
  "endDate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  quantity INTEGER,
  location TEXT,
  status TEXT,
  condition TEXT,
  duration TEXT,
  warranty TEXT,
  price REAL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  title TEXT NOT NULL,
  "assignedTo" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  client TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT,
  status TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "displayName" TEXT,
  password TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Désactiver RLS pour simplifier le test initial sur TOUTES les tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE personnel DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

## 🛠️ Correction d'Erreurs
### Si vous avez l'erreur "column createdAt/joinCode does not exist" :
Exécutez ce script de **Réparation Spécifique** dans le SQL Editor :

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "memberEmails" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "employees" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "roles" JSONB DEFAULT '{}'::jsonb;

UPDATE companies SET "joinCode" = substring(md5(random()::text), 0, 7) WHERE "joinCode" IS NULL;
```

## ☢️ OPTION NUCLÉAIRE (Réinitialisation Totale)
Si vous avez trop d'erreurs de colonnes "not found" ou des problèmes de type, exécutez ce script qui supprime TOUT et recréé proprement :
⚠️ **Attention : Cela effacera toutes les données actuelles de Supabase.**

```sql
-- Suppression massive
DROP TABLE IF EXISTS sales, sales_invoices, expenses, personnel, clients, projects, resources, services, tasks, interventions, notifications, invoices, payments, open_orders, companies, users CASCADE;

-- Recréation propre avec guillemets doubles pour respecter la casse "companyId"
CREATE TABLE companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "ownerId" TEXT,
  "ownerEmail" TEXT NOT NULL,
  "joinCode" TEXT UNIQUE NOT NULL,
  "memberEmails" JSONB DEFAULT '[]'::jsonb,
  employees JSONB DEFAULT '[]'::jsonb,
  roles JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE personnel (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  phone TEXT,
  notes TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  department TEXT,
  status TEXT DEFAULT 'active',
  "tasksAssignedCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  interactions JSONB DEFAULT '[]'::jsonb,
  "salesTotal" REAL DEFAULT 0,
  "loyaltyPoints" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  type TEXT,
  quantity INTEGER,
  price REAL,
  total REAL,
  status TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "partnerId" TEXT,
  budget REAL,
  status TEXT,
  "startDate" TIMESTAMP WITH TIME ZONE,
  "endDate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  quantity INTEGER,
  location TEXT,
  status TEXT,
  condition TEXT,
  duration TEXT,
  warranty TEXT,
  price REAL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  title TEXT NOT NULL,
  "assignedTo" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE interventions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  client TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT,
  status TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "displayName" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE open_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "clientName" TEXT,
  "tableNumber" TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "saleId" TEXT,
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  amount REAL,
  status TEXT DEFAULT 'unpaid',
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "clientName" TEXT,
  "tableNumber" TEXT,
  items TEXT -- Stores items as JSON string for now to match current code
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "projectId" TEXT,
  amount REAL,
  category TEXT,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "projectId" TEXT,
  "partnerId" TEXT,
  amount REAL,
  status TEXT DEFAULT 'pending',
  "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "dueDate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "projectId" TEXT,
  amount REAL,
  type TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "recipientIds" JSONB DEFAULT '[]'::jsonb,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  read BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE partners (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  "contactEmail" TEXT,
  "activeProjectsCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Désactivation RLS (Sécurité à configurer plus tard)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE personnel DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE open_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
```

## 🔄 Récupération des données (La Pause 237, etc.)
Si vous aviez des données sur le serveur local qui ne sont plus là :
1. Allez dans l'onglet **Administration** (maintenant accessible pour vous).
2. Allez dans le sous-onglet **Outils & Migration**.
3. Cliquez sur **Démarrer la Migration Globale**.
4. Toutes les entreprises (y compris La Pause 237) et leurs données seront envoyées vers votre Supabase.
```

## 🚨 Test final
Regardez le badge **"Base de données"** en haut de l'application Nexus :
- 🟢 **Vert** : Tout fonctionne !
- 🟡 **Orange** : Mode Démo (URL manquante ou erronée).
- 🔴 **Rouge** : Erreur de connexion (URL invalide ou réseau bloqué).
