import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authHelpers } from '@/lib/supabase';

export default function NewLoginRequired({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUserAuth = async () => {
      setLoading(true);
      try {
        const { user, error } = await authHelpers.getUser();
        if (user && !error) {
          setUser(user);
        } else {
          setUser(null);
          // Redirect to login with current path as redirect parameter
          const currentPath = location.pathname;
          navigate(`/Login?redirect=${encodeURIComponent(currentPath)}`);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        setUser(null);
        navigate(`/Login?redirect=${encodeURIComponent(location.pathname)}`);
      } finally {
        setLoading(false);
      }
    };

    checkUserAuth();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
