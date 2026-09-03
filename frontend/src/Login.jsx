import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, User, KeyRound, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(data.user.role === 'reporter' ? '/citizen' : '/authority');
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen bg-brand-beige flex overflow-hidden font-sans bg-grid-pattern">
      {/* Decorative Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-brand-sky/20 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] bg-brand-teal/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>

      <div className="flex w-full z-10">
        {/* Left Side: Branding */}
        <div className="hidden lg:flex w-1/2 flex-col justify-center px-20 text-brand-navy relative border-r border-brand-navy/10 bg-brand-beige/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-brand-sky/30 shadow-[0_4px_20px_rgba(56,189,248,0.2)]">
                <MapPin className="text-brand-teal w-10 h-10" />
              </div>
              <h1 className="text-6xl font-black tracking-tight uppercase font-mono text-brand-navy">Civic<span className="text-brand-teal">Resolve</span></h1>
            </div>
            <p className="text-2xl text-slate-600 max-w-lg leading-relaxed mb-10 font-light">
              Next-generation public infrastructure grid. Establish an uplink to monitor the city ecosystem.
            </p>
            
            <div className="flex items-center gap-2 text-brand-navy font-mono text-sm uppercase tracking-widest border border-brand-teal/30 bg-brand-teal/10 w-max px-4 py-2 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-teal animate-ping"></span>
              Grid Online
            </div>
          </motion.div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-md bg-white/80 backdrop-blur-2xl p-10 rounded-3xl shadow-2xl border border-white relative"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-sky to-brand-teal rounded-t-3xl"></div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-brand-navy mb-2">Establish Uplink</h2>
              <p className="text-slate-500 font-mono text-sm">Provide credentials to access the municipal grid</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center font-mono">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2 font-mono">Comm-Link (Email)</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-teal transition-colors" />
                  <input 
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-brand-beige/50 border border-slate-200 rounded-xl text-brand-navy placeholder:text-slate-400 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
                    placeholder="agent@grid.local"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-2 font-mono">Encryption Key (Password)</label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-brand-teal transition-colors" />
                  <input 
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-brand-beige/50 border border-slate-200 rounded-xl text-brand-navy placeholder:text-slate-400 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-brand-navy hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(23,37,84,0.2)] hover:shadow-[0_12px_25px_rgba(23,37,84,0.3)] mt-8 group uppercase tracking-widest font-mono">
                Initialize Login <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link to="/register" className="text-slate-500 hover:text-brand-teal text-sm font-mono transition-colors font-semibold">
                No clearance? Register a new Uplink
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}