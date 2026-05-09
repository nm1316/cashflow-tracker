import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Login from './pages/Login';
import { isAuthenticated } from './services/auth';
import './index.css';

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
