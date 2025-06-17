
import React from "react";

// Types
interface MSADimensions {
  width: number;
  height: number;
  padding: number;
  headerHeight: number;
}

interface MSAViewerErrorProps {
  error: string;
  msaString?: string;
  dimensions?: MSADimensions | null;
}

export default function MSAViewerError({ error, msaString, dimensions }: MSAViewerErrorProps): JSX.Element {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      borderRadius: '8px',
      boxSizing: 'border-box',
      padding: '32px',
      color: '#ff6b6b',
      fontSize: '16px',
      opacity: 0.95
    }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: 8 }}>MSA Viewer Error</div>
      <div style={{ fontSize: '15px', opacity: 0.8, color: '#333', marginBottom: 12 }}>{error}</div>
      <details style={{ fontSize: '12px', opacity: 0.6, maxWidth: '600px' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Debug Information</summary>
        <pre style={{
          background: '#1a1a1a',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '11px',
          overflow: 'auto',
          maxHeight: '200px',
          color: '#fff'
        }}>
          MSA String Length: {msaString?.length || 0}
          {'\n'}MSA Preview: {msaString?.substring(0, 200)}...
          {'\n'}Container Dimensions: {dimensions ? `${dimensions.width}x${dimensions.height}` : 'Not calculated'}
        </pre>
      </details>
    </div>
  );
}
