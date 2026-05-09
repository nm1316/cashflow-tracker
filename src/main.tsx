import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Login from './pages/Login';
import { isAuthenticated } from './services/auth';
import './index.css';

const APP_VERSION = '11';
const VERSION_KEY = 'app_v';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    if (regs.length > 0) {
      regs.forEach(r => r.unregister());
    }
  });
}

const prev = localStorage.getItem(VERSION_KEY);
if (prev && prev !== APP_VERSION) {
  localStorage.setItem(VERSION_KEY, APP_VERSION);
  window.location.reload();
} else {
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

function Root() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return <App onLogout={() => setAuthenticated(false)} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
