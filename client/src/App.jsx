import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Camera, Users, FolderSync, Settings, Images } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ManagePersons from './pages/ManagePersons';
import ProcessImages from './pages/ProcessImages';
import Gallery from './pages/Gallery';

function Navigation() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Panou Control', icon: <Camera size={20} /> },
    { path: '/persons', label: 'Persoane', icon: <Users size={20} /> },
    { path: '/process', label: 'Procesare', icon: <FolderSync size={20} /> },
    { path: '/gallery', label: 'Galerie', icon: <Images size={20} /> },
  ];

  return (
    <nav className="w-64 bg-slate-800 h-screen fixed left-0 top-0 border-r border-slate-700 flex flex-col shadow-2xl z-10">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
          <Camera className="text-blue-500" /> PhotoSync
        </h1>
      </div>
      <div className="flex-1 flex flex-col gap-2 px-4 mt-8">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-6 text-slate-500 text-sm flex items-center gap-2 cursor-not-allowed hover:text-slate-400 transition-colors">
        <Settings size={16} />
        Setări
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
        <Navigation />
        <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen relative">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
          <div className="relative z-0 max-w-5xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/persons" element={<ManagePersons />} />
              <Route path="/process" element={<ProcessImages />} />
              <Route path="/gallery" element={<Gallery />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
