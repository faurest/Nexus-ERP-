import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CompanyProvider } from './lib/CompanyContext';
import { checkSupabaseConnection } from './lib/supabase';
import './index.css';

// Initialise le test de connexion Supabase
checkSupabaseConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CompanyProvider>
      <App />
    </CompanyProvider>
  </StrictMode>,
);
