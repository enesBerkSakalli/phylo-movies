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
        <div className="p-8 max-w-2xl mx-auto mt-10 border rounded-lg shadow-lg bg-destructive/10 text-destructive">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <div className="mb-4">
            <p className="font-semibold">{this.state.error?.toString()}</p>
          </div>
          {this.state.errorInfo && (
            <details className="whitespace-pre-wrap text-sm font-mono bg-white/50 p-4 rounded">
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
