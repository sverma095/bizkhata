import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Log uncaught promise rejections (e.g. a fetch() that fails due to a network drop
// mid-submit) so they're at least visible in the console instead of failing completely
// silently. This does not recover the action — the user still needs to retry — but it
// means a "nothing happened when I clicked Save" report can actually be diagnosed.
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
