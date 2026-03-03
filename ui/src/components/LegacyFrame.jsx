import React from 'react';

export default function LegacyFrame({ src, title }) {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe
        src={src}
        title={title}
        style={{ width: '100%', height: '100%', border: 0 }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
