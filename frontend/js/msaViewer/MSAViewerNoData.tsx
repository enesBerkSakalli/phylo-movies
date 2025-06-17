
import React from "react";

export default function MSAViewerNoData(): JSX.Element {
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
      <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: 8 }}>No MSA Data Available</div>
      <div style={{ fontSize: '15px', opacity: 0.7 }}>Please upload an MSA file to continue</div>
    </div>
  );
}
