import React, { useRef, useState } from 'react';
import { format, isFormatActive } from '../utils/formatting';
import Tooltip from './Tooltip';

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
  file: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M4 4a2 2 0 0 1 2-2h4.586a2 2 0 0 1 1.414.586l3.414 3.414A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" stroke="currentColor" strokeWidth="1.5" /><path d="M10 2v4a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.5" /></svg>
  ),
};

const tooltips = {
  bold: { label: 'Bold', shortcut: 'Ctrl+B' },
  italic: { label: 'Italic', shortcut: 'Ctrl+I' },
  underline: { label: 'Underline', shortcut: 'Ctrl+U' },
  strikethrough: { label: 'Strikethrough', shortcut: 'Ctrl+Shift+S' },
  blockquote: { label: 'Blockquote', shortcut: 'Ctrl+Q' },
  orderedList: { label: 'Ordered List', shortcut: 'Ctrl+Shift+L' },
  unorderedList: { label: 'Unordered List', shortcut: 'Ctrl+Shift+O' },
  image: { label: 'Insert Image', shortcut: '' },
  video: { label: 'Insert Video', shortcut: '' },
  emoji: { label: 'Emoji', shortcut: 'type : to search' },
  clear: { label: 'Clear Formatting', shortcut: '' },
  code: { label: 'Code Block', shortcut: 'Ctrl+K' },
  file: { label: 'Insert File', shortcut: '' },
};

export default function Toolbar({ theme = 'light', onInsertMedia, onInsertEmoji, onClearFormatting, onInsertCodeBlock, isFocused, isCodeBlockActive }) {
  const imgInput = useRef();
  const vidInput = useRef();
  const fileInput = useRef();
  const [, setRerender] = useState(0);

  const handleFile = (type) => {
    try {
      setTimeout(() => {
        if (type === 'image' && imgInput.current) {
          imgInput.current.click();
        } else if (type === 'video' && vidInput.current) {
          vidInput.current.click();
        } else if (type === 'file' && fileInput.current) {
          fileInput.current.click();
        }
      }, 10);
    } catch (error) {
      console.error('Error opening file dialog:', error);
    }
  };

  return (
    <div className={`tf-toolbar ${theme === 'dark' ? 'tf-dark' : ''}`}>
      {Object.entries(icons).map(([key, icon]) => {
        if (key === 'image' || key === 'video' || key === 'emoji' || key === 'clear' || key === 'code' || key === 'file') return null;
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
      <Tooltip label={tooltips.file.label} shortcut={tooltips.file.shortcut} theme={theme}>
        <button title="Insert File" className="tf-toolbar-btn" tabIndex={0} onClick={e => { e.preventDefault(); e.stopPropagation(); handleFile('file'); }}>{icons.file}</button>
      </Tooltip>
      <input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.rar,.ppk,.pem,.exe"
        ref={fileInput}
        className="tf-file-input"
        onChange={e => {
          try {
            if (e.target.files && e.target.files[0]) {
              onInsertMedia(e.target.files[0], 'file');
            }
            e.target.value = '';
          } catch (error) {
            console.error('Error handling file:', error);
            e.target.value = '';
          }
        }}
      />
      <Tooltip label={tooltips.emoji.label} shortcut={tooltips.emoji.shortcut} theme={theme}>
        <button title="Emoji (type : to search)" className="tf-toolbar-btn" tabIndex={0} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onInsertEmoji('', true); }}>{icons.emoji}</button>
      </Tooltip>
      <Tooltip label={tooltips.code.label} shortcut={tooltips.code.shortcut} theme={theme}>
        <button title="Code Block" className={`tf-toolbar-btn${isCodeBlockActive ? ' active' : ''}`} tabIndex={0} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onInsertCodeBlock(); }}>{icons.code}</button>
      </Tooltip>
      <Tooltip label={tooltips.clear.label} shortcut={tooltips.clear.shortcut} theme={theme}>
        <button title="Clear Formatting" className="tf-toolbar-btn" tabIndex={0} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onClearFormatting(); }}>{icons.clear}</button>
      </Tooltip>
    </div>
  );
} 