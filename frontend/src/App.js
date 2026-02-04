import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Toaster } from './components/ui/sonner';
import ChatWidget from './components/ChatWidget';

import Login from './pages/Login';
import RequestReset from './pages/RequestReset';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import Modules from './pages/Modules';
import ModuleDetail from './pages/ModuleDetail';
import ModuleAssessment from './pages/ModuleAssessment';
import Leaderboard from './pages/Leaderboard';
import Rewards from './pages/Rewards';
import FileRepository from './pages/FileRepository';
import MyCertificates from './pages/MyCertificates';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRewards from './pages/admin/AdminRewards';
import AdminFiles from './pages/admin/AdminFiles';
import AdminModules from './pages/admin/AdminModules';
import AdminChapters from './pages/admin/AdminChapters';
import AdminChat from './pages/admin/AdminChat';
import AdminSystem from './pages/admin/AdminSystem';
import AdminBanners from './pages/admin/AdminBanners';
import AdminPosts from './pages/admin/AdminPosts';
import AdminBadges from './pages/admin/AdminBadges';
import AdminChallenges from './pages/admin/AdminChallenges';
import AdminAssessment from './pages/admin/AdminAssessment';
import AdminCertificates from './pages/admin/AdminCertificates';
import AdminLevels from './pages/admin/AdminLevels';
import AdminTraining from './pages/admin/AdminTraining';
import AdminPaymentSettings from './pages/admin/AdminPaymentSettings';
import AdminTerms from './pages/admin/AdminTerms';
import AdminWhatsApp from './pages/admin/AdminWhatsApp';
import SupervisorLicensees from './pages/supervisor/SupervisorLicensees';
import SupervisorAnalytics from './pages/supervisor/SupervisorAnalytics';
import SupervisorAdvancedDashboard from './pages/supervisor/SupervisorAdvancedDashboard';
import LicenseeDetail from './pages/supervisor/LicenseeDetail';
import PublicRegistration from './pages/PublicRegistration';
import OnboardingDocuments from './pages/OnboardingDocuments';
import OnboardingDocumentsPJ from './pages/OnboardingDocumentsPJ';
import OnboardingPayment from './pages/OnboardingPayment';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Agenda from './pages/Agenda';
import ChapterView from './pages/ChapterView';
import LiveClassView from './pages/LiveClassView';
import Training from './pages/Training';
import SalesLinks from './pages/SalesLinks';
import Sales from './pages/Sales';
import OzoxxCast from './pages/OzoxxCast';
import AdminOzoxxCast from './pages/admin/AdminOzoxxCast';
import AdminSales from './pages/admin/AdminSales';
import AdminCompanyEvents from './pages/admin/AdminCompanyEvents';
import Timeline from './pages/Timeline';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ChatProvider>
            <BrowserRouter>
              <Toaster position="top-right" richColors />
              <ChatWidget />
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/request-reset" element={<RequestReset />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/set-password" element={<SetPassword />} />
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
            path="/module/:moduleId/chapter/:chapterId"
            element={
              <PrivateRoute roles={['licenciado', 'admin', 'supervisor']}>
                <ChapterView />
              </PrivateRoute>
            }
          />
          <Route
            path="/module/:moduleId/live"
            element={
              <PrivateRoute roles={['licenciado', 'admin', 'supervisor']}>
                <LiveClassView />
              </PrivateRoute>
            }
          />
          <Route
            path="/module/:moduleId/assessment"
            element={
              <PrivateRoute roles={['licenciado', 'admin', 'supervisor']}>
                <ModuleAssessment />
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
            path="/certificates"
            element={
              <PrivateRoute roles={['licenciado']}>
                <MyCertificates />
              </PrivateRoute>
            }
          />
          <Route
            path="/agenda"
            element={
              <PrivateRoute roles={['licenciado']}>
                <Agenda />
              </PrivateRoute>
            }
          />
          <Route
            path="/training"
            element={
              <PrivateRoute roles={['licenciado']}>
                <Training />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <PrivateRoute roles={['licenciado']}>
                <Sales />
              </PrivateRoute>
            }
          />
          <Route
            path="/sales-links"
            element={
              <PrivateRoute roles={['licenciado']}>
                <SalesLinks />
              </PrivateRoute>
            }
          />
          <Route
            path="/igvd-cast"
            element={
              <PrivateRoute roles={['licenciado']}>
                <OzoxxCast />
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
            path="/onboarding/documents-pj"
            element={
              <PrivateRoute roles={['licenciado']}>
                <OnboardingDocumentsPJ />
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
            path="/admin/module/:moduleId/assessment"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminAssessment />
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
            path="/admin/certificates"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminCertificates />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/levels"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminLevels />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/training"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminTraining />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/payment-settings"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminPaymentSettings />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/sales"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminSales />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/igvd-cast"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminOzoxxCast />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/company-events"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminCompanyEvents />
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
            path="/admin/banners"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminBanners />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/posts"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminPosts />
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
            path="/admin/badges"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminBadges />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/challenges"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminChallenges />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/terms"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminTerms />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/whatsapp"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminWhatsApp />
              </PrivateRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <PrivateRoute roles={['licenciado']}>
                <Favorites />
              </PrivateRoute>
            }
          />
          <Route
            path="/timeline"
            element={
              <PrivateRoute roles={['licenciado', 'admin', 'supervisor']}>
                <Timeline />
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
            path="/supervisor/advanced"
            element={
              <PrivateRoute roles={['supervisor', 'admin']}>
                <SupervisorAdvancedDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/supervisor/analytics"
            element={
              <PrivateRoute roles={['supervisor', 'admin']}>
                <SupervisorAnalytics />
              </PrivateRoute>
            }
          />
          <Route
            path="/supervisor/licensee/:id"
            element={
              <PrivateRoute roles={['supervisor', 'admin']}>
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
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;