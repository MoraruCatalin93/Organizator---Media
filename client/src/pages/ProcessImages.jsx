import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FolderSync, FolderOpen, UploadCloud, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, XCircle, RotateCcw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const ProcessImages = () => {
  const [folderPath, setFolderPath] = useState('');
  const [uploadFiles, setUploadFiles] = useState([]);
  
  // Job Queue State
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // 'pending', 'running', 'completed', 'cancelled', 'error'
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);
  
  // Preview / Final Results State
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [results, setResults] = useState(null);
  const [skippedCount, setSkippedCount] = useState(0);

  // Undo State
  const [canUndo, setCanUndo] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoMessage, setUndoMessage] = useState(null);

  useEffect(() => {
    fetchUndoStatus();
    return () => clearInterval(pollIntervalRef.current);
  }, []);

  const fetchUndoStatus = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/process/undo/status`);
      setCanUndo(resp.data.canUndo);
    } catch(err) {
      console.error('Eroare status undo:', err);
    }
  };

  const startJobPolling = (id) => {
    setJobId(id);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const resp = await axios.get(`${API_BASE}/jobs/${id}`);
        const job = resp.data;
        
        setJobStatus(job.status);
        setProgress(job.progress);
        setCurrentAction(job.currentAction || '');
        setSkippedCount(job.skippedDuplicates || 0);

        if (job.status === 'completed') {
          clearInterval(pollIntervalRef.current);
          setPreviewData(job.results);
          setIsPreviewMode(true);
        } else if (job.status === 'cancelled' || job.status === 'error') {
          clearInterval(pollIntervalRef.current);
          if (job.status === 'error') setError(job.error || 'A apărut o eroare necunoscută.');
        }
      } catch (err) {
        console.error('Eroare polling job:', err);
        clearInterval(pollIntervalRef.current);
        setError('Eroare la comunicarea cu serverul.');
        setJobStatus('error');
      }
    }, 1000);
  };

  const handleLocalProcess = async (e) => {
    e.preventDefault();
    if (!folderPath) return;

    resetState();
    setJobStatus('pending');
    setCurrentAction('Trimit cererea...');

    try {
      const resp = await axios.post(`${API_BASE}/process/local`, { folderPath, previewOnly: true });
      startJobPolling(resp.data.jobId);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la pornirea procesării folderului');
      setJobStatus('error');
    }
  };

  const handleUploadProcess = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;

    resetState();
    setJobStatus('pending');
    setCurrentAction('Se încarcă fișierele pe server...');

    try {
      const formData = new FormData();
      for (const file of uploadFiles) {
        formData.append('images', file);
      }
      formData.append('previewOnly', 'true');

      const resp = await axios.post(`${API_BASE}/process/upload`, formData);
      startJobPolling(resp.data.jobId);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la încărcarea fișierelor');
      setJobStatus('error');
    }
  };

  const handleCancelJob = async () => {
    if (!jobId) return;
    try {
      await axios.post(`${API_BASE}/jobs/${jobId}/cancel`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetryJob = async () => {
    if (!jobId) return;
    setError(null);
    setJobStatus('pending');
    setProgress(0);
    try {
      await axios.post(`${API_BASE}/jobs/${jobId}/retry`);
      startJobPolling(jobId);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la reîncercare');
      setJobStatus('error');
    }
  };

  const resetState = () => {
    setError(null);
    setResults(null);
    setPreviewData(null);
    setIsPreviewMode(false);
    setProgress(0);
    setSkippedCount(0);
    setJobId(null);
    setJobStatus(null);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const handleConfirm = async () => {
    setIsCommitting(true);
    setError(null);
    try {
      const resp = await axios.post(`${API_BASE}/process/commit`, { items: previewData });
      setIsPreviewMode(false);
      setResults({
        success: true,
        processed: previewData.length,
        skippedDuplicates: skippedCount,
        copied: resp.data.processed,
        results: previewData
      });
      setPreviewData(null);
      setJobId(null);
      setJobStatus(null);
      fetchUndoStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la confirmare');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCancelPreview = async () => {
    setIsCommitting(true);
    try {
      await axios.post(`${API_BASE}/process/cancel`, { items: previewData });
    } catch (err) {
      console.error('Cancel error', err);
    } finally {
      setIsCommitting(false);
      resetState();
      setUploadFiles([]);
      setFolderPath('');
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    setUndoMessage(null);
    try {
      const resp = await axios.post(`${API_BASE}/process/undo`);
      setShowUndoModal(false);
      setUndoMessage({ type: 'success', text: `Anulare cu succes. S-au restaurat ${resp.data.restored} fișiere.` });
      fetchUndoStatus();
      setResults(null);
    } catch (err) {
      setUndoMessage({ type: 'error', text: err.response?.data?.error || 'Eroare la anulare.' });
    } finally {
      setIsUndoing(false);
    }
  };

  const formatETA = (ms) => {
    if (!ms || ms < 0 || !isFinite(ms)) return 'Calculare...';
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const isProcessing = jobStatus === 'pending' || jobStatus === 'running';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Procesare Imagini</h2>
          <p className="text-slate-400">Scanează și organizează imaginile folosind inteligența artificială. Procesarea rulează asincron în fundal.</p>
        </div>
        {canUndo && !isProcessing && !isPreviewMode && (
           <button onClick={() => setShowUndoModal(true)} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-rose-900/20 flex items-center gap-2">
               Anulează Ultima Procesare
           </button>
        )}
      </div>

      {undoMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${undoMessage.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'}`}>
          <AlertCircle size={24} />
          <p className="font-medium">{undoMessage.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Local Folder Processing */}
        <section className={`bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl transition-opacity ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
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
            </div>

            <button
              type="submit"
              disabled={isProcessing || !folderPath}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <FolderSync size={20} />
              Adaugă Job de Scanare
            </button>
          </form>
        </section>

        {/* Upload Processing */}
        <section className={`bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl transition-opacity ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
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
                {uploadFiles.length > 0 ? `${uploadFiles.length} fișiere selectate` : 'Trage fișierele aici sau click'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isProcessing || uploadFiles.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <UploadCloud size={20} />
              Adaugă Job de Încărcare
            </button>
          </form>
        </section>
      </div>

      {/* Live Job Progress Bar */}
      {jobId && (isProcessing || jobStatus === 'error' || jobStatus === 'cancelled') && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isProcessing && <Loader2 className="text-blue-400 animate-spin" size={20} />}
              {jobStatus === 'error' && <AlertCircle className="text-rose-500" size={20} />}
              {jobStatus === 'cancelled' && <XCircle className="text-amber-500" size={20} />}
              
              <span className={`font-medium ${jobStatus === 'error' ? 'text-rose-400' : jobStatus === 'cancelled' ? 'text-amber-400' : 'text-slate-200'}`}>
                {error || currentAction}
              </span>
            </div>
            {isProcessing && <span className="text-blue-400 font-bold">{Math.round(progress)}%</span>}
          </div>
          
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700 mb-4 relative">
            <div 
              className={`h-full transition-all duration-500 ease-out ${jobStatus === 'error' ? 'bg-rose-500' : jobStatus === 'cancelled' ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              ID Job: <span className="font-mono">{jobId.split('-')[0]}</span>
            </div>
            
            <div className="flex items-center gap-4">
              {isProcessing && (
                <button onClick={handleCancelJob} className="flex items-center gap-1 text-sm text-slate-400 hover:text-amber-400 transition-colors">
                  <XCircle size={16} /> Oprește Job-ul
                </button>
              )}
              {jobStatus === 'error' && (
                <button onClick={handleRetryJob} className="flex items-center gap-1 text-sm text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                  <RotateCcw size={16} /> Reîncearcă
                </button>
              )}
              {jobStatus === 'cancelled' && (
                <button onClick={resetState} className="flex items-center gap-1 text-sm text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                  Închide
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Preview View */}
      {isPreviewMode && previewData && !isProcessing && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 text-blue-400 mb-6">
            <CheckCircle2 size={24} />
            <h3 className="text-xl font-semibold">Previzualizare Procesare</h3>
          </div>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <p className="text-slate-300">Aprobă rezultatele înainte de a copia fișierele.</p>
            {skippedCount > 0 && (
                <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 font-medium rounded-lg border border-rose-500/30">
                  {skippedCount} imagini deja existente au fost omise.
                </span>
            )}
          </div>
          
          <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden mb-6">
            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Fișier Sursă</th>
                    <th className="px-4 py-3">Persoană Detectată</th>
                    <th className="px-4 py-3">Încredere</th>
                    <th className="px-4 py-3 rounded-tr-lg">Destinație</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={item.sourceFile}>{item.sourceFile}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${item.detectedPerson !== 'Unknown' && item.detectedPerson !== 'Errors' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-500'}`}>
                          {item.detectedPerson}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{item.confidence}</td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[200px]" title={item.destinationFolder}>{item.destinationFolder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleConfirm}
              disabled={isCommitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isCommitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Confirmă și Procesează
            </button>
            <button
              onClick={handleCancelPreview}
              disabled={isCommitting}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Anulează
            </button>
          </div>
        </section>
      )}

      {/* Results View */}
      {(results) && !isProcessing && !isPreviewMode && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl animate-in slide-in-from-bottom-4 duration-500">
          <div>
            <div className="flex items-center gap-3 text-emerald-400 mb-6">
              <CheckCircle2 size={24} />
              <h3 className="text-xl font-semibold">Procesare Finalizată</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-500 text-sm mb-1">Procesate Valid</p>
                <p className="text-2xl font-bold text-white">{results.processed}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-500 text-sm mb-1">Duplicate Omise</p>
                <p className="text-2xl font-bold text-rose-400">{results.skippedDuplicates || 0}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-500 text-sm mb-1">Copiate (Total)</p>
                <p className="text-2xl font-bold text-emerald-400">{results.copied}</p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 bg-slate-800/50 border-bottom border-slate-700 font-medium text-slate-300">
                Jurnal Rezultate
              </div>
              <div className="p-4 max-h-60 overflow-y-auto custom-scrollbar">
                {results.results?.map((res, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-400 text-sm truncate max-w-[60%]">{res.sourceFile || res.file}</span>
                    <div className="flex gap-1">
                      {res.detectedPerson ? (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase">
                            {res.detectedPerson}
                          </span>
                      ) : res.matched?.length > 0 ? (
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
        </section>
      )}
    </div>
  );
};

export default ProcessImages;
