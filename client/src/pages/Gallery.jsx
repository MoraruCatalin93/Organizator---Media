import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Images, Loader2, AlertCircle, X, FolderOpen, RefreshCw, Edit2, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const MEDIA_BASE = (API_BASE).replace(/\/api\/?$/, '');

const Gallery = () => {
  const [knownPersons, setKnownPersons] = useState([]);
  const [unknownPersons, setUnknownPersons] = useState([]);
  const [totalImages, setTotalImages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null);
  const [activeTab, setActiveTab] = useState('known');
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/gallery`);
      setKnownPersons(data.known || []);
      setUnknownPersons(data.unknown || []);
      setTotalImages(data.totalImages || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la încărcarea galeriei');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const handleRename = async (oldName) => {
    if (!newName.trim()) {
      setRenaming(null);
      return;
    }
    try {
      await axios.put(`${API_BASE}/persons/rename`, { oldName, newName: newName.trim() });
      setRenaming(null);
      setNewName('');
      fetchGallery();
    } catch (err) {
      alert(err.response?.data?.error || 'Eroare la redenumire');
    }
  };

  const mediaUrl = (personName, filePath) =>
    `${MEDIA_BASE}/media/${filePath.split('/').map(encodeURIComponent).join('/')}`;

  const currentPersons = activeTab === 'known' ? knownPersons : unknownPersons;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">Galerie</h2>
          <p className="text-slate-400 mt-2">
            {totalImages > 0
              ? `${totalImages} imagini organizate în ${knownPersons.length + unknownPersons.length} persoane.`
              : 'Fotografiile organizate vor apărea aici.'}
          </p>
        </div>
        <button
          onClick={fetchGallery}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-all"
        >
          <RefreshCw size={16} /> Reîmprospătează
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700 w-max">
        <button
          onClick={() => setActiveTab('known')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'known' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Cunoscute ({knownPersons.length})
        </button>
        <button
          onClick={() => setActiveTab('unknown')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'unknown' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Necunoscute ({unknownPersons.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p>Se încarcă galeria...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle size={20} /> {error}
        </div>
      ) : currentPersons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <Images className="mb-3 opacity-20" size={48} />
          <p>Nicio imagine organizată în această categorie.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {currentPersons.map(person => (
            <section key={person.name} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  
                  {renaming === person.name ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRename(person.name)}
                        placeholder="Numele persoanei"
                        className="bg-slate-900 border border-blue-500 rounded-lg px-3 py-1 text-white outline-none"
                      />
                      <button onClick={() => handleRename(person.name)} className="p-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setRenaming(null)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-white">{person.name}</h3>
                      {activeTab === 'unknown' && (
                        <button 
                          onClick={() => { setRenaming(person.name); setNewName(''); }}
                          className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Redenumește în persoană cunoscută"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  <span className="px-2.5 py-0.5 bg-slate-700 rounded-full text-xs font-medium text-slate-300">
                    {person.count}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {person.files.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setActive({ person: person.name, file })}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700 hover:border-blue-500/50 transition-all"
                  >
                    <img
                      src={mediaUrl(person.name, file.path)}
                      alt={file.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.style.opacity = 0.2; }}
                    />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
          onClick={() => setActive(null)}
        >
          <button
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            onClick={() => setActive(null)}
          >
            <X size={24} />
          </button>
          <div className="max-w-5xl max-h-full flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={mediaUrl(active.person, active.file.path)}
              alt={active.file.name}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <FolderOpen size={14} />
              <span>{active.person}</span>
              <span className="text-slate-600">/</span>
              <span className="truncate max-w-md">{active.file.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
