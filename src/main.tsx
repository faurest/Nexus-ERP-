import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CompanyProvider } from './lib/CompanyContext';
import './index.css';
import { bootstrapOffline } from './core/bootstrap/bootstrapOffline';

bootstrapOffline().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <CompanyProvider>
        <App />
      </CompanyProvider>
    </StrictMode>,
  );
});
