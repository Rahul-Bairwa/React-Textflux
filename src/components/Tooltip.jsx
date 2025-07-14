import React, { useState } from 'react';

export default function Tooltip({ label, shortcut, theme = 'light', children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="tf-tooltip-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={-1}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {show && (
        <span className={`tf-tooltip-bubble ${theme === 'dark' ? 'tf-dark' : ''}`}
          role="tooltip"
        >
          <span className="tf-tooltip-label">{label}</span>
          {shortcut && (
            <span className="tf-tooltip-shortcut">
              {shortcut.split('+').map((key, i) => (
                <kbd key={i} className="tf-tooltip-key">{key.trim()}</kbd>
              ))}
            </span>
          )}
          <span className="tf-tooltip-arrow" />
        </span>
      )}
      {children}
    </span>
  );
} 