/**
 * AirbnbCallback.jsx
 *
 * Where users land after completing Airbnb OAuth on airbnb.com.
 * Channex bounces them here with ?channel_id=...&token=...
 *
 * We POST those to the backend (which kicks off the import in background),
 * then poll /connect/airbnb/import_status until it's `completed` or `failed`,
 * showing live progress. When done, redirect to /MyListings.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Home } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function AirbnbCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const channelId = params.get('channel_id');
  const token     = params.get('token');
  const errorFlag = params.get('error');

  const [state, setState] = useState({ status: 'starting', importedCount: 0, failedCount: 0, totalListings: 0, message: 'Connecting to Airbnb…', importedListingIds: [] });
  const [done, setDone]   = useState(false);
  const triggeredRef      = useRef(false);

  useEffect(() => {
    if (errorFlag) {
      setState({ status: 'failed', message: 'Airbnb authorization was cancelled or denied.', importedCount: 0, failedCount: 0, totalListings: 0, importedListingIds: [] });
      setDone(true);
      return;
    }
    if (!channelId || !token) {
      setState({ status: 'failed', message: 'Missing channel_id or token. Please restart the import from Add Properties.', importedCount: 0, failedCount: 0, totalListings: 0, importedListingIds: [] });
      setDone(true);
      return;
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    let cancelled = false;

    // Kick off the backend import then poll status.
    (async () => {
      try {
        await apiClient.post('/connect/airbnb/callback', { channelId, token });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, status: 'failed', message: err?.response?.data?.message || 'Failed to start import' }));
        setDone(true);
        return;
      }

      // Poll every 2s up to ~3 minutes total.
      const MAX = 90;
      for (let i = 0; i < MAX; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await apiClient.get('/connect/airbnb/import_status', { params: { token } });
          const data = res?.data ?? {};
          setState({
            status: data.status || 'importing',
            importedCount: data.importedCount ?? 0,
            failedCount:   data.failedCount   ?? 0,
            totalListings: data.totalListings ?? 0,
            message:       data.message || 'Importing…',
            importedListingIds: data.importedListingIds || [],
          });
          if (data.status === 'completed' || data.status === 'failed') {
            setDone(true);
            return;
          }
        } catch {
          // Transient — keep polling.
        }
      }
      // Timeout
      if (!cancelled) {
        setState((s) => ({ ...s, status: 'failed', message: 'Import is taking longer than expected. Check your listings page in a few minutes.' }));
        setDone(true);
      }
    })();

    return () => { cancelled = true; };
  }, [channelId, token, errorFlag]);

  const pct = state.totalListings
    ? Math.round(((state.importedCount + state.failedCount) / state.totalListings) * 100)
    : (state.status === 'completed' ? 100 : (state.status === 'starting' || state.status === 'awaiting_oauth' ? 10 : 30));

  const success = state.status === 'completed' && state.importedCount > 0;
  const partial = state.status === 'completed' && state.importedCount > 0 && state.failedCount > 0;
  const failed  = state.status === 'failed' || (state.status === 'completed' && state.importedCount === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z" fill="#FF5A5F"/>
              <path d="M16 8c-1.5 0-2.7 1.2-2.7 2.7 0 1 .56 1.88 1.4 2.34L11 20h10l-3.7-6.96c.84-.46 1.4-1.34 1.4-2.34C18.7 9.2 17.5 8 16 8z" fill="white"/>
            </svg>
            Importing your Airbnb listings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!done && (
            <>
              <div className="flex items-center gap-3 text-slate-700">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-medium">{state.message}</span>
              </div>
              <div>
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-slate-500 mt-2">
                  {state.totalListings > 0
                    ? `${state.importedCount + state.failedCount} of ${state.totalListings} listings processed`
                    : 'Reaching out to Airbnb…'}
                </p>
              </div>
            </>
          )}

          {done && success && !partial && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-semibold text-lg">All set!</span>
              </div>
              <p className="text-slate-600">
                We imported <strong>{state.importedCount}</strong> listing
                {state.importedCount === 1 ? '' : 's'} from your Airbnb account into Channels Connect.
                Photos, descriptions, room types, and pricing are all in.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => navigate(createPageUrl('PropertyList'))} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  View My Listings <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" asChild>
                  <Link to={createPageUrl('Dashboard')}><Home className="w-4 h-4 mr-2" />Dashboard</Link>
                </Button>
              </div>
            </div>
          )}

          {done && partial && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-700">
                <AlertCircle className="w-6 h-6" />
                <span className="font-semibold text-lg">Partially imported</span>
              </div>
              <p className="text-slate-600">
                Imported <strong>{state.importedCount}</strong> listing
                {state.importedCount === 1 ? '' : 's'}; <strong>{state.failedCount}</strong> could not be imported automatically. We'll review and reach out if anything needs attention.
              </p>
              <Button onClick={() => navigate(createPageUrl('PropertyList'))} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                View Imported Listings <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {done && failed && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-rose-700">
                <AlertCircle className="w-6 h-6" />
                <span className="font-semibold text-lg">Something went wrong</span>
              </div>
              <p className="text-slate-600">{state.message}</p>
              <div className="flex gap-2">
                <Button onClick={() => navigate(createPageUrl('PropertyIngestionHub'))} variant="default">
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <Link to={createPageUrl('Dashboard')}>Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
