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

  if (!suggestions.length) return null;
  return (
    <ul
      className="mention-list"
      style={{ top: position.top, left: position.left }}
      ref={listRef}
    >
      {suggestions.map((user, i) => (
        <li
          key={user.id}
          className={`mention-item${i === selectedIdx ? ' active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onSelect(user);
          }}
        >
          <span className='flex items-center gap-2'>
            <div className=" min-w-[44px] min-h-[44px] w-6 h-6 min-w-6 min-h-6 ">
              <ProfilePicture user={user}  />
            </div>
            <span className='text-sm'>{user.name}</span>
          </span>
        </li>
      ))}
    </ul>
  );
} 