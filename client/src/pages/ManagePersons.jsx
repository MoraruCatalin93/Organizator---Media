import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

const API_BASE = 'http://localhost:5001/api';

const ManagePersons = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await axios.get(`${API_BASE}/persons`);
      setPersons(response.data.persons || []);
      setLoading(false);
    } catch (err) {
      setError('Eroare la încărcarea persoanelor');
      setLoading(false);
    }
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!newName || !selectedFile) {
      setStatus({ type: 'error', message: 'Vă rugăm să introduceți un nume și o imagine.' });
      return;
    }

    setAdding(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('name', newName);
    formData.append('image', selectedFile);

    try {
      await axios.post(`${API_BASE}/persons`, formData);
      setStatus({ type: 'success', message: `Persoana ${newName} a fost adăugată cu succes` });
      setNewName('');
      setSelectedFile(null);
      // Reset file input
      e.target.reset();
      fetchPersons();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Eroare la adăugarea persoanei' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Gestionare Persoane</h2>
        <p className="text-slate-400">Adaugă persoane în baza de date pentru recunoaștere facială.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Person Form */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <UserPlus className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white">Adaugă Persoană Nouă</h3>
          </div>

          <form onSubmit={handleAddPerson} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nume Complet</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: Ion Popescu"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Poză de Referință</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
                />
              </div>
            </div>

            {status.message && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm">{status.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={adding}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              {adding ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Se procesează...
                </>
              ) : (
                'Adaugă Persoană'
              )}
            </button>
          </form>
        </section>

        {/* Persons List */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Users className="text-indigo-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white">Persoane Înregistrate</h3>
            </div>
            <span className="px-3 py-1 bg-slate-700 rounded-full text-xs font-medium text-slate-300">
              {persons.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="animate-spin mb-3" size={32} />
                <p>Se încarcă baza de date...</p>
              </div>
            ) : persons.length > 0 ? (
              <div className="space-y-3">
                {persons.map((name) => (
                  <div key={name} className="group flex items-center justify-between p-4 bg-slate-900/40 border border-slate-700/50 rounded-xl hover:border-blue-500/30 hover:bg-slate-900/60 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-200 font-medium">{name}</span>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                <Users className="mb-3 opacity-20" size={48} />
                <p>Nicio persoană înregistrată încă.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManagePersons;
