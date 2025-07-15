import React, { useEffect, useRef, useState } from 'react';
import { ProfilePicture } from './ProfilePicture';

export default function MentionList({ suggestions, onSelect, position }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef();

  useEffect(() => {
    setSelectedIdx(0); // Only reset when query changes, not on every render
  }, [position.top, position.left]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!suggestions.length) return;
      if (e.key === 'ArrowDown') {
        setSelectedIdx(idx => (idx + 1) % suggestions.length);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setSelectedIdx(idx => (idx - 1 + suggestions.length) % suggestions.length);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        onSelect(suggestions[selectedIdx]);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIdx, onSelect]);

  useEffect(() => {
    // Scroll active item into view on keyboard navigation
    if (listRef.current) {
      const el = listRef.current.children[selectedIdx];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIdx]);

  if (!suggestions.length) return null;
  return (
    <ul
      className="tf-mention-list"
      style={position.top!=0 && position.left!=0 ? { top: position.top, left: position.left } : {display: 'none'}}
      ref={listRef}
    >
      {suggestions.map((user, i) => (
        <li
          key={user.id}
          className={`tf-mention-item${i === selectedIdx ? ' active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onSelect(user);
          }}
        >
          <span className='tf-flex tf-items-center tf-gap-2'>
            <div className=" tf-min-w-11 tf-min-h-11 tf-w-6 tf-h-6 tf-min-w-6 tf-min-h-6 ">
              <ProfilePicture user={user}  />
            </div>
            <span className='tf-text-sm'>{user.name}</span>
          </span>
        </li>
      ))}
    </ul>
  );
} 