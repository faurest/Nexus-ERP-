import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CompanyProvider } from './lib/CompanyContext';
import { ThemeProvider } from './lib/ThemeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CompanyProvider>
        <App />
      </CompanyProvider>
    </ThemeProvider>
  </StrictMode>,
);
