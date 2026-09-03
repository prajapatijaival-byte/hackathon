import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function AuthorityDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolveImage, setResolveImage] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token || user.role !== 'authority') {
      navigate('/');
      return;
    }
    fetchComplaints();
    
    const socket = io('http://localhost:3000');
    socket.on('complaint_created', fetchComplaints);
    socket.on('complaint_updated', fetchComplaints);
    socket.on('status_changed', fetchComplaints);
    socket.on('complaint_resolved', fetchComplaints);
    socket.on('complaint_completed', fetchComplaints);
    return () => socket.disconnect();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/complaints');
      setComplaints(res.data);
      if (selectedComplaint) {
        setSelectedComplaint(res.data.find(c => c.id === selectedComplaint.id));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleAssign = async (id) => {
    try {
      await axios.post(`http://localhost:3000/api/complaints/${id}/assign`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchComplaints();
    } catch(e) {}
  };

  const handleStatus = async (id, status) => {
    try {
      await axios.post(`http://localhost:3000/api/complaints/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchComplaints();
    } catch(e) {}
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveImage || !selectedComplaint) return;
    const formData = new FormData();
    formData.append('image', resolveImage);

    try {
      await axios.post(`http://localhost:3000/api/complaints/${selectedComplaint.id}/resolve`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResolveImage(null);
      fetchComplaints();
    } catch(err) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar list */}
      <div className="w-1/3 bg-white border-r h-screen overflow-y-auto p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Authority Portal</h1>
        
        <div className="space-y-3">
          {complaints.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedComplaint(c)}
              className={`p-4 rounded-xl cursor-pointer border transition-colors ${selectedComplaint?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 text-xs font-bold rounded ${c.priority_score > 70 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                  Score: {c.priority_score.toFixed(1)}
                </span>
                <span className="text-xs uppercase font-semibold text-slate-500">{c.status}</span>
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              {c.is_suspicious === 1 && <span className="inline-block mt-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Suspicious</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main detail area */}
      <div className="w-2/3 h-screen overflow-y-auto p-8 relative">
        <button onClick={() => { localStorage.clear(); navigate('/'); }} className="absolute top-8 right-8 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded font-medium text-slate-700">Logout</button>
        
        {selectedComplaint ? (
          <div className="max-w-2xl mt-12 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-bold text-slate-800">{selectedComplaint.title}</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold uppercase">{selectedComplaint.status}</span>
            </div>
            
            <p className="text-slate-600 mb-6">{selectedComplaint.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold">Priority Score</p>
                <p className="text-2xl font-bold text-slate-800">{selectedComplaint.priority_score.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold">Duplicates</p>
                <p className="text-2xl font-bold text-slate-800">{selectedComplaint.duplicate_count}</p>
              </div>
            </div>

            {selectedComplaint.image_path && (
              <div className="mb-8">
                <h3 className="font-semibold text-slate-700 mb-2">Original Report Image</h3>
                <img src={`http://localhost:3000${selectedComplaint.image_path}`} alt="Original" className="rounded-lg shadow-sm border h-64 object-cover w-full" />
              </div>
            )}

            <div className="space-y-4 border-t pt-6">
              <h3 className="font-bold text-lg text-slate-800">Actions</h3>
              
              <div className="flex gap-2">
                {!selectedComplaint.assigned_to && (
                  <button onClick={() => handleAssign(selectedComplaint.id)} className="px-4 py-2 bg-slate-800 text-white rounded font-medium">Assign to me</button>
                )}
                
                {selectedComplaint.status === 'assigned' && (
                  <button onClick={() => handleStatus(selectedComplaint.id, 'in_progress')} className="px-4 py-2 bg-blue-600 text-white rounded font-medium">Mark In Progress</button>
                )}
              </div>

              {selectedComplaint.status === 'in_progress' && (
                <form onSubmit={handleResolve} className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <h4 className="font-semibold mb-2">Submit Resolution</h4>
                  <input type="file" onChange={e => setResolveImage(e.target.files[0])} accept="image/*" className="mb-3 w-full" required />
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-medium w-full">Upload After-Repair Photo & Resolve</button>
                </form>
              )}
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p>Select a complaint to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
