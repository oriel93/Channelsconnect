import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authHelpers } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { api } from '@/lib/apiClient';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authState, AUTH_STATE: _AS } = useAuth();
  // Import AUTH_STATE from context for state machine checks
  const { isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
  });
  // Legal consent checkbox — must be checked before signup submission
  const [tosAccepted, setTosAccepted] = useState(false);

  // After signIn() succeeds set pendingRedirect=true, then wait for SYSTEM_READY
  // before navigating. AuthGate ensures the profile is fully loaded first.
  useEffect(() => {
    if (pendingRedirect && isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/Dashboard';
      navigate(redirect, { replace: true });
    }
  }, [pendingRedirect, isAuthenticated, navigate, searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!isLogin) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (!formData.phone) {
        setError('Phone number is required.');
        setLoading(false);
        return;
      }
      if (!formData.fullName) {
        setError('Full name is required');
        return false;
      }
      if (!tosAccepted) {
        setError('You must accept the Terms of Service and channel distribution authorization to create an account.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // Sign in with email and password
        const { data, error } = await authHelpers.signIn(
          formData.email,
          formData.password
        );

        if (error) throw error;

        if (data.user) {
          setSuccess('Login successful! Redirecting...');
          // Signal the effect above to navigate once AuthProvider finishes
          // fetching the DB profile (isLoadingAuth → false). This prevents the
          // race where isAdmin is checked before the DB profile is loaded.
          setPendingRedirect(true);
        }
      } else {
        // Sign up with email and password
        const { data, error } = await authHelpers.signUp(
          formData.email,
          formData.password,
          {
            full_name: formData.fullName,
            phone:     formData.phone,
          }
        );

        if (error) throw error;

        if (data.user) {
          // Record legal consent audit trail (fire-and-forget — don't block UX)
          // Note: user must be authenticated to call /users/consent.
          // After Supabase signUp, the session may not be immediately available
          // for auto-confirmed accounts; we call it best-effort.
          try {
            if (data.session) {
              await api.recordConsent();
            }
          } catch (consentErr) {
            console.warn('[Consent] Could not record consent immediately:', consentErr?.message);
          }

          setSuccess(
            'Account created successfully! Please check your email to verify your account.'
          );
          // Clear form
          // Persist phone via PATCH /users/me (best-effort)
          try {
            if (data.session && formData.phone) {
              await api.users.update({ phone: formData.phone });
            }
          } catch (phoneErr) {
            console.warn('[Signup] Could not persist phone:', phoneErr?.message);
          }

          setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            fullName: '',
            phone: '',
          });
          setTosAccepted(false);
          // Switch to login mode after a delay
          setTimeout(() => {
            setIsLogin(true);
            setSuccess('');
          }, 3000);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const redirect = searchParams.get('redirect') || '/dashboard';
      const redirectTo = `${window.location.origin}${redirect}`;
      
      const { error } = await authHelpers.signInWithGoogle(redirectTo);
      
      if (error) throw error;
      
      // Google OAuth will redirect automatically
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err.message || 'Failed to authenticate with Google');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f50093011_channelsconnectlogo.png"
                alt="Channels Connect"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? 'Sign in to your account to continue'
              : 'Sign up to start managing your properties'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 text-green-700 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => navigate('/ForgotPassword')}
                    className="text-xs text-blue-600 hover:underline"
                    disabled={loading}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Legal Consent Checkbox — signup only */}
            {!isLogin && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => {
                    setTosAccepted(e.target.checked);
                    if (error?.includes('Terms of Service')) setError('');
                  }}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  required
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{' '}
                  <a href="/TermsOfService" target="_blank" className="text-blue-600 underline hover:text-blue-800">
                    Terms of Service
                  </a>{' '}and{' '}
                  <a href="/PrivacyPolicy" target="_blank" className="text-blue-600 underline hover:text-blue-800">
                    Privacy Policy
                  </a>.
                </span>
              </label>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || (!isLogin && !tosAccepted)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="text-center text-sm">
            {isLogin ? (
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-blue-600 hover:underline font-medium"
                  disabled={loading}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-blue-600 hover:underline font-medium"
                  disabled={loading}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

