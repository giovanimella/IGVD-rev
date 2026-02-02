import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import RankingSidebar from './RankingSidebar';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children, hideRankingSidebar = false }) => {
  const { user } = useAuth();
  
  // Mostrar ranking sidebar apenas para licenciados e supervisores
  const showRanking = !hideRankingSidebar && (user?.role === 'licenciado' || user?.role === 'supervisor');
  
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#142d30]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>
      {showRanking && <RankingSidebar />}
    </div>
  );
};

export default Layout;
