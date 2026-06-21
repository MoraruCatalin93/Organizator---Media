import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Loader2, CheckCircle2, AlertCircle, Trash2, ImagePlus, Star, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
// Assuming backend is same origin, we construct the media base for references
const MEDIA_BASE = (API_BASE).replace(/\/api\/?$/, '');

const ManagePersons = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  
  // Add person form state
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Selected person gallery state
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [references, setReferences] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  useEffect(() => {
    fetchPersons();
  }, []);

  useEffect(() => {
    if (selectedPerson) {
      fetchReferences(selectedPerson);
    }
  }, [selectedPerson]);

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

  const fetchReferences = async (name) => {
    setLoadingRefs(true);
    try {
      const response = await axios.get(`${API_BASE}/persons/${encodeURIComponent(name)}/references`);
      setReferences(response.data.references || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRefs(false);
    }
  };

  const handleAddPersonOrRef = async (e) => {
    e.preventDefault();
    const targetName = selectedPerson || newName;
    
    if (!targetName || !selectedFile) {
      setStatus({ type: 'error', message: 'Vă rugăm să introduceți un nume și o imagine.' });
      return;
    }

    // Check limit
    if (selectedPerson && references.length >= 10) {
      setStatus({ type: 'error', message: 'Limita este de 10 poze de referință per persoană.' });
      return;
    }

    setAdding(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('name', targetName);
    formData.append('image', selectedFile);

    try {
      await axios.post(`${API_BASE}/persons`, formData);
      setStatus({ type: 'success', message: `Poza a fost adăugată cu succes pentru ${targetName}` });
      if (!selectedPerson) setNewName('');
      setSelectedFile(null);
      e.target.reset();
      
      fetchPersons();
      if (selectedPerson) fetchReferences(selectedPerson);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Eroare la adăugarea pozei' });
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePerson = async (name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Sigur ștergi pe „${name}"? Toți descriptorii și pozele vor fi șterse.`)) return;
    try {
      await axios.delete(`${API_BASE}/persons/${encodeURIComponent(name)}`);
      setStatus({ type: 'success', message: `Persoana ${name} a fost ștearsă.` });
      if (selectedPerson === name) setSelectedPerson(null);
      fetchPersons();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Eroare la ștergere' });
    }
  };

  const handleDeleteReference = async (id) => {
    if (!window.confirm('Sigur ștergi această poză de referință?')) return;
    try {
      await axios.delete(`${API_BASE}/persons/reference/${id}`);
      fetchPersons();
      fetchReferences(selectedPerson);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la ștergerea referinței');
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await axios.put(`${API_BASE}/persons/reference/${id}/primary`, { personName: selectedPerson });
      fetchReferences(selectedPerson);
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la setarea pozei principale');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Gestionare Persoane</h2>
        <p className="text-slate-400">Adaugă persoane și gestionează pozele de referință (3-10 poze recomandate pentru precizie).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Form & Gallery */}
        <div className="space-y-8">
          {/* Add Form */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  {selectedPerson ? <ImagePlus className="text-blue-400" size={24} /> : <UserPlus className="text-blue-400" size={24} />}
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedPerson ? `Adaugă poză pentru ${selectedPerson}` : 'Adaugă Persoană Nouă'}
                </h3>
              </div>
              {selectedPerson && (
                <button onClick={() => setSelectedPerson(null)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            <form onSubmit={handleAddPersonOrRef} className="space-y-4">
              {!selectedPerson && (
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
              )}

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
                  selectedPerson ? 'Adaugă Referință' : 'Creează Persoană'
                )}
              </button>
            </form>
          </section>

          {/* Reference Gallery */}
          {selectedPerson && (
            <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in slide-in-from-bottom-4">
              <h3 className="text-lg font-semibold text-white mb-4">Galerie Referințe ({references.length}/10)</h3>
              
              {loadingRefs ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : references.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nicio poză găsită.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {references.map((ref) => (
                    <div key={ref.id} className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${ref.is_primary ? 'border-amber-500' : 'border-slate-700 hover:border-blue-500/50'}`}>
                      {ref.image_path ? (
                        <img 
                          src={`${MEDIA_BASE}/${ref.image_path}`} 
                          alt="Referință" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.opacity = 0.2; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600 text-xs text-center p-2">
                          Fără<br/>imagine
                        </div>
                      )}
                      
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {!ref.is_primary && (
                          <button onClick={() => handleSetPrimary(ref.id)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors">
                            <Star size={14} /> Principală
                          </button>
                        )}
                        <button onClick={() => handleDeleteReference(ref.id)} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors">
                          <Trash2 size={14} /> Șterge
                        </button>
                      </div>

                      {/* Primary Badge */}
                      {ref.is_primary === 1 && (
                        <div className="absolute top-2 left-2 p-1 bg-amber-500 text-amber-950 rounded-full shadow-lg">
                          <Star size={12} fill="currentColor" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Persons List */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col h-full max-h-[800px]">
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

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="animate-spin mb-3" size={32} />
                <p>Se încarcă baza de date...</p>
              </div>
            ) : persons.length > 0 ? (
              <div className="space-y-3">
                {persons.map((person) => (
                  <div 
                    key={person.name} 
                    onClick={() => setSelectedPerson(person.name)}
                    className={`group flex items-center justify-between p-4 cursor-pointer border rounded-xl transition-all ${
                      selectedPerson === person.name 
                        ? 'bg-blue-500/10 border-blue-500/50' 
                        : 'bg-slate-900/40 border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className={`font-medium block ${selectedPerson === person.name ? 'text-blue-400' : 'text-slate-200'}`}>
                          {person.name}
                        </span>
                        {person.samples != null && (
                          <span className="text-xs text-slate-500">{person.samples} poze referință</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeletePerson(person.name, e)}
                      title="Șterge persoana"
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                    >
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
