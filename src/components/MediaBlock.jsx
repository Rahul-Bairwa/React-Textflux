import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function MediaBlock({ src, type, mediaFullscreen }) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  const handleOpen = (e) => {
    if (!mediaFullscreen) return;
    e.stopPropagation();
    setShowFullscreen(true);
  };
  const handleClose = (e) => {
    e.stopPropagation();
    setShowFullscreen(false);
  };

  const fullscreenOverlay = mediaFullscreen && showFullscreen && createPortal(
    <div
      className="tf-media-fullscreen-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.85)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleClose}
    >
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 24,
          right: 32,
          zIndex: 100000,
          background: 'rgba(30,30,30,0.7)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 28,
          padding: '2px 16px',
          cursor: 'pointer',
        }}
        aria-label="Close preview"
      >
        ×
      </button>
      {type.startsWith('image') ? (
        <img
          src={src}
          alt="media preview"
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            borderRadius: 8,
            boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : type.startsWith('video') ? (
        <video
          src={src}
          controls
          autoPlay
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            borderRadius: 8,
            boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
            background: '#000',
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : null}
    </div>,
    document.body
  );

  return (
    <>
      <div
        className="tf-media-block"
        style={{ cursor: mediaFullscreen ? 'pointer' : 'default' }}
        onClick={mediaFullscreen ? handleOpen : undefined}
      >
        {type.startsWith('image') ? (
          <img src={src} alt="media" style={{ display: 'block' }} />
        ) : type.startsWith('video') ? (
          <video src={src} controls style={{ display: 'block' }} />
        ) : null}
      </div>
      {fullscreenOverlay}
    </>
  );
}
