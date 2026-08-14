import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase, clearStaleSessionIfExpired } from '../lib/supabase';

export const ProtectedRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      await clearStaleSessionIfExpired();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      if (isMounted) setIsAuthenticated(true);
    }

    checkAuth();

    // Listen to authentication state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsAuthenticated(!!session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Render smooth loading spinner during verification to prevent flickering or race conditions
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans" dir="rtl">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full mx-4">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium text-sm">جاري التحقق من الصلاحيات والجلوس الآمن...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" replace />;
};
