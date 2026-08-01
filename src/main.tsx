import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CompanyProvider } from './lib/CompanyContext';
import { DependencyProvider } from './core/di/DependencyProvider';
import { RepositoryProvider } from './core/di/RepositoryProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryProvider>
      <DependencyProvider>
        <CompanyProvider>
          <App />
        </CompanyProvider>
      </DependencyProvider>
    </RepositoryProvider>
  </StrictMode>,
);
