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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-destructive/30 bg-destructive/10 p-8 shadow-lg text-destructive">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <div className="mb-4">
            <p className="font-semibold">{this.state.error?.toString()}</p>
          </div>
          {this.state.errorInfo && (
            <details className="whitespace-pre-wrap rounded border border-border/60 bg-background/80 p-4 text-sm font-mono text-foreground">
              <summary className="cursor-pointer mb-2">Stack Trace</summary>
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
