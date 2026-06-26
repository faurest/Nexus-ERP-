-- Nexus ERP Comprehensive Schema for Supabase (PostgreSQL)
-- Drop existing tables to ensure a clean slate (WARNING: THIS DELETES EXISTING DATA IN SUPABASE)
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS ecommerce_orders CASCADE;
DROP TABLE IF EXISTS stock_history CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS salary_advances CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id TEXT NOT NULL, 
  owner_email VARCHAR(255) NOT NULL,
  join_code VARCHAR(50) UNIQUE NOT NULL,
  delivery_fees JSONB,
  naira_rate DECIMAL,
  total_profit DECIMAL DEFAULT 0,
  categories JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERSONNEL
CREATE TABLE personnel (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  uid TEXT,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(100),
  department VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  join_method VARCHAR(50),
  notes TEXT,
  tasks_assigned_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTS
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  sales_total DECIMAL DEFAULT 0,
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  purchase_price DECIMAL,
  category VARCHAR(100),
  image TEXT,
  stock INT DEFAULT 0,
  points INT DEFAULT 0,
  views INT DEFAULT 0,
  tags JSONB,
  sold_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALES & ORDERS
CREATE TABLE ecommerce_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  global_order_id TEXT,
  items JSONB NOT NULL,
  total DECIMAL NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'UNPAID',
  status VARCHAR(50) DEFAULT 'PENDING',
  realized_profit DECIMAL DEFAULT 0,
  transaction_fee DECIMAL DEFAULT 0,
  cancellation_reason TEXT,
  customer_email VARCHAR(255),
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_history (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  reason TEXT,
  comment TEXT,
  author_name VARCHAR(255),
  author_role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TASKS
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  assigned_to TEXT REFERENCES personnel(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STOCK HISTORY & RESOURCE MOVEMENTS
CREATE TABLE stock_history (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  previous_stock INT,
  new_stock INT,
  purchase_price DECIMAL,
  reason TEXT,
  author_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NOTIFICATIONS
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERSONNEL EXTRA TABLES
CREATE TABLE leave_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  staff_id TEXT REFERENCES personnel(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_entries (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  staff_id TEXT REFERENCES personnel(id) ON DELETE CASCADE,
  project_id TEXT,
  date DATE NOT NULL,
  hours DECIMAL NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE salary_advances (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  staff_id TEXT REFERENCES personnel(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  request_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  deduction_month VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance on common queries
CREATE INDEX idx_personnel_company ON personnel(company_id);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_ecommerce_orders_company ON ecommerce_orders(company_id);
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
