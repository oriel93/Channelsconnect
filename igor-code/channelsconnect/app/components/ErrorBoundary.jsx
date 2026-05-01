/**
 * ErrorBoundary.jsx
 *
 * Class-based React Error Boundary.
 *
 * Wraps the TapeChart (and any other volatile component) to catch render
 * errors, log them, and display a localised "Failed to load timeline"
 * message without unmounting the rest of the dashboard.
 *
 * Usage:
 *   <ErrorBoundary label="Timeline">
 *     <HeavyComponent />
 *   </ErrorBoundary>
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  // ── Catch any descendant render or lifecycle error ─────────────────────────
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log full details so Sentry / dev tools can trace the root cause
    console.error('[ErrorBoundary] Caught render error:', error);
    console.error('[ErrorBoundary] Component stack:', info?.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // ── Fallback UI ────────────────────────────────────────────────────────
    const label = this.props.label ?? 'component';

    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>

        <div className="space-y-1 max-w-sm">
          <h3 className="font-semibold text-slate-800">
            Failed to load {label}
          </h3>
          <p className="text-sm text-slate-500">
            An unexpected error occurred while rendering this view.
            Your other pages are unaffected.
          </p>
          {this.state.error?.message && (
            <p className="text-xs font-mono text-red-400 bg-red-50 rounded px-3 py-1 mt-2 max-w-xs mx-auto truncate">
              {this.state.error.message}
            </p>
          )}
        </div>

        <button
          onClick={this.handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200
            bg-white text-sm font-medium text-slate-600 hover:bg-slate-50
            focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }
}
