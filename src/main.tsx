import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { AdminLogin } from './pages/AdminLogin.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { AdminCompleted } from './pages/AdminCompleted.tsx';
import { AdminAnalytics } from './pages/AdminAnalytics.tsx';
import { AdminEmailTemplate } from './pages/AdminEmailTemplate.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Student Portal */}
          <Route path="/" element={<App />} />

          {/* Admin Login Route */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/completed" element={<AdminCompleted />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/email-template" element={<AdminEmailTemplate />} />
          </Route>

          {/* Fallback to Student Portal */}
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
