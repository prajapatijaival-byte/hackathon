import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('infrastructure');
  const [image, setImage] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token || user.role !== 'reporter') {
      navigate('/');
      return;
    }
    
    fetchComplaints();

    const socket = io('http://localhost:3000');
    socket.on('complaint_updated', fetchComplaints);
    socket.on('status_changed', fetchComplaints);
    socket.on('complaint_resolved', fetchComplaints);
    return () => socket.disconnect();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/complaints');
      // In a real app we'd filter on backend, but here MVP
      setComplaints(res.data.filter(c => c.reporter_id === user.id));
    } catch(err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('category', category);
    formData.append('latitude', '19.05'); // Mock GPS
    formData.append('longitude', '72.05'); // Mock GPS
    if (image) formData.append('image', image);

    try {
      await axios.post('http://localhost:3000/api/complaints', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTitle(''); setDesc(''); setImage(null);
      fetchComplaints();
      alert('Issue reported successfully!');
    } catch(err) {
      alert('Error reporting issue');
    }
  };

  const confirmResolution = async (id) => {
    try {
      await axios.post(`http://localhost:3000/api/complaints/${id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchComplaints();
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Citizen Dashboard</h1>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="text-slate-500 hover:text-slate-800">Logout</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">Report New Issue</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea required value={desc} onChange={e=>setDesc(e.target.value)} className="w-full px-3 py-2 border rounded" rows="3"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-3 py-2 border rounded">
                  <option value="infrastructure">Infrastructure</option>
                  <option value="sanitation">Sanitation</option>
                  <option value="electrical">Electrical</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Photo Evidence</label>
                <input type="file" onChange={e=>setImage(e.target.files[0])} accept="image/*" className="w-full" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2 rounded">Submit Report</button>
            </form>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Reports</h2>
            {complaints.length === 0 && <p className="text-slate-500">No reports filed yet.</p>}
            {complaints.map(c => (
              <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{c.title}</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium uppercase">{c.status}</span>
                </div>
                <p className="text-slate-600 text-sm mb-2">{c.description}</p>
                {c.image_path && <img src={`http://localhost:3000${c.image_path}`} alt="Report" className="h-32 object-cover rounded mb-2" />}
                
                {c.status === 'resolved' && c.citizen_confirmation !== 'confirmed' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800 mb-2">Authority has marked this as resolved. Please confirm.</p>
                    {c.after_repair_image_path && <img src={`http://localhost:3000${c.after_repair_image_path}`} alt="Repair" className="h-24 object-cover rounded mb-2" />}
                    <button onClick={() => confirmResolution(c.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700">Confirm Fix</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
