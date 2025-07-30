import React, { useState, useEffect, useRef } from 'react';
import { EMOJI_LIST } from './emojiData';

export default function EmojiPicker({ 
  searchQuery = '', 
  onSelect, 
  position = { top: 0, left: 0 },
  theme = 'light' 
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const emojiPickerRef = useRef(null);
  
  const popularEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'];

  // Filter emojis based on search query
  const filteredEmojis = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return EMOJI_LIST;
    return EMOJI_LIST.filter(e =>
      e.keywords.some(k => k.includes(query)) ||
      (e.emoji && e.emoji.includes(query))
    );
  }, [searchQuery]);

  // Group emojis by category when no search query
  const emojisByCategory = React.useMemo(() => {
    if (searchQuery) return {};
    
    const grouped = {};
    EMOJI_LIST.forEach(emoji => {
      if (!grouped[emoji.category]) {
        grouped[emoji.category] = [];
      }
      grouped[emoji.category].push(emoji);
    });
    return grouped;
  }, [searchQuery]);

  // All emojis for keyboard navigation
  const allEmojis = React.useMemo(() => {
    if (searchQuery) {
      return filteredEmojis;
    }
    return popularEmojis.map(emoji => ({ emoji, keywords: [emoji] })).concat(EMOJI_LIST);
  }, [searchQuery, filteredEmojis, popularEmojis]);

  // Handle emoji selection
  const handleEmojiSelect = (emojiObj) => {
    onSelect(emojiObj.emoji + '\u00A0'); // Add space after emoji
  };

  // Scroll to selected emoji
  const scrollToSelectedEmoji = (index) => {
    if (!emojiPickerRef.current) return;
    const emojiButtons = emojiPickerRef.current.querySelectorAll('.tf-emoji-btn');
    if (emojiButtons[index]) {
      emojiButtons[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const itemsPerRow = 7;
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev + itemsPerRow;
            if (newIndex < allEmojis.length) {
              setTimeout(() => scrollToSelectedEmoji(newIndex), 0);
              return newIndex;
            }
            return prev;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev - itemsPerRow;
            if (newIndex >= 0) {
              setTimeout(() => scrollToSelectedEmoji(newIndex), 0);
              return newIndex;
            }
            return prev;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev + 1;
            if (newIndex < allEmojis.length) {
              setTimeout(() => scrollToSelectedEmoji(newIndex), 0);
              return newIndex;
            }
            return prev;
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev - 1;
            if (newIndex >= 0) {
              setTimeout(() => scrollToSelectedEmoji(newIndex), 0);
              return newIndex;
            }
            return prev;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (allEmojis[selectedIndex]) {
            handleEmojiSelect(allEmojis[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onSelect(''); // Close picker
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, allEmojis]);



  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  return (
    <div
      ref={emojiPickerRef}
      className={`tf-emoji-picker ${theme === 'dark' ? 'tf-dark' : ''}`}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      <div className="tf-emoji-picker-header">
        <button 
          className="tf-emoji-close-btn"
          onClick={() => onSelect('')}
          title="Close emoji picker"
        >
          ×
        </button>
      </div>
      {searchQuery ? (
        <div className="tf-emoji-category">
          <h4 className="tf-emoji-category-title">Search results for "{searchQuery}"</h4>
          <div className="tf-emoji-grid">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`search-${emoji.emoji}-${index}`}
                className={`tf-emoji-btn ${selectedIndex === index ? 'tf-emoji-selected' : ''}`}
                onMouseDown={e => {e.preventDefault(); handleEmojiSelect(emoji);}}
                onMouseEnter={() => setSelectedIndex(index)}
                title={emoji.keywords.join(', ')}
              >
                {emoji.emoji}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="tf-emoji-category">
            <h4 className="tf-emoji-category-title">Recents</h4>
            <div className="tf-emoji-grid">
              {popularEmojis.map((emoji, index) => (
                <button
                  key={`popular-${emoji}-${index}`}
                  className={`tf-emoji-btn ${selectedIndex === index ? 'tf-emoji-selected' : ''}`}
                  onMouseDown={e => {e.preventDefault(); handleEmojiSelect({emoji});}}
                  onMouseEnter={() => setSelectedIndex(index)}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="tf-emoji-categories">
            {Object.entries(emojisByCategory).map(([category, emojis]) => (
              <div key={category} className="tf-emoji-category">
                <h4 className="tf-emoji-category-title tf-capitalize">{category}</h4>
                <div className="tf-emoji-grid">
                  {emojis.map((emoji, index) => {
                    const globalIndex = popularEmojis.length + index;
                    return (
                      <button
                        key={`${emoji.emoji}-${index}`}
                        className={`tf-emoji-btn ${selectedIndex === globalIndex ? 'tf-emoji-selected' : ''}`}
                        onMouseDown={e => {e.preventDefault(); handleEmojiSelect(emoji);}}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        title={emoji.keywords.join(', ')}
                      >
                        {emoji.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 