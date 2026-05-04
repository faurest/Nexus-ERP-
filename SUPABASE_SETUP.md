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

## 🗄️ Étape 3 : Initialiser la Base de Données
Si ce n'est pas déjà fait, allez dans le **SQL Editor** de Supabase et exécutez le script ci-dessous :

```sql
-- Réinitialisation (Optionnel)
-- DROP TABLE IF EXISTS companies, personnel, clients, sales, expenses, projects, resources, services, tasks, notifications CASCADE;

-- Tables minimales
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

-- Table des Utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "displayName" TEXT,
  password TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Désactiver RLS pour simplifier le test initial
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

## 🛠️ Correction d'Erreurs
### Si vous avez l'erreur "column createdAt/joinCode does not exist" :
Exécutez ce script de **Réparation Totale** dans le SQL Editor :

```sql
-- S'assurer que les colonnes indispensables existent
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "memberEmails" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "employees" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "roles" JSONB DEFAULT '{}'::jsonb;

-- Remplir les codes de jointure vides
UPDATE companies SET "joinCode" = substring(md5(random()::text), 0, 7) WHERE "joinCode" IS NULL;

-- S'assurer que RLS est désactivé le temps des tests
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
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
