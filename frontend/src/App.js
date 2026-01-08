import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
// import { ChatProvider } from './contexts/ChatContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Toaster } from './components/ui/sonner';
// import ChatWidget from './components/ChatWidget';

import Login from './pages/Login';
import RequestReset from './pages/RequestReset';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Modules from './pages/Modules';
import ModuleDetail from './pages/ModuleDetail';
import Leaderboard from './pages/Leaderboard';
import Rewards from './pages/Rewards';
import FileRepository from './pages/FileRepository';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRewards from './pages/admin/AdminRewards';
import AdminFiles from './pages/admin/AdminFiles';
import AdminModules from './pages/admin/AdminModules';
import AdminChapters from './pages/admin/AdminChapters';
import AdminChat from './pages/admin/AdminChat';
import AdminSystem from './pages/admin/AdminSystem';
import SupervisorLicensees from './pages/supervisor/SupervisorLicensees';
import LicenseeDetail from './pages/supervisor/LicenseeDetail';
import PublicRegistration from './pages/PublicRegistration';
import OnboardingDocuments from './pages/OnboardingDocuments';
import OnboardingPayment from './pages/OnboardingPayment';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <ChatWidget />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/request-reset" element={<RequestReset />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/register/:token" element={<PublicRegistration />} />
          
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/modules"
            element={
              <PrivateRoute>
                <Modules />
              </PrivateRoute>
            }
          />
          <Route
            path="/module/:id"
            element={
              <PrivateRoute>
                <ModuleDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <PrivateRoute>
                <Leaderboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <PrivateRoute roles={['licenciado']}>
                <Rewards />
              </PrivateRoute>
            }
          />
          <Route
            path="/file-repository"
            element={
              <PrivateRoute roles={['licenciado']}>
                <FileRepository />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/onboarding/documents"
            element={
              <PrivateRoute roles={['licenciado']}>
                <OnboardingDocuments />
              </PrivateRoute>
            }
          />
          <Route
            path="/onboarding/payment"
            element={
              <PrivateRoute roles={['licenciado']}>
                <OnboardingPayment />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminUsers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/modules"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminModules />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/module/:moduleId/chapters"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminChapters />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/rewards"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminRewards />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/files"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminFiles />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/chat"
            element={
              <PrivateRoute roles={['admin', 'supervisor']}>
                <AdminChat />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminSystem />
              </PrivateRoute>
            }
          />
          <Route
            path="/supervisor/licensees"
            element={
              <PrivateRoute roles={['supervisor']}>
                <SupervisorLicensees />
              </PrivateRoute>
            }
          />
          <Route
            path="/supervisor/licensee/:id"
            element={
              <PrivateRoute roles={['supervisor']}>
                <LicenseeDetail />
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;