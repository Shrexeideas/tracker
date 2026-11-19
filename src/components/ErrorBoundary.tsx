import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `Sync issue (${parsed.operationType || 'operation'}): ${parsed.error}`;
        }
      } catch {
        // Plain error message
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--cs-bg)' }}>
          <div className="cs-card max-w-md w-full rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold">Something interrupted Clearspace</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--cs-text-muted)' }}>
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cs-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
