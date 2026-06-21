import React, { useState } from 'react';
import axios from 'axios';
import { FolderSync, FolderOpen, UploadCloud, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';

const API_BASE = 'http://localhost:5001/api';

const ProcessImages = () => {
  const [folderPath, setFolderPath] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);

  const handleLocalProcess = async (e) => {
    e.preventDefault();
    if (!folderPath) return;

    setProcessing(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post(`${API_BASE}/process/local`, { folderPath });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la procesarea folderului');
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadProcess = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;

    setProcessing(true);
    setError(null);
    setResults(null);
    setProgress(0);
    setCurrentAction('Se pregătesc fișierele...');

    const total = uploadFiles.length;
    const allResults = [];
    let processedCount = 0;

    try {
      for (let i = 0; i < total; i++) {
        const file = uploadFiles[i];
        setCurrentAction(`Se procesează: ${file.name} (${i + 1} din ${total})`);
        
        const formData = new FormData();
        formData.append('images', file);

        const response = await axios.post(`${API_BASE}/process/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const baseProgress = (i / total) * 100;
            const fileWeight = (1 / total) * 100;
            setProgress(baseProgress + (uploadPercent * fileWeight / 100));
          }
        });

        if (response.data.results) {
          allResults.push(...response.data.results);
        }
        processedCount++;
        setProgress((processedCount / total) * 100);
      }

      setResults({
        success: true,
        processed: processedCount,
        total: total,
        results: allResults
      });
      setCurrentAction('Procesare finalizată!');
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la procesarea fișierelor încărcate');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Procesare Imagini</h2>
        <p className="text-slate-400">Organizează-ți fotografiile folosind recunoașterea facială AI.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Local Folder Processing */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FolderOpen className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white">Folder Local</h3>
          </div>

          <form onSubmit={handleLocalProcess} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cale Absolută</label>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/Utilizatori/nume/Imagini/Excursie"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <p className="mt-2 text-xs text-slate-500 italic">
                * Serverul va scana acest folder și va crea subfoldere pentru fiecare persoană găsită.
              </p>
            </div>

            <button
              type="submit"
              disabled={processing || !folderPath}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <FolderSync size={20} />}
              Scanează și Organizează
            </button>
          </form>
        </section>

        {/* Upload & Process */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <UploadCloud className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white">Încarcă Imagini sau Folder</h3>
          </div>

          <form onSubmit={handleUploadProcess} className="space-y-4">
            <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500/50 hover:bg-slate-900/30 transition-all cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setUploadFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <ImageIcon className="mx-auto text-slate-600 mb-2 group-hover:text-indigo-400 transition-colors" size={32} />
              <p className="text-slate-300 font-medium">
                {uploadFiles.length > 0 ? `${uploadFiles.length} fișiere selectate` : 'Trage fișierele aici sau click pentru a alege'}
              </p>
              <p className="text-slate-500 text-xs mt-1">Suportă JPG, PNG, WEBP</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  onChange={(e) => setUploadFiles(e.target.files)}
                  className="hidden"
                  id="folder-upload"
                />
                <label 
                  htmlFor="folder-upload"
                  className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-dashed"
                >
                  <FolderOpen size={18} />
                  Alege un folder întreg
                </label>
              </div>

              <button
                type="submit"
                disabled={processing || uploadFiles.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" size={20} /> : <FolderSync size={20} />}
                Încarcă și Procesează
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Progress Bar Area */}
      {processing && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="text-blue-400 animate-spin" size={20} />
              <span className="text-slate-200 font-medium">{currentAction}</span>
            </div>
            <span className="text-blue-400 font-bold">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="mt-3 flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            <span>Inițializare</span>
            <span>Încărcare</span>
            <span>Analiză AI</span>
            <span>Finalizare</span>
          </div>
        </section>
      )}

      {/* Results View */}
      {(results || error) && !processing && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in slide-in-from-bottom-4 duration-500">
          {error ? (
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle size={24} />
              <p className="font-medium">{error}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 text-emerald-400 mb-6">
                <CheckCircle2 size={24} />
                <h3 className="text-xl font-semibold">Procesare Finalizată</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-500 text-sm mb-1">Procesate</p>
                  <p className="text-2xl font-bold text-white">{results.processed}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-500 text-sm mb-1">Total Găsite</p>
                  <p className="text-2xl font-bold text-white">{results.total}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-500 text-sm mb-1">Rată Succes</p>
                  <p className="text-2xl font-bold text-white">
                    {Math.round((results.processed / results.total) * 100) || 0}%
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-800/50 border-bottom border-slate-700 font-medium text-slate-300">
                  Jurnal Rezultate
                </div>
                <div className="p-4 max-h-60 overflow-y-auto custom-scrollbar">
                  {results.results?.map((res, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <span className="text-slate-400 text-sm truncate max-w-[60%]">{res.file}</span>
                      <div className="flex gap-1">
                        {res.matched?.length > 0 ? (
                          res.matched.map(m => (
                            <span key={m} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-500 text-[10px] font-bold rounded uppercase">
                            Fără Potrivire
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ProcessImages;
