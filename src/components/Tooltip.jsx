import React, { useState } from 'react';

export default function Tooltip({ label, shortcut, theme = 'light', children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={-1}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {show && (
        <span className={`tooltip-bubble ${theme === 'dark' ? 'dark' : ''}`}
          role="tooltip"
        >
          <span className="tooltip-label">{label}</span>
          {shortcut && (
            <span className="tooltip-shortcut">
              {shortcut.split('+').map((key, i) => (
                <kbd key={i} className="tooltip-key">{key.trim()}</kbd>
              ))}
            </span>
          )}
          <span className="tooltip-arrow" />
        </span>
      )}
      {children}
    </span>
  );
} 