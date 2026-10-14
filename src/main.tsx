import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { APP_DISPLAY_NAME, APP_VERSION } from './app-meta';
import { App } from './ui/App';
import { initAppStore } from './ui/store/app-store';
import './ui/styles/app.css';

initAppStore();

document.title = `${APP_DISPLAY_NAME} v${APP_VERSION}`;

const root = document.getElementById('root');
if (!root) {throw new Error('#root not found');}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
