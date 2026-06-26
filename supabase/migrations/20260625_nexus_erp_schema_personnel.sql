-- Nexus ERP - Personnel Module Extra Tables

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  staff_id TEXT REFERENCES personnel(id) ON DELETE CASCADE,
  project_id TEXT,
  date DATE NOT NULL,
  hours DECIMAL NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_advances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
