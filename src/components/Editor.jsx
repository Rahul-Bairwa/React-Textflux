import React, { useState } from 'react';
import Toolbar from './Toolbar';
import MentionList from './MentionList';
import MediaBlock from './MediaBlock';
import useEditor from '../hooks/useEditor';

// Utility function to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

function getCaretCoordinates() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return { top: 0, left: 0 };
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(false);
  const rect = range.getClientRects()[0];
  if (rect) return { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX };
  return { top: 0, left: 0 };
}

export default function Editor({ theme = 'light', onMediaUpload, mentions = [] }) {
  const { editorRef, html, json, updateContent } = useEditor();
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [media, setMedia] = useState([]);

  // Filter mention suggestions from passed data
  const mentionSuggestions = mentions.filter(u =>
    (u.name || '').toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Handle key events for @mention
  const handleKeyUp = e => {
    updateContent();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const text = range.startContainer.textContent?.slice(0, range.startOffset) || '';
    const atIdx = text.lastIndexOf('@');
    if (atIdx !== -1) {
      setShowMention(true);
      setMentionQuery(text.slice(atIdx + 1));
      setMentionPos(getCaretCoordinates());
    } else {
      setShowMention(false);
      setMentionQuery('');
    }
  };

  // Insert mention at caret (with data attributes)
  const insertMention = user => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    // Remove @query
    const text = range.startContainer.textContent;
    const atIdx = text.lastIndexOf('@');
    if (atIdx !== -1) {
      range.setStart(range.startContainer, atIdx);
      range.deleteContents();
    }
    // Insert mention span with data attributes
    const mentionSpan = document.createElement('span');
    mentionSpan.className = 'mention';
    mentionSpan.contentEditable = 'false';
    mentionSpan.innerText = `@${user.name}`;
    mentionSpan.setAttribute('data-id', user.id);
    mentionSpan.setAttribute('data-value', user.name);
    if (user.profile_pic) mentionSpan.setAttribute('data-profile-pic', user.profile_pic);
    range.insertNode(mentionSpan);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    setShowMention(false);
    setMentionQuery('');
    updateContent();
  };

  // Handle drag-and-drop media
  const handleDrop = e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image') || file.type.startsWith('video')) {
        const reader = new FileReader();
        reader.onload = ev => {
          setMedia(m => [...m, { src: ev.target.result, type: file.type }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Render media blocks
  const renderMedia = () =>
    media.map((m, i) => <MediaBlock key={i} src={m.src} type={m.type} />);

  // Prevent file open on drop
  const handleDragOver = e => e.preventDefault();

  // Sync content on input
  const handleInput = () => updateContent();

  // Insert media from toolbar
  const handleInsertMedia = async (file, type) => {
    let url = '';
    if (onMediaUpload) {
      const result = await onMediaUpload(file, type);
      url = result?.url;
    } else {
      // fallback: base64
      url = await fileToBase64(file);
    }
    if (url) {
      setMedia(m => [...m, { src: url, type }]);
    }
  };

  // Insert emoji at caret
  const handleInsertEmoji = emoji => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.insertNode(document.createTextNode(emoji));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    updateContent();
  };

  // Clear formatting
  const handleClearFormatting = () => {
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    document.execCommand('formatBlock', false, 'div');
    updateContent();
  };

  return (
    <div className={`editor-container ${theme === 'dark' ? 'dark' : ''}`}>
      <Toolbar 
        theme={theme}
        onInsertMedia={handleInsertMedia}
        onInsertEmoji={handleInsertEmoji}
        onClearFormatting={handleClearFormatting}
      />
      <div
        ref={editorRef}
        className="editor-area"
        contentEditable
        spellCheck={true}
        onKeyUp={handleKeyUp}
        onInput={handleInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        suppressContentEditableWarning
        aria-label="Rich text editor"
      >
        {renderMedia()}
      </div>
      {showMention && (
        <MentionList
          suggestions={mentionSuggestions}
          onSelect={insertMention}
          position={mentionPos}
        />
      )}
      <div className="output-container">
        <div className="output-label">HTML Output:</div>
        <div className="output-content">{html}</div>
        <div className="output-label mt-2">JSON Output:</div>
        <div className="output-content">{JSON.stringify(json, null, 2)}</div>
      </div>
    </div>
  );
} 