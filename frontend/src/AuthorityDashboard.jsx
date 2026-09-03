import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, LayoutDashboard, Map as MapIcon, LogOut, ArrowRightCircle, AlertOctagon, Activity } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if(center) map.flyTo(center, 14); }, [center, map]);
  return null;
}

const COLORS = ['#14b8a6', '#38bdf8', '#172554', '#cbd5e1']; // Brand colors for charts

export default function AuthorityDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState({ categories: [], statuses: [] });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolveImage, setResolveImage] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token || user.role !== 'authority') { navigate('/'); return; }
    fetchData();
    const socket = io('http://localhost:3000');
    socket.on('complaint_created', fetchData);
    socket.on('complaint_updated', fetchData);
    socket.on('status_changed', fetchData);
    socket.on('complaint_resolved', fetchData);
    socket.on('complaint_completed', fetchData);
    return () => socket.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/complaints');
      setComplaints(res.data);
      if (selectedComplaint) setSelectedComplaint(res.data.find(c => c.id === selectedComplaint.id));
      
      const statRes = await axios.get('http://localhost:3000/api/analytics', { headers: { Authorization: `Bearer ${token}` }});
      setAnalytics(statRes.data);
    } catch(err) {}
  };

  const handleAssign = async (id) => {
    try { await axios.post(`http://localhost:3000/api/complaints/${id}/assign`, {}, { headers: { Authorization: `Bearer ${token}` }}); fetchData(); } catch(e) {}
  };

  const handleStatus = async (id, status) => {
    try { await axios.post(`http://localhost:3000/api/complaints/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` }}); fetchData(); } catch(e) {}
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveImage || !selectedComplaint) return;
    const formData = new FormData();
    formData.append('image', resolveImage);
    try {
      await axios.post(`http://localhost:3000/api/complaints/${selectedComplaint.id}/resolve`, formData, { headers: { Authorization: `Bearer ${token}` }});
      setResolveImage(null);
      fetchData();
    } catch(err) {}
  };

  return (
    <div className="h-screen bg-brand-beige bg-grid-pattern flex font-sans overflow-hidden text-brand-navy">
      
      {/* Sidebar Navigation */}
      <div className="w-20 lg:w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200 flex flex-col justify-between shadow-[4px_0_30px_rgba(23,37,84,0.05)] z-20">
        <div>
          <div className="p-4 lg:p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-200">
            <Shield className="text-brand-teal w-8 h-8 shrink-0" />
            <h1 className="text-xl font-black uppercase font-mono tracking-wider text-brand-navy hidden lg:block">Command<span className="text-brand-teal">Center</span></h1>
          </div>
          
          <nav className="p-4 space-y-3 mt-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all border font-bold ${activeTab==='dashboard' ? 'bg-brand-navy text-white border-brand-navy shadow-[0_4px_15px_rgba(23,37,84,0.2)]' : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-brand-navy'}`}>
              <LayoutDashboard className="w-5 h-5" /> <span className="hidden lg:block font-mono text-sm uppercase tracking-wider">Metrics</span>
            </button>
            <button onClick={() => setActiveTab('dispatch')} className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all border font-bold ${activeTab==='dispatch' ? 'bg-brand-teal text-white border-brand-teal shadow-[0_4px_15px_rgba(20,184,166,0.2)]' : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-brand-teal'}`}>
              <MapIcon className="w-5 h-5" /> <span className="hidden lg:block font-mono text-sm uppercase tracking-wider">Tactical Map</span>
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200">
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all font-mono text-sm uppercase tracking-wider font-bold">
            <LogOut className="w-5 h-5" /> <span className="hidden lg:block">Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md h-16 border-b border-slate-200 flex items-center px-8 justify-between z-10">
          <h2 className="text-lg font-bold text-brand-navy uppercase font-mono tracking-widest flex items-center gap-2">
            <Activity className="text-brand-teal animate-pulse w-5 h-5" />
            {activeTab} Overview
          </h2>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-slate-600 hidden md:block font-bold">Agent ID: {user.name}</span>
            <div className="w-8 h-8 bg-brand-sky/20 border border-brand-sky rounded-md flex items-center justify-center text-sky-700 font-bold font-mono shadow-sm">{user.name?.charAt(0)}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
                {/* Analytics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(23,37,84,0.05)]">
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Anomaly Distribution by Class</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analytics.categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={{fill: '#172554', fontSize: 12, fontWeight: 700}}>
                            {analytics.categories.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#172554', fontWeight: 600}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(23,37,84,0.05)]">
                    <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Resolution Pipeline</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.statuses}>
                          <XAxis dataKey="status" tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} />
                          <YAxis tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} />
                          <Tooltip contentStyle={{backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#172554', fontWeight: 600}} />
                          <Bar dataKey="count" fill="#14b8a6" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Complaint List Grid */}
                <h3 className="font-mono text-lg font-bold text-brand-navy mb-6 uppercase tracking-widest">Active Dispatch Queue</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {complaints.map(c => (
                    <div key={c.id} onClick={() => { setSelectedComplaint(c); setActiveTab('dispatch'); }} className="bg-white/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-200 hover:border-brand-sky hover:shadow-[0_8px_25px_rgba(56,189,248,0.15)] cursor-pointer transition-all relative overflow-hidden group">
                      {c.priority_score > 50 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500 rotate-45 translate-x-8 -translate-y-8 z-0 shadow-sm"></div>}
                      <div className="relative z-10 flex justify-between items-start mb-3">
                        <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded border ${c.priority_score > 50 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          Threat Lvl: {c.priority_score.toFixed(0)}
                        </span>
                        <span className="text-[10px] font-mono uppercase font-bold text-brand-teal tracking-wider">{c.status}</span>
                      </div>
                      <h4 className="font-bold text-brand-navy mb-2 line-clamp-1 relative z-10 font-mono">{c.title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-2 relative z-10 font-medium">{c.description}</p>
                      
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 relative z-10">
                        <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1"><ArrowUpCircle className="w-4 h-4"/> {c.upvotes} Civ. Votes</span>
                        <span className="text-brand-navy text-xs font-mono uppercase font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">Initialize <ArrowRightCircle className="w-4 h-4"/></span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'dispatch' && (
              <motion.div key="dispatch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full">
                
                {/* Left Side: Selected Complaint Detail */}
                <div className="w-full md:w-[450px] bg-white/95 backdrop-blur-2xl border-r border-slate-200 h-full overflow-y-auto shrink-0 shadow-[4px_0_30px_rgba(0,0,0,0.05)] z-10">
                  {selectedComplaint ? (
                    <div className="p-6">
                      <button onClick={() => setSelectedComplaint(null)} className="text-xs text-brand-sky font-mono uppercase tracking-widest font-bold mb-6 flex items-center gap-1 hover:text-sky-600 transition-colors">
                        &larr; Abort View
                      </button>
                      
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-brand-navy font-mono">{selectedComplaint.title}</h2>
                        <span className="px-3 py-1 bg-brand-sky/20 border border-brand-sky/50 text-sky-700 rounded text-[10px] font-mono font-bold uppercase tracking-wider">{selectedComplaint.status}</span>
                      </div>
                      
                      <p className="text-slate-600 font-medium mb-6 bg-brand-beige p-4 rounded-xl text-sm border border-slate-100">{selectedComplaint.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 shadow-sm">
                          <p className="text-[10px] text-red-500 uppercase font-bold font-mono tracking-widest mb-1">AI Priority</p>
                          <p className="text-3xl font-black text-red-600 font-mono">{selectedComplaint.priority_score.toFixed(1)}</p>
                        </div>
                        <div className="p-4 bg-brand-sky/10 rounded-xl border border-brand-sky/30 shadow-sm">
                          <p className="text-[10px] text-sky-600 uppercase font-bold font-mono tracking-widest mb-1">Community</p>
                          <p className="text-3xl font-black text-sky-700 font-mono">{selectedComplaint.upvotes} <span className="text-sm font-bold text-sky-500">pings</span></p>
                        </div>
                      </div>

                      {selectedComplaint.is_suspicious === 1 && (
                         <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3 shadow-sm">
                            <AlertOctagon className="text-orange-500 w-6 h-6 shrink-0 animate-pulse" />
                            <p className="text-xs font-mono text-orange-800 uppercase tracking-wider leading-relaxed font-bold">Warning: High probability of duplicate visual signature detected.</p>
                         </div>
                      )}

                      {selectedComplaint.image_path && (
                        <div className="mb-8">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-2">Visual Evidence Feed</p>
                          <div className="relative">
                            <div className="absolute inset-0 border-2 border-brand-navy/10 pointer-events-none rounded-xl z-10"></div>
                            <img src={`http://localhost:3000${selectedComplaint.image_path}`} alt="Original" className="rounded-xl object-cover w-full h-48" />
                            <div className="absolute top-2 left-2 bg-white/80 backdrop-blur text-brand-navy text-[10px] font-mono font-bold px-2 py-1 rounded border border-slate-200 z-10 uppercase shadow-sm">Live Feed // REC</div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 border-t border-slate-200 pt-6">
                        <h3 className="font-bold text-sm text-slate-400 font-mono uppercase tracking-widest">Tactical Actions</h3>
                        
                        <div className="flex flex-col gap-3">
                          {!selectedComplaint.assigned_to && selectedComplaint.status === 'reported' && (
                            <button onClick={() => handleAssign(selectedComplaint.id)} className="px-4 py-4 bg-brand-navy hover:bg-slate-800 border border-brand-navy text-white rounded-xl font-mono uppercase tracking-widest text-sm font-bold shadow-md transition-all">Assign to Unit</button>
                          )}
                          
                          {selectedComplaint.assigned_to === user.id && selectedComplaint.status === 'assigned' && (
                            <button onClick={() => handleStatus(selectedComplaint.id, 'in_progress')} className="px-4 py-4 bg-brand-teal hover:bg-teal-500 text-white rounded-xl font-mono uppercase tracking-widest text-sm font-bold shadow-[0_4px_15px_rgba(20,184,166,0.3)] transition-all">Engage Target (In Progress)</button>
                          )}
                        </div>

                        {selectedComplaint.status === 'in_progress' && (
                          <form onSubmit={handleResolve} className="mt-4 p-5 border border-emerald-200 rounded-2xl bg-emerald-50 shadow-sm">
                            <h4 className="font-bold text-emerald-900 mb-2 font-mono uppercase tracking-wider text-sm">Upload Completion Scan</h4>
                            <p className="text-xs text-emerald-700 font-medium mb-4 font-mono">Provide visual proof to close this node.</p>
                            <input type="file" onChange={e => setResolveImage(e.target.files[0])} accept="image/*" className="mb-4 w-full text-sm text-emerald-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:font-bold file:bg-emerald-200 file:text-emerald-800 hover:file:bg-emerald-300 border border-emerald-200 bg-white rounded-lg p-1" required />
                            <button type="submit" className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono uppercase tracking-widest text-sm font-bold w-full shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all">Transmit Resolution</button>
                          </form>
                        )}
                        
                        {selectedComplaint.status === 'resolved' && (
                           <div className="p-4 bg-brand-sky/10 text-sky-700 font-mono font-bold uppercase tracking-widest text-xs rounded-xl border border-brand-sky/30 text-center animate-pulse">
                             Awaiting Citizen Verification...
                           </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-brand-beige/50">
                      <div className="w-24 h-24 bg-brand-sky/10 border border-brand-sky/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm"><MapIcon className="w-12 h-12 text-sky-500 animate-pulse"/></div>
                      <h3 className="text-xl font-bold text-brand-navy mb-2 font-mono uppercase tracking-widest">Tactical Terminal</h3>
                      <p className="text-sm text-slate-500 font-mono font-medium">Select a map anomaly to view details.</p>
                    </div>
                  )}
                </div>

                {/* Right Side: Map */}
                <div className="flex-1 h-full relative z-0 bg-white">
                  <MapContainer center={[19.05, 72.05]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    {/* Light/Voyager Map Theme */}
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                    <MapUpdater center={selectedComplaint && selectedComplaint.latitude ? [selectedComplaint.latitude, selectedComplaint.longitude] : null} />
                    
                    {complaints.filter(c => c.latitude && c.longitude).map(c => (
                      <Marker key={c.id} position={[c.latitude, c.longitude]}>
                        <Popup>
                          <div className="font-bold mb-1 font-mono text-brand-navy uppercase">{c.title}</div>
                          <button onClick={() => setSelectedComplaint(c)} className="text-[10px] uppercase tracking-widest font-bold bg-brand-navy text-white px-2 py-1 rounded">Access Data</button>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                  
                  {/* Map Overlay Reticle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-brand-sky/20 rounded-full pointer-events-none z-10 flex items-center justify-center">
                    <div className="w-[400px] h-[400px] border border-brand-sky/30 rounded-full"></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
