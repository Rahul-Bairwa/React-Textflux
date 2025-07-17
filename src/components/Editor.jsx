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

function getCaretCoordinates(editorRef) {
  const selection = window.getSelection();
  if (!selection.rangeCount || !editorRef?.current) return { top: 0, left: 0 };
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(false);
  const rect = range.getClientRects()[0];
  const editorRect = editorRef.current.getBoundingClientRect();
  if (rect) {
    return {
      top: rect.bottom - editorRect.top,
      left: rect.left - editorRect.left
    };
  }
  return { top: 0, left: 0 };
}

export default function Editor({ theme = 'light', onMediaUpload, mentions = [], onChange, value }) {
  const { editorRef, html, updateContent } = useEditor();
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState([]); // array of {id, type}
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [toolbarRerender, setToolbarRerender] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      setMentionPos(getCaretCoordinates(editorRef));
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
    mentionSpan.className = 'tf-mention';
    mentionSpan.contentEditable = 'false';
    mentionSpan.innerText = `@${user.name}`;
    mentionSpan.setAttribute('data-id', user.id);
    mentionSpan.setAttribute('data-value', user.name);
    if (user.profile_pic) mentionSpan.setAttribute('data-profile-pic', user.profile_pic);
    range.insertNode(mentionSpan);
    // Move caret after the mention span (no space, no nbsp)
    range.setStartAfter(mentionSpan);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    // Remove any accidental &nbsp; after the mention span
    if (mentionSpan.nextSibling && mentionSpan.nextSibling.nodeType === Node.TEXT_NODE) {
      if (mentionSpan.nextSibling.textContent.startsWith('\u00A0')) {
        mentionSpan.nextSibling.textContent = mentionSpan.nextSibling.textContent.replace(/^\u00A0+/, '');
      }
    }
    setShowMention(false);
    setMentionQuery('');
    updateContent();
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Handle drag-and-drop media
  const handleDrop = async e => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image') || file.type.startsWith('video')) {
        await handleInsertMedia(file, file.type);
      }
    }
  };

  // Prevent file open on drag over
  const handleDragOver = e => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = e => {
    setIsDragOver(false);
  };

  // Helper to generate unique id for skeleton
  const genId = () => '_' + Math.random().toString(36).slice(2, 10);

  // Insert media from toolbar/paste/drop
  const handleInsertMedia = async (file, type) => {
    const id = genId();
    setMediaLoading(m => [...m, { id, type }]);
    let url = '';
    if (onMediaUpload) {
      const result = await onMediaUpload(file, type);
      url = result?.url;
    } else {
      url = await fileToBase64(file);
    }
    setMediaLoading(m => m.filter(item => item.id !== id));
    if (url) {
      setMedia(m => {
        const newMedia = [...m, { src: url, type }];
        // onChange ko yahan call karen
        setTimeout(() => {
          if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }, 0);
        return newMedia;
      });
    }
  };

  // Render media blocks and skeletons with newline placeholders
  const renderMedia = () => (
    <>
      {media.map((m, i) => (
        <React.Fragment key={`media-${i}`}>
          <MediaBlock src={m.src} type={m.type} />
          <div><br /></div>
        </React.Fragment>
      ))}
      {mediaLoading.map((item) => (
        <React.Fragment key={item.id}>
          <div className={`tf-media-block tf-media-skeleton tf-media-skeleton-${item.type.startsWith('image') ? 'img' : 'video'}`}>
            <div className="tf-skeleton-anim" style={{ width: '100%', height: item.type.startsWith('image') ? 180 : 180, borderRadius: 6 }} />
          </div>
          <div><br /></div>
        </React.Fragment>
      ))}
    </>
  );

  // Sync content on input
  const handleInput = () => {
    updateContent();
    if (onChange) onChange(editorRef.current?.innerHTML || '');
  };
  const handleKeyDown = (e) => {
    // Bold: Ctrl+B or Cmd+B
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.execCommand('bold');
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
    }
    // Italic: Ctrl+I or Cmd+I
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      document.execCommand('italic');
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
    }
    // Underline: Ctrl+U or Cmd+U
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      document.execCommand('underline');
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
    }
    // Strikethrough: Ctrl+Shift+S
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.execCommand('strikeThrough');
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
    }
    // Blockquote: Ctrl+Q
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      // Toggle logic: if already blockquote, set to DIV, else set to BLOCKQUOTE
      const selection = window.getSelection();
      let node = selection.anchorNode;
      let isBlockquote = false;
      while (node) {
        if (node.nodeName === 'BLOCKQUOTE') {
          isBlockquote = true;
          break;
        }
        node = node.parentNode;
      }
      if (isBlockquote) {
        document.execCommand('formatBlock', false, 'DIV');
      } else {
        document.execCommand('formatBlock', false, 'BLOCKQUOTE');
      }
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
    }
    // Ordered List: Ctrl+Shift+L (recommended)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'l' || e.key === '7')) {
      e.preventDefault();
      document.execCommand('insertOrderedList');
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
    }
    // Unordered List: Ctrl+Shift+U (recommended)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'u' || e.key === '8')) {
      e.preventDefault();
      document.execCommand('insertUnorderedList');
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
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

  // Handle paste for images
  const handlePaste = async (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items);
    let handled = false;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleInsertMedia(file, file.type);
          handled = true;
        }
      }
    }
    if (handled) return;

    // Handle URL paste
    const text = e.clipboardData.getData('text/plain');
    const urlRegex = /^https?:\/\/[^\s]+$/;
    if (urlRegex.test(text)) {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      // Create link element
      const a = document.createElement('a');
      a.href = text;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'tf-link';
      a.contentEditable = 'false';
      a.innerText = text;
      range.insertNode(a);
      // Move caret after link
      range.setStartAfter(a);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
      return;
    }
    // Default: allow normal paste
  };

  // Sync value prop to editor content
  React.useEffect(() => {
    if (editorRef.current && typeof value === 'string' && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      updateContent();
    }
  }, [value]);

  return (
    <div
      className={`tf-editor-container${theme === 'dark' ? ' tf-dark' : ''}${isFullscreen ? ' tf-fullscreen' : ''}`}
    // Fullscreen styles moved to tf-fullscreen class in CSS
    >
      <button
        type="button"
        onClick={() => setIsFullscreen(f => !f)}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10000,
          color: theme === 'dark' ? '#fff' : '#222',
          border: 'none',
          borderRadius: 4,
          padding: '6px 12px',
          fontSize: 20,
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M33 6v9h9M15 6v9H6m9 27v-9H6m27 9v-9h8.9" /></svg>
        ) : (
          // Maximize (arrows out)
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12V4h8m8 0h8v8M4 20v8h8m16-8v8h-8" /></svg>
        )}
      </button>
      <div
        ref={editorRef}
        className={`tf-editor-area${isDragOver ? ' tf-dropzone-active' : ''}`}
        contentEditable
        spellCheck={true}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => { setIsFocused(false); setToolbarRerender(v => v + 1); }}
        suppressContentEditableWarning
        aria-label="Rich text editor"
      // Fullscreen styles moved to tf-fullscreen class in CSS
      >
        {renderMedia()}
      </div>
      <div className={isFullscreen ? 'tf-toolbar-fullscreen' : ''}>
        <Toolbar
          key={toolbarRerender}
          theme={theme}
          onInsertMedia={handleInsertMedia}
          onInsertEmoji={handleInsertEmoji}
          onClearFormatting={handleClearFormatting}
          isFocused={isFocused}
        />
      </div>
      {showMention && (
        <MentionList
          suggestions={mentionSuggestions}
          onSelect={insertMention}
          position={mentionPos}
        />
      )}
    </div>
  );
} 