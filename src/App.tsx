import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';

// Lazy load pages for better performance
import Auth from './pages/Auth';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Notes = lazy(() => import('./pages/Notes'));
const Tasks = lazy(() => import('./pages/Tasks'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const Links = lazy(() => import('./pages/Links'));
const Prompts = lazy(() => import('./pages/Prompts'));
const Household = lazy(() => import('./pages/Household'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Passwords = lazy(() => import('./pages/Passwords'));
const Settings = lazy(() => import('./pages/Settings'));
const ShoppingList = lazy(() => import('./pages/ShoppingList'));
const News = lazy(() => import('./pages/News'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Converter = lazy(() => import('./pages/Converter'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex items-center justify-center font-sans">Laden...</div>}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="household" element={<Household />} />
                <Route path="notes" element={<Notes />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="links" element={<Links />} />
                <Route path="prompts" element={<Prompts />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="passwords" element={<Passwords />} />
                <Route path="settings" element={<Settings />} />
                <Route path="shoppinglist" element={<ShoppingList />} />
                <Route path="news" element={<News />} />
                <Route path="calculator" element={<Calculator />} />
                <Route path="umrechner" element={<Converter />} />
              </Route>
            </Routes>
          </Suspense>
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
