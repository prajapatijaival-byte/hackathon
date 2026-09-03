import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, User, KeyRound, Mail, Activity } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('reporter');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(data.user.role === 'reporter' ? '/citizen' : '/authority');
    } catch (err) {
      setError('Network error connecting to grid.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-beige flex items-center justify-center p-4 bg-grid-pattern relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-sky/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-teal/15 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white/90 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl border border-white z-10 relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-sky to-brand-teal rounded-t-3xl"></div>
        
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-brand-beige rounded-2xl border border-brand-teal/20 flex items-center justify-center mb-4 shadow-[0_4px_15px_rgba(20,184,166,0.15)]">
            <Activity className="text-brand-teal w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-brand-navy mb-2">Initialize Node</h2>
          <p className="text-slate-500 font-mono text-sm">Create your grid identity</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center font-mono">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-brand-navy mb-2 font-mono">Designation (Name)</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-teal transition-colors" />
              <input 
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-brand-beige/50 border border-slate-200 rounded-xl text-brand-navy placeholder:text-slate-400 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
                placeholder="Agent 47"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-brand-navy mb-2 font-mono">Comm-Link (Email)</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-teal transition-colors" />
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-brand-beige/50 border border-slate-200 rounded-xl text-brand-navy placeholder:text-slate-400 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
                placeholder="citizen@grid.local"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-brand-navy mb-2 font-mono">Encryption Key (Password)</label>
            <div className="relative group">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-teal transition-colors" />
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6}
                className="w-full pl-12 pr-4 py-3 bg-brand-beige/50 border border-slate-200 rounded-xl text-brand-navy placeholder:text-slate-400 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-brand-navy mb-2 font-mono">Clearance Level (Role)</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-teal transition-colors" />
              <select 
                value={role} onChange={e => setRole(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-brand-beige/50 border border-slate-200 rounded-xl text-brand-navy focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all appearance-none font-semibold"
              >
                <option value="reporter">Citizen Reporter (Standard)</option>
                <option value="authority">Authority Dispatch (Admin)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-brand-teal hover:bg-teal-400 text-white font-bold rounded-xl transition-all shadow-[0_8px_20px_rgba(20,184,166,0.3)] hover:shadow-[0_12px_25px_rgba(20,184,166,0.4)] mt-8 uppercase tracking-widest font-mono">
            Register Uplink
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-slate-500 hover:text-brand-teal text-sm font-mono transition-colors font-semibold">
            Already have clearance? Establish Uplink (Login)
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
