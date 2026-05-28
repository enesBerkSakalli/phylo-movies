import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] React render failure:', {
      error,
      componentStack: errorInfo?.componentStack,
    });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-destructive/30 bg-destructive/10 p-8 shadow-lg text-destructive">
          <h1 className="mb-3 text-2xl font-bold">Phylo-Movies could not render this view</h1>
          <div className="mb-4 space-y-2 text-sm text-destructive/90">
            <p>
              The app hit an unexpected UI error. Reload the page first; if it happens again, copy
              the technical details below when reporting the issue.
            </p>
            <button
              type="button"
              className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
          {this.state.errorInfo && (
            <details className="whitespace-pre-wrap rounded border border-border/60 bg-background/80 p-4 text-sm font-mono text-foreground">
              <summary className="mb-2 cursor-pointer font-sans font-semibold">
                Technical details
              </summary>
              {this.state.error?.toString()}
              {'\n'}
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
