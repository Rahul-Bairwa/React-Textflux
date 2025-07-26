import React, { useRef, useState, useEffect } from 'react';
import { format, isFormatActive } from '../utils/formatting';
import Tooltip from './Tooltip';
import { EMOJI_LIST } from './emojiData';
const icons = {
  bold: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M7 4h4a3 3 0 0 1 0 6H7zm0 6h5a3 3 0 0 1 0 6H7z" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  italic: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 4h4M6 16h4m2-12-4 12" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  underline: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 4v5a4 4 0 0 0 8 0V4M5 16h10" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  strikethrough: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M5 10h10M8 4h4a3 3 0 0 1 2.83 2M6.17 14A3 3 0 0 0 10 16h0a3 3 0 0 0 2.83-2" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  blockquote: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M7 7h6v6H7z" stroke="currentColor" strokeWidth="1.5" /><path d="M5 13V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  orderedList: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M8 6h8M8 10h8M8 14h8M4 6h.01M4 10h.01M4 14h.01" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  unorderedList: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="5" cy="6" r="1.5" fill="currentColor" /><circle cx="5" cy="10" r="1.5" fill="currentColor" /><circle cx="5" cy="14" r="1.5" fill="currentColor" /><path d="M9 6h7M9 10h7M9 14h7" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  image: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="7" cy="9" r="1.5" fill="currentColor" /><path d="M3 15l4.5-4.5a2 2 0 0 1 2.83 0L17 15" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  video: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="3" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M13 8l4-2v8l-4-2" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  emoji: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" /><circle cx="7" cy="9" r="1" fill="currentColor" /><circle cx="13" cy="9" r="1" fill="currentColor" /><path d="M7.5 13a3.5 3.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
  clear: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" /><text x="2" y="18" fontSize="8" fill="currentColor">Tx</text></svg>
  ),
  code: (
    <svg width="20" height="20" fill="none" viewBox="0 0 48 48"><path fill="currentColor" d="M6 12.25A6.25 6.25 0 0 1 12.25 6h23.5A6.25 6.25 0 0 1 42 12.25v23.5A6.25 6.25 0 0 1 35.75 42h-23.5A6.25 6.25 0 0 1 6 35.75zm6.25-3.75a3.75 3.75 0 0 0-3.75 3.75v23.5a3.75 3.75 0 0 0 3.75 3.75h23.5a3.75 3.75 0 0 0 3.75-3.75v-23.5a3.75 3.75 0 0 0-3.75-3.75zm8.634 6.866a1.25 1.25 0 0 1 0 1.768L14.018 24l6.866 6.866a1.25 1.25 0 0 1-1.768 1.768l-7.75-7.75a1.25 1.25 0 0 1 0-1.768l7.75-7.75a1.25 1.25 0 0 1 1.768 0m8 0a1.25 1.25 0 0 0-1.768 1.768L33.982 24l-6.866 6.866a1.25 1.25 0 0 0 1.768 1.768l7.75-7.75a1.25 1.25 0 0 0 0-1.768z" /></svg>
  ),
};


const tooltips = {
  bold: { label: 'Bold', shortcut: 'Ctrl+B' },
  italic: { label: 'Italic', shortcut: 'Ctrl+I' },
  underline: { label: 'Underline', shortcut: 'Ctrl+U' },
  strikethrough: { label: 'Strikethrough', shortcut: 'Ctrl+Shift+S' },
  blockquote: { label: 'Blockquote', shortcut: 'Ctrl+Q' },
  orderedList: { label: 'Ordered List', shortcut: 'Ctrl+Shift+L' },
  unorderedList: { label: 'Unordered List', shortcut: 'Ctrl+Shift+U' },
  image: { label: 'Insert Image', shortcut: '' },
  video: { label: 'Insert Video', shortcut: '' },
  emoji: { label: 'Emoji', shortcut: '' },
  clear: { label: 'Clear Formatting', shortcut: '' },
  code: { label: 'Code Block', shortcut: 'Ctrl+K' },
};

export default function Toolbar({ theme = 'light', onInsertMedia, onInsertEmoji, onClearFormatting, onInsertCodeBlock, isFocused, isCodeBlockActive, showEmojiPicker = false, emojiSearchQuery = '' }) {
  const imgInput = useRef();
  const vidInput = useRef();
  const emojiBtnRef = useRef();
  const emojiPickerRef = useRef();
  const [showEmoji, setShowEmoji] = useState(false);
  const [, setRerender] = useState(0);
  const [recentEmojis, setRecentEmojis] = useState(['😀', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😍', '🥰', '😘']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter emojis based on search query
  const filteredEmojis = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return EMOJI_LIST;
    return EMOJI_LIST.filter(e =>
      e.keywords.some(k => k.includes(query)) ||
      (e.emoji && e.emoji.includes(query))
    );
  }, [searchQuery]);

  // Group emojis by category (filtered if search is active)
  const emojisByCategory = React.useMemo(() => {
    const emojisToGroup = searchQuery ? filteredEmojis : EMOJI_LIST;
    const grouped = {};
    emojisToGroup.forEach(emoji => {
      if (!grouped[emoji.category]) {
        grouped[emoji.category] = [];
      }
      grouped[emoji.category].push(emoji);
    });
    return grouped;
  }, [filteredEmojis, searchQuery]);

  // Get all emojis in a flat array for navigation
  const allEmojis = React.useMemo(() => {
    if (searchQuery) {
      return filteredEmojis;
    }
    return recentEmojis.map(emoji => ({ emoji, keywords: [emoji] })).concat(EMOJI_LIST);
  }, [searchQuery, filteredEmojis, recentEmojis]);

  // Auto-scroll to selected emoji
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

  // Show emoji picker when triggered from editor
  useEffect(() => {
    if (showEmojiPicker) {
      setShowEmoji(true);
      setSearchQuery(emojiSearchQuery || '');
      setSelectedIndex(0);
    }
  }, [showEmojiPicker, emojiSearchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!showEmoji) return;

    const handleKeyDown = (e) => {
      const itemsPerRow = 7; 
      
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
          setShowEmoji(false);
          setSearchQuery('');
          setSelectedIndex(0);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEmoji, selectedIndex, allEmojis]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    function handleClick(e) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        emojiBtnRef.current &&
        !emojiBtnRef.current.contains(e.target)
      ) {
        setShowEmoji(false);
        setSearchQuery('');
        setSelectedIndex(0);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmoji]);

  const handleFile = (type) => {
    try {
      setTimeout(() => {
        if (type === 'image' && imgInput.current) {
          imgInput.current.click();
        } else if (type === 'video' && vidInput.current) {
          vidInput.current.click();
        }
      }, 10);
    } catch (error) {
      console.error('Error opening file dialog:', error);
    }
  };

  const handleEmojiSelect = (emojiObj) => {
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emojiObj.emoji);
      const updated = [emojiObj.emoji, ...filtered].slice(0, 50); // Increased to 50
      return updated;
    });
    onInsertEmoji(emojiObj.emoji + '\u00A0'); // Add space after emoji
    setShowEmoji(false);
    setSearchQuery('');
    setSelectedIndex(0);
  };

  return (
    <div className={`tf-toolbar ${theme === 'dark' ? 'tf-dark' : ''}`}>
      {Object.entries(icons).map(([key, icon]) => {
        if (key === 'image' || key === 'video' || key === 'emoji' || key === 'clear' || key === 'code') return null;
        let active = false;
        if (isFocused) {
          if (key === 'bold' || key === 'italic' || key === 'underline' || key === 'strikethrough') {
            active = isFormatActive(key === 'strikethrough' ? 'strikeThrough' : key);
          }
          if (key === 'blockquote') {
            active = isFormatActive('formatBlock');
          }
          if (key === 'orderedList') {
            active = isFormatActive('insertOrderedList');
          }
          if (key === 'unorderedList') {
            active = isFormatActive('insertUnorderedList');
          }
        }
        return (
          <Tooltip key={key} label={tooltips[key].label} shortcut={tooltips[key].shortcut} theme={theme}>
            <button
              title={tooltips[key].label}
              className={`tf-toolbar-btn${active ? ' active' : ''}`}
              onMouseDown={e => {
                e.preventDefault();
                if (key === 'blockquote') {
                  if (isFormatActive('formatBlock')) {
                    format('formatBlock', 'DIV');
                  } else {
                    format('formatBlock', 'BLOCKQUOTE');
                  }
                }
                else if (key === 'orderedList') format('insertOrderedList');
                else if (key === 'unorderedList') format('insertUnorderedList');
                else format(key === 'strikethrough' ? 'strikeThrough' : key);
                setRerender(v => v + 1);
              }}
            >
              {icon}
            </button>
          </Tooltip>
        );
      })}
      <Tooltip label={tooltips.image.label} shortcut={tooltips.image.shortcut} theme={theme}>
        <button title="Insert Image" className="tf-toolbar-btn" tabIndex={0} onClick={e => { e.preventDefault(); e.stopPropagation(); handleFile('image'); }}>{icons.image}</button>
      </Tooltip>
      <input 
        type="file" 
        accept="image/*" 
        ref={imgInput} 
        className="tf-file-input" 
        onChange={e => {
          try {
            if (e.target.files && e.target.files[0]) {
              onInsertMedia(e.target.files[0], e.target.files[0].type);
            }
            e.target.value = '';
          } catch (error) {
            console.error('Error handling image file:', error);
            e.target.value = '';
          }
        }} 
      />
      <Tooltip label={tooltips.video.label} shortcut={tooltips.video.shortcut} theme={theme}>
        <button title="Insert Video" className="tf-toolbar-btn" tabIndex={0} onClick={e => { e.preventDefault(); e.stopPropagation(); handleFile('video'); }}>{icons.video}</button>
      </Tooltip>
      <input 
        type="file" 
        accept="video/*" 
        ref={vidInput} 
        className="tf-file-input" 
        onChange={e => {
          try {
            if (e.target.files && e.target.files[0]) {
              onInsertMedia(e.target.files[0], e.target.files[0].type);
            }
            e.target.value = '';
          } catch (error) {
            console.error('Error handling video file:', error);
            e.target.value = '';
          }
        }} 
      />
      <div className="tf-relative">
        <Tooltip label={tooltips.emoji.label} shortcut={tooltips.emoji.shortcut} theme={theme}>
          <button
            ref={emojiBtnRef}
            title="Emoji"
            className="tf-toolbar-btn"
            onClick={e => { e.preventDefault(); e.stopPropagation(); setShowEmoji(v => !v); }}
          >
            {icons.emoji}
          </button>
        </Tooltip>
        {showEmoji && (
          <div ref={emojiPickerRef} className={`tf-emoji-picker ${theme === 'dark' ? 'tf-dark' : ''}`}>
            {/* Search results or Recently used */}
            {searchQuery ? (
              <div className="tf-emoji-category">
                <div className="tf-emoji-grid">
                  {filteredEmojis.map((emoji, index) => (
                    <button
                      key={`search-${emoji.emoji}-${index}`}
                      className={`tf-emoji-btn ${selectedIndex === index ? 'tf-emoji-selected' : ''}`}
                      onMouseDown={e => { e.preventDefault(); handleEmojiSelect(emoji); }}
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
                {/* Recently used category */}
                {recentEmojis.length > 0 && (
                  <div className="tf-emoji-category">
                    <h4 className="tf-emoji-category-title">Recently used</h4>
                    <div className="tf-emoji-grid">
                      {recentEmojis.map((emoji, index) => (
                        <button
                          key={`recent-${emoji}-${index}`}
                          className={`tf-emoji-btn ${selectedIndex === index ? 'tf-emoji-selected' : ''}`}
                          onMouseDown={e => { e.preventDefault(); handleEmojiSelect({ emoji }); }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Emoji categories */}
                <div className="tf-emoji-categories">
                  {Object.entries(emojisByCategory).map(([category, emojis]) => (
                    <div key={category} className="tf-emoji-category">
                      <h4 className="tf-emoji-category-title">{category}</h4>
                      <div className="tf-emoji-grid">
                        {emojis.map((emoji, index) => {
                          const globalIndex = recentEmojis.length + index;
                          return (
                            <button
                              key={`${emoji.emoji}-${index}`}
                              className={`tf-emoji-btn ${selectedIndex === globalIndex ? 'tf-emoji-selected' : ''}`}
                              onMouseDown={e => { e.preventDefault(); handleEmojiSelect(emoji); }}
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
        )}
      </div>
      <Tooltip label={tooltips.code.label} shortcut={tooltips.code.shortcut} theme={theme}>
        <button title="Insert Code Block" className={`tf-toolbar-btn${isCodeBlockActive ? ' active' : ''}`} onClick={e => { e.preventDefault(); e.stopPropagation(); onInsertCodeBlock(); }}>{icons.code}</button>
      </Tooltip>
      <Tooltip label={tooltips.clear.label} shortcut={tooltips.clear.shortcut} theme={theme}>
        <button title="Clear Formatting" className="tf-toolbar-btn" onClick={e => { e.preventDefault(); e.stopPropagation(); onClearFormatting(); }}>{icons.clear}</button>
      </Tooltip>
    </div>
  );
} 