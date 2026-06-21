import { useState, useEffect } from 'react';
import { Users, FolderCheck, HardDrive } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ personsCount: 0 });

  useEffect(() => {
    axios.get(`${API_URL}/persons`)
      .then(res => {
        setStats({ personsCount: res.data.persons.length });
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-slate-100">Panou Control</h2>
        <p className="text-slate-400 mt-2">Prezentare generală a sistemului de recunoaștere facială.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Users size={24} className="text-blue-400" />}
          title="Persoane Cunoscute"
          value={stats.personsCount}
          bgClass="bg-blue-900/20 border-blue-800/30"
        />
        <StatCard 
          icon={<FolderCheck size={24} className="text-emerald-400" />}
          title="Imagini Procesate"
          value="-"
          bgClass="bg-emerald-900/20 border-emerald-800/30"
        />
        <StatCard 
          icon={<HardDrive size={24} className="text-purple-400" />}
          title="Drive Conectat"
          value="Nu"
          bgClass="bg-purple-900/20 border-purple-800/30"
        />
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-slate-200">Cum funcționează</h3>
        <ol className="list-decimal pl-5 space-y-3 text-slate-400">
          <li>Mergi la secțiunea <span className="text-blue-400 font-medium">Persoane</span> și încarcă o fotografie de referință pentru fiecare persoană pe care vrei să o recunoști.</li>
          <li>Mergi la <span className="text-blue-400 font-medium">Procesare</span> și introdu calea unui folder local sau încarcă fișiere.</li>
          <li>Sistemul va detecta fețele, le va compara cu persoanele cunoscute și le va organiza automat în foldere în directorul de ieșire al serverului.</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, bgClass }) {
  return (
    <div className={`p-6 rounded-2xl border ${bgClass} backdrop-blur-sm flex items-start gap-4 transition-transform hover:-translate-y-1`}>
      <div className="p-3 bg-slate-800/50 rounded-xl shadow-inner">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
      </div>
    </div>
  );
}
