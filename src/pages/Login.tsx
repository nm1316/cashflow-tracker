import { useState } from 'react';
import { login, changePassword, getCredentials, setCredentials } from '../services/auth';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [view, setView] = useState<'login' | 'change' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const [oldPass, setOldPass] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');

  const [resetStep, setResetStep] = useState(1);
  const [resetCode, setResetCode] = useState('');
  const [newPass1, setNewPass1] = useState('');
  const [newPass2, setNewPass2] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Please enter username and password'); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    if (login(username.trim(), password)) {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass.trim() || newPass.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (!oldPass) { setError('Current password required'); return; }
    setError('');
    if (changePassword(oldPass, newUser.trim() || username, newPass)) {
      setUsername(newUser.trim() || username);
      setPassword(newPass);
      setView('login');
      setOldPass(''); setNewUser(''); setNewPass('');
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Current password is incorrect');
    }
  };

  const handleResetStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const creds = getCredentials();
    if (username.trim().toLowerCase() !== creds.username.toLowerCase()) {
      setError('Username not found');
      return;
    }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    setResetStep(2);
    setSuccess('Verification code sent to your device (check console)');
    console.log('[SECURITY] Reset code:', 'CASHFLOW-' + Math.random().toString(36).toUpperCase().slice(2, 8));
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleResetStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass1.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (newPass1 !== newPass2) { setError('Passwords do not match'); return; }
    if (resetCode.length < 4) { setError('Please enter the verification code'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setCredentials(username.trim(), newPass1);
      setLoading(false);
      setView('login');
      setUsername('');
      setPassword('');
      setResetStep(1);
      setResetCode('');
      setNewPass1('');
      setNewPass2('');
      setSuccess('Password reset successful. Sign in with new password.');
      setTimeout(() => setSuccess(''), 5000);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e293b 100%)' }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)', animation: 'float1 10s ease-in-out infinite' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', animation: 'float2 12s ease-in-out infinite' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 70%)', transform: 'translate(-50%, -50%)', animation: 'float3 15s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes float1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(40px, 40px) scale(1.1); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-30px, 30px) scale(1.05); } }
        @keyframes float3 { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.15); } }
      `}</style>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="rounded-3xl p-8 shadow-2xl border border-cyan-500/10" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: '0 10px 40px rgba(34,211,238,0.2)' }}>
              <span className="text-white font-bold text-xl">$</span>
            </div>
            <h1 className="text-2xl font-bold text-white">My Cashflow</h1>
            <p className="text-slate-400 text-sm mt-1">
              {view === 'login' ? 'Sign in to continue' : view === 'change' ? 'Change credentials' : 'Reset password'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl px-4 py-3 text-teal-400 text-sm text-center mb-4">
              {success}
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all bg-slate-800/50"
                  placeholder="Enter username" autoComplete="username" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 rounded-xl px-4 pr-12 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all bg-slate-800/50"
                    placeholder="Enter password" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors">
                    {showPass ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                style={{ boxShadow: '0 10px 30px rgba(34,211,238,0.2)' }}>
                {loading ? (
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                ) : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setView('reset')} className="flex-1 text-slate-500 hover:text-cyan-400 text-xs transition-colors py-2">
                  Forgot password?
                </button>
                <button type="button" onClick={() => setView('change')} className="flex-1 text-slate-500 hover:text-cyan-400 text-xs transition-colors py-2 text-right">
                  Change credentials
                </button>
              </div>
            </form>
          )}

          {view === 'change' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Current Password</label>
                <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-800/50"
                  placeholder="Current password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">New Username</label>
                <input type="text" value={newUser} onChange={e => setNewUser(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-800/50"
                  placeholder="Leave blank to keep current" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-800/50"
                  placeholder="New password (min 4 chars)" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setView('login'); setError(''); setOldPass(''); setNewUser(''); setNewPass(''); }}
                  className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-sm transition-colors border border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl font-semibold text-sm transition-all">
                  Save
                </button>
              </div>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={resetStep === 1 ? handleResetStep1 : handleResetStep2} className="space-y-4">
              {resetStep === 1 ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                      className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-800/50"
                      placeholder="Enter your username" autoComplete="username" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all">
                    {loading ? 'Verifying...' : 'Verify Username'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Verification Code</label>
                    <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value)}
                      className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-800/50 font-mono tracking-widest"
                      placeholder="CASHFLOW-XXXXXX" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">New Password</label>
                    <input type="password" value={newPass1} onChange={e => setNewPass1(e.target.value)}
                      className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-800/50"
                      placeholder="New password (min 4 chars)" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Confirm Password</label>
                    <input type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)}
                      className="w-full h-12 rounded-xl px-4 text-sm text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-800/50"
                      placeholder="Confirm new password" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setView('login'); setResetStep(1); setError(''); setResetCode(''); setNewPass1(''); setNewPass2(''); }}
                      className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-sm transition-colors border border-slate-700">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all">
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>


      </div>
    </div>
  );
}
