import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '@/api/functions/auth';
import { createPageUrl } from '@/utils';

export default function VerifyEmail() {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    verifyEmail(token);
  }, [location]);

  const verifyEmail = async (token) => {
    try {
      const { data } = await auth({
        action: 'verifyEmail',
        token: token
      });

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'Verification failed.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Verification failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Email Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {status === 'verifying' && (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-600">Verifying your email address...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Email Verified!</h3>
                <p className="text-gray-600">{message}</p>
                <Button 
                  onClick={() => window.location.href = createPageUrl('Dashboard')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <AlertCircle className="w-12 h-12 mx-auto text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">Verification Failed</h3>
                <p className="text-gray-600">{message}</p>
                <Button 
                  onClick={() => window.location.href = createPageUrl('Home')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}