import React from "react";

export default function MSAViewerLoading(): JSX.Element {
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
      color: '#333',
      fontSize: '16px',
      opacity: 0.9
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #444',
        borderTop: '4px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 16
      }}></div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: 8 }}>Loading MSA Viewer</div>
      <div style={{ fontSize: '15px', opacity: 0.7 }}>Preparing multiple sequence alignment...</div>
    </div>
  );
}
