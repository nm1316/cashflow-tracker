import { useState } from 'react';
import { login, changePassword } from '../services/auth';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showChange, setShowChange] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(username, password)) {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (changePassword(oldPass, newUser, newPass)) {
      setUsername(newUser);
      setPassword(newPass);
      setShowChange(false);
      setOldPass('');
      setNewUser('');
      setNewPass('');
      onLogin();
    } else {
      setError('Current password is incorrect');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 70%, #475569 100%)' }}>
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)', animation: 'float1 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 70%)', animation: 'float2 10s ease-in-out infinite' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', transform: 'translate(-50%, -50%)', animation: 'float3 12s ease-in-out infinite' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <style>{`
        @keyframes float1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, 30px) scale(1.1); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-20px, 20px) scale(1.05); } }
        @keyframes float3 { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.2); } }
      `}</style>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Glass card */}
        <div className="backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center mb-4 shadow-lg border border-white/10" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
              <span className="text-white font-bold text-2xl">$</span>
            </div>
            <h1 className="text-2xl font-bold text-white">My Cashflow</h1>
            <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
          </div>

          {!showChange ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 rounded-xl px-4 pr-12 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                    {showPass ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <button type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-98 shadow-lg"
                style={{ boxShadow: '0 10px 30px rgba(59,130,246,0.3)' }}>
                Sign In
              </button>

              <button type="button" onClick={() => setShowChange(true)}
                className="w-full text-slate-400 hover:text-white text-xs transition-colors mt-2">
                Change username or password
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">Current Password</label>
                <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  placeholder="Current password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">New Username</label>
                <input type="text" value={newUser} onChange={e => setNewUser(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  placeholder="New username" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  placeholder="New password" />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">{error}</div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowChange(false); setError(''); setOldPass(''); setNewUser(''); setNewPass(''); }}
                  className="flex-1 h-12 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-sm transition-colors border border-white/10">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-98 shadow-lg">
                  Save
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Default: admin / cashflow123
        </p>
      </div>
    </div>
  );
}
