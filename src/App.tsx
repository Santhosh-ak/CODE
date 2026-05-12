import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, History, Settings, Github, FileCode2, LogOut } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Report from './pages/Report';

function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col w-64 border-r border-border bg-card text-card-foreground">
      <div className="flex items-center h-16 px-6 border-b border-border">
        <Shield className="w-6 h-6 text-indigo-500 mr-3" />
        <span className="font-bold text-lg tracking-tight">CodeGuardian</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="flex flex-col">
          <div className="px-6 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Analyze</div>
          <Link 
            to="/" 
            className={`flex items-center px-6 py-2 transition-colors ${
              isActive('/') ? 'bg-secondary border-l-4 border-primary text-foreground font-medium' : 'hover:bg-secondary text-muted-foreground hover:text-foreground border-l-4 border-transparent'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3 opacity-80" />
            Overview
          </Link>
          <Link 
            to="/scanner" 
            className={`flex items-center px-6 py-2 transition-colors ${
              isActive('/scanner') ? 'bg-secondary border-l-4 border-primary text-foreground font-medium' : 'hover:bg-secondary text-muted-foreground hover:text-foreground border-l-4 border-transparent'
            }`}
          >
            <FileCode2 className="w-5 h-5 mr-3 opacity-80" />
            Deep Scan
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background font-sans antialiased text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 px-8 flex items-center justify-between border-b border-border bg-card">
            <h1 className="text-xl font-semibold tracking-tight">
              <Routes>
                <Route path="/" element="Dashboard Overview" />
                <Route path="/scanner" element="Repository Scan" />
                <Route path="/report/:owner/:repo/*" element="Analysis Report" />
                <Route path="*" element="" />
              </Routes>
            </h1>
            <div className="flex items-center space-x-4 border-l border-border pl-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-border"></div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-8 py-8 bg-background">
            <div className="max-w-6xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/report/:owner/:repo/*" element={<Report />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
