import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { LogOut, MapPin, Camera, Navigation, ArrowUpCircle, CheckCircle2, Activity } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if(center) map.flyTo(center, 15); }, [center, map]);
  return null;
}

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('infrastructure');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState([19.05, 72.05]); 
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token || user.role !== 'reporter') { navigate('/'); return; }
    fetchComplaints();
    const socket = io('http://localhost:3000');
    socket.on('complaint_created', fetchComplaints);
    socket.on('complaint_updated', fetchComplaints);
    socket.on('status_changed', fetchComplaints);
    socket.on('complaint_resolved', fetchComplaints);
    return () => socket.disconnect();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/complaints');
      setComplaints(res.data);
    } catch(err) {}
  };

  const getLocation = (e) => {
    e.preventDefault();
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      }, (err) => {
        alert("Location access denied.");
        setLocating(false);
      });
    } else {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('category', category);
    formData.append('latitude', location[0]);
    formData.append('longitude', location[1]);
    if (image) formData.append('image', image);

    try {
      await axios.post('http://localhost:3000/api/complaints', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTitle(''); setDesc(''); setImage(null);
      alert('Node submitted to grid!');
    } catch(err) { alert('Transmission failed'); }
  };

  const confirmResolution = async (id) => {
    try {
      await axios.post(`http://localhost:3000/api/complaints/${id}/confirm`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchComplaints();
    } catch(err) {}
  };

  const handleUpvote = async (id) => {
    try {
      await axios.post(`http://localhost:3000/api/complaints/${id}/upvote`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchComplaints();
    } catch(e) {}
  };

  return (
    <div className="min-h-screen bg-brand-beige bg-grid-pattern flex flex-col font-sans text-brand-navy">
      <header className="bg-white/80 backdrop-blur-md border-b border-brand-navy/10 p-4 sticky top-0 z-50 shadow-[0_4px_30px_rgba(23,37,84,0.05)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Activity className="text-brand-teal animate-pulse" />
            <h1 className="text-2xl font-black uppercase font-mono tracking-wider text-brand-navy">Civic<span className="text-brand-teal">Resolve</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 text-sm hidden md:block font-mono font-bold">ID: {user.name}</span>
            <button onClick={() => { localStorage.clear(); navigate('/'); }} className="flex items-center gap-2 bg-brand-navy hover:bg-slate-800 border border-brand-navy px-4 py-2 rounded-lg transition-colors text-sm font-mono text-white shadow-md">
              <LogOut className="w-4 h-4" /> DISCONNECT
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Report Form */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-white shadow-[0_8px_30px_rgba(23,37,84,0.05)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-sky to-brand-teal"></div>
            <h2 className="text-xl font-bold text-brand-navy mb-6 flex items-center gap-2 font-mono uppercase tracking-widest">
              <Camera className="text-brand-teal" /> Submit Anomaly
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold font-mono text-slate-500 mb-1 uppercase tracking-wider">Designation</label>
                <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-brand-beige border border-slate-200 rounded-xl focus:ring-1 focus:ring-brand-teal focus:border-brand-teal focus:outline-none transition-all text-brand-navy placeholder:text-slate-400" placeholder="Anomaly type..." />
              </div>
              
              <div>
                <label className="block text-xs font-bold font-mono text-slate-500 mb-1 uppercase tracking-wider">Parameters</label>
                <textarea required value={desc} onChange={e=>setDesc(e.target.value)} className="w-full px-4 py-2.5 bg-brand-beige border border-slate-200 rounded-xl focus:ring-1 focus:ring-brand-teal focus:border-brand-teal focus:outline-none transition-all text-brand-navy placeholder:text-slate-400" rows="3" placeholder="Input variables..."></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-500 mb-1 uppercase tracking-wider">Class</label>
                  <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-brand-beige border border-slate-200 rounded-xl focus:ring-1 focus:ring-brand-teal focus:border-brand-teal text-brand-navy outline-none appearance-none font-semibold">
                    <option value="infrastructure">Infrastructure</option>
                    <option value="sanitation">Sanitation</option>
                    <option value="electrical">Electrical</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-500 mb-1 uppercase tracking-wider">Coordinates</label>
                  <button onClick={getLocation} type="button" disabled={locating} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-sky/10 hover:bg-brand-sky/20 text-brand-navy rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-colors border border-brand-sky/30">
                    <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                    {locating ? 'Scanning...' : 'Ping GPS'}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold font-mono text-slate-500 mb-1 uppercase tracking-wider">Visual Scan (Required)</label>
                <input required type="file" onChange={e=>setImage(e.target.files[0])} accept="image/*" className="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:uppercase file:tracking-wider file:font-bold file:bg-brand-teal/10 file:text-brand-teal hover:file:bg-brand-teal/20 transition-all cursor-pointer border border-slate-200 rounded-xl bg-brand-beige" />
              </div>
              
              <button type="submit" className="w-full bg-brand-navy hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_8px_20px_rgba(23,37,84,0.2)] hover:shadow-[0_12px_25px_rgba(23,37,84,0.3)] mt-2 font-mono uppercase tracking-widest">
                Transmit to Grid
              </button>
            </form>
          </motion.div>
        </div>

        {/* Right Column: Interactive Map & Feed */}
        <div className="lg:col-span-8 space-y-6">
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white p-2 rounded-2xl shadow-xl border border-white h-[350px] relative z-0">
            {/* Using Voyager light map */}
            <MapContainer center={location} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
              <MapUpdater center={location} />
              <Marker position={location}><Popup>Scanner Origin</Popup></Marker>
              
              {complaints.filter(c => c.latitude && c.longitude).map(c => (
                <Marker key={c.id} position={[c.latitude, c.longitude]} opacity={0.9}>
                  <Popup>
                    <div className="font-mono font-bold text-brand-navy">{c.title}</div>
                    <div className="text-xs text-slate-500 uppercase">{c.status}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </motion.div>

          {/* Feed */}
          <div>
            <h3 className="text-xl font-bold text-brand-navy mb-4 flex items-center justify-between font-mono uppercase tracking-widest">
              Grid Status
              <span className="text-xs font-bold text-brand-teal border border-brand-teal/30 bg-brand-teal/10 px-3 py-1 rounded-full">{complaints.length} Anomalies</span>
            </h3>
            
            <div className="space-y-4">
              {complaints.length === 0 && <p className="text-slate-500 font-mono text-center py-10 bg-white rounded-xl border border-slate-200">No anomalies detected in the sector.</p>}
              
              {complaints.map(c => {
                const isMine = c.reporter_id === user.id;
                const requiresMyConfirmation = isMine && c.status === 'resolved' && c.citizen_confirmation !== 'confirmed';
                
                return (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={c.id} className={`bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-lg border transition-all ${isMine ? 'border-brand-sky shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'border-slate-200'} hover:border-brand-teal/50`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center bg-brand-beige p-2 rounded-xl border border-slate-200 min-w-[60px]">
                          <button onClick={() => handleUpvote(c.id)} className="text-slate-400 hover:text-brand-teal transition-colors">
                            <ArrowUpCircle className="w-6 h-6" />
                          </button>
                          <span className="font-mono font-bold text-brand-navy">{c.upvotes || 0}</span>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-brand-navy">{c.title}</h3>
                            {isMine && <span className="bg-brand-sky/20 text-sky-700 border border-brand-sky/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">My Node</span>}
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] rounded-full font-mono font-bold uppercase tracking-wider ${c.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : c.status === 'resolved' ? 'bg-brand-sky/20 text-sky-800 border border-brand-sky/50' : 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-4 pl-[76px] font-medium">{c.description}</p>
                    
                    {c.image_path && (
                      <div className="pl-[76px]">
                        <img src={`http://localhost:3000${c.image_path}`} alt="Report" className="h-40 w-full md:w-64 object-cover rounded-xl shadow-md border border-slate-200" />
                      </div>
                    )}
                    
                    {requiresMyConfirmation && (
                      <div className="mt-5 ml-[76px] p-4 bg-emerald-50 border border-emerald-200 rounded-xl backdrop-blur-md">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-emerald-900 mb-1 font-mono uppercase tracking-wider">Resolution Logged by Authority</p>
                            <p className="text-xs text-emerald-700 mb-3 font-medium">Verify the visual scan to close the node.</p>
                            {c.after_repair_image_path && <img src={`http://localhost:3000${c.after_repair_image_path}`} alt="Repair" className="h-32 rounded-lg shadow-sm mb-3 object-cover border border-emerald-200" />}
                            <button onClick={() => confirmResolution(c.id)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold font-mono uppercase tracking-widest shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all">
                              Verify & Close Node
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
