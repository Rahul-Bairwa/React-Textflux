import React, { useState } from 'react';
import Toolbar from './Toolbar';
import MentionList from './MentionList';
import EmojiPicker from './EmojiPicker';
import MediaBlock from './MediaBlock';
import useEditor from '../hooks/useEditor';
import { isCodeBlockActive } from '../utils/formatting';
import { EMOJI_LIST } from './emojiData';

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

function getOptimalPopupPosition(editorRef, basePosition) {
  if (!editorRef?.current) return basePosition;
  
  const editorRect = editorRef.current.getBoundingClientRect();
  const pickerWidth = 219; // Original width of emoji picker
  const pickerHeight = 209; // Original height of emoji picker
  
  let { top, left } = basePosition;
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Get editor's position relative to viewport
  const editorViewportLeft = editorRect.left;
  const editorViewportTop = editorRect.top;
  
  // Calculate available space in all directions (including outside editor)
  const spaceRight = viewportWidth - (editorViewportLeft + left + pickerWidth);
  const spaceLeft = editorViewportLeft + left - pickerWidth;
  const spaceBelow = viewportHeight - (editorViewportTop + top + pickerHeight);
  const spaceAbove = editorViewportTop + top - pickerHeight;
  
  // Priority order: right, left, below, above
  if (spaceRight >= 20) {
    // Enough space on the right - keep current position
    left = Math.max(10, left);
  } else if (spaceLeft >= 20) {
    // Try left side
    left = Math.max(10, left - pickerWidth - 20);
  } else if (spaceBelow >= 20) {
    // Try below (can be outside editor)
    top = Math.max(10, top + 20);
    // Don't constrain left to editor width when going outside
    left = Math.max(10, left);
  } else if (spaceAbove >= 20) {
    // Try above (can be outside editor)
    top = Math.max(10, top - pickerHeight - 20);
    // Don't constrain left to editor width when going outside
    left = Math.max(10, left);
  } else {
    // Fallback: try to position outside editor if possible
    if (spaceBelow >= 0) {
      // Position below editor
      top = editorRect.height + 10;
      left = Math.max(10, left);
    } else if (spaceAbove >= 0) {
      // Position above editor
      top = -pickerHeight - 10;
      left = Math.max(10, left);
    } else {
      // Last resort: center in editor
      left = Math.max(10, (editorRect.width - pickerWidth) / 2);
      top = Math.max(10, (editorRect.height - pickerHeight) / 2);
    }
  }
  
  // Only constrain to editor bounds if we're positioning inside editor
  const isInsideEditor = top >= 0 && top + pickerHeight <= editorRect.height && 
                        left >= 0 && left + pickerWidth <= editorRect.width;
  
  if (isInsideEditor) {
    // Ensure picker stays within editor bounds only when inside
    if (left + pickerWidth > editorRect.width) {
      left = Math.max(10, editorRect.width - pickerWidth - 10);
    }
    
    if (top + pickerHeight > editorRect.height) {
      top = Math.max(10, editorRect.height - pickerHeight - 10);
    }
    
    if (left < 0) {
      left = 10;
    }
    
    if (top < 0) {
      top = 10;
    }
  } else {
    // When outside editor, ensure it stays within viewport
    if (left + pickerWidth > viewportWidth) {
      left = viewportWidth - pickerWidth - 10;
    }
    
    if (top + pickerHeight > viewportHeight) {
      top = viewportHeight - pickerHeight - 10;
    }
    
    if (left < 0) {
      left = 10;
    }
    
    if (top < 0) {
      top = 10;
    }
  }
  
  return { top, left };
}

function moveCursorToEnd(editorRef) {
  if (!editorRef?.current) return;

  const selection = window.getSelection();
  const range = document.createRange();

  // Place cursor at the end of the editor
  const editor = editorRef.current;
  range.selectNodeContents(editor);
  range.collapse(false); // collapse to end

  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
}

// Ensure there's an editable paragraph after non-text blocks (e.g., blockquote)
function ensureTrailingParagraph(editorRef) {
  const editor = editorRef?.current;
  if (!editor) return null;

  const lastChild = editor.lastChild;
  const needsTrailing = lastChild && (
    (lastChild.nodeType === Node.ELEMENT_NODE && (
      lastChild.nodeName === 'BLOCKQUOTE' ||
      lastChild.nodeName === 'PRE' ||
      lastChild.nodeName === 'OL' ||
      lastChild.nodeName === 'UL' ||
      (lastChild.classList && lastChild.classList.contains('tf-media-block'))
    ))
  );

  if (needsTrailing) {
    const paragraph = document.createElement('div');
    paragraph.appendChild(document.createElement('br'));
    editor.appendChild(paragraph);
    return paragraph;
  }
  return null;
}

// Get caret character offset within an element (based on text content)
function getCaretOffset(editorElement) {
  try {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!editorElement.contains(range.startContainer)) return null;
    const preRange = document.createRange();
    preRange.selectNodeContents(editorElement);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  } catch {
    return null;
  }
}

// Restore caret at a given character offset within element
function restoreCaretAtOffset(editorElement, targetOffset) {
  try {
    const walker = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    let currentNode = walker.nextNode();
    let remaining = typeof targetOffset === 'number' ? targetOffset : 0;
    while (currentNode) {
      const textLength = currentNode.nodeValue?.length || 0;
      if (remaining <= textLength) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(currentNode, Math.max(0, remaining));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      remaining -= textLength;
      currentNode = walker.nextNode();
    }
    // Fallback: move to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editorElement);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  } catch {
    return false;
  }
}

export default function Editor({ theme = 'light', onMediaUpload, mentions = [], onChange, value, onEnter, mediaFullscreen = false }) {
  const { editorRef, html, updateContent } = useEditor();
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState([]); // array of {id, type}
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [toolbarRerender, setToolbarRerender] = useState(0);
  // Add a state for code block active
  const [isCodeBlockActiveState, setIsCodeBlockActiveState] = useState(false);
  // Add a flag to prevent mention list from re-opening immediately after selection
  const [justSelectedMention, setJustSelectedMention] = useState(false);

  // Emoji picker states for cursor position
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 });

  // Handle click outside to close emoji picker and mention list
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both editor and popups
      const editorElement = editorRef.current;
      const emojiPickerElement = document.querySelector('.tf-emoji-picker');
      const mentionListElement = document.querySelector('.tf-mention-list');
      
      let shouldCloseEmoji = false;
      let shouldCloseMention = false;
      
      if (showEmojiPicker) {
        if (editorElement && !editorElement.contains(event.target) && 
            emojiPickerElement && !emojiPickerElement.contains(event.target)) {
          shouldCloseEmoji = true;
        }
      }
      
      if (showMention) {
        if (editorElement && !editorElement.contains(event.target) && 
            mentionListElement && !mentionListElement.contains(event.target)) {
          shouldCloseMention = true;
        }
      }
      
      if (shouldCloseEmoji) {
        setShowEmojiPicker(false);
        setEmojiSearchQuery('');
      }
      
      if (shouldCloseMention) {
        setShowMention(false);
        setMentionQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showMention]);

  // Filter mention suggestions from passed data
  const mentionSuggestions = mentions.filter(u =>
    (u.name || '').toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Filtered emoji list
  const filteredEmojis = React.useMemo(() => {
    if (!emojiSearchQuery) return [];
    const q = emojiSearchQuery.toLowerCase();
    return EMOJI_LIST.filter(e =>
      e.keywords.some(k => k.includes(q)) ||
      (e.emoji && e.emoji.includes(q))
    );
  }, [emojiSearchQuery]);

  // Handle key events for @mention and :emoji
  const handleKeyUp = e => {
    updateContent();
    if (justSelectedMention) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
    if (node?.classList?.contains('tf-mention')) {
      setShowMention(false);
      setMentionQuery('');
      return;
    }

    // Get plain text before cursor, skipping mention spans
    let text = '';
    let curr = range.startContainer;
    let offset = range.startOffset;
    if (curr.nodeType === Node.TEXT_NODE) {
      text = curr.textContent.slice(0, offset);
      curr = curr.previousSibling;
    }
    while (curr) {
      if (curr.nodeType === Node.TEXT_NODE) text = curr.textContent + text;
      else if (curr.nodeType === Node.ELEMENT_NODE && !curr.classList.contains('tf-mention')) {
        // Handle <br> tags as line breaks
        if (curr.nodeName === 'BR') {
          text = '\n' + text;
        } else {
          text = curr.textContent + text;
        }
      }
      curr = curr.previousSibling;
    }

    // Auto-ordered list detection: Check if user typed "number. " pattern
    const autoOrderedListPattern = /^(\d+)\.\s*$/;
    const lines = text.split('\n');
    const currentLine = lines[lines.length - 1];
    
    if (autoOrderedListPattern.test(currentLine)) {
      // Check if we're not already in a list
      let currentNode = range.startContainer;
      while (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
        currentNode = currentNode.parentNode;
      }
      
      // Check if we're not already inside a list item
      const isInList = currentNode && (
        currentNode.nodeName === 'LI' || 
        currentNode.closest('li') || 
        currentNode.closest('ol') || 
        currentNode.closest('ul')
      );
      
      if (!isInList) {
        // Create ordered list
        const match = currentLine.match(autoOrderedListPattern);
        const listNumber = match[1];
        
        // Remove the "number. " text
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const newText = textNode.textContent.replace(/^\d+\.\s*/, '');
          textNode.textContent = newText;
          
          // Create ordered list with custom starting number
          const ol = document.createElement('ol');
          const startNumber = parseInt(listNumber, 10);
          if (startNumber > 1) {
            ol.setAttribute('start', startNumber.toString());
          }
          const li = document.createElement('li');
          li.innerHTML = '<br>';
          ol.appendChild(li);
          
          // Insert the list before the current text node's parent
          const parentNode = textNode.parentNode;
          parentNode.insertBefore(ol, textNode);
          
          // Move cursor inside the list item
          const newRange = document.createRange();
          newRange.setStart(li, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          
          updateContent();
          if (onChange) onChange(editorRef.current?.innerHTML || '');
          return;
        }
      }
    }

    // Emoji trigger - show at cursor position
    // Find the colon that's part of the current word being typed
    const words = text.split(/[\s\n]/);
    const currentWord = words[words.length - 1];
    
    if (currentWord && currentWord.startsWith(':')) {
      const query = currentWord.slice(1); // Remove the colon
      
      // Check if colon is followed by hyphen to prevent emoji picker
      if (query.startsWith('-')) {
        setShowEmojiPicker(false);
        setEmojiSearchQuery('');
      } else {
        const basePosition = getCaretCoordinates(editorRef);
        const optimalPosition = getOptimalPopupPosition(editorRef, basePosition);
        setShowEmojiPicker(true);
        setEmojiSearchQuery(query);
        setEmojiPos(optimalPosition);
      }
    } else {
      setShowEmojiPicker(false);
      setEmojiSearchQuery('');
    }

    // Mention trigger
    const atIdx = text.lastIndexOf('@');
    if (atIdx !== -1) {
      // Check if this @ belongs to a manually trimmed mention
      let shouldBlockMention = false;
      const queryAfterAt = text.slice(atIdx + 1);
      
      // Find all trimmed mentions in the editor
      const trimmedMentions = editorRef.current?.querySelectorAll('.tf-mention[data-manually-trimmed="true"]') || [];
      
      for (const mention of trimmedMentions) {
        const mentionText = mention.innerText || '';
        const mentionValue = mentionText.replace(/^@/, '');
        
        // Check if the current @ query matches a trimmed mention
        if (mentionValue && queryAfterAt && mentionValue.toLowerCase() === queryAfterAt.toLowerCase()) {
          // Check if this @ is likely referring to the same trimmed mention
          // by checking if it's in the same general area (same paragraph/line)
          let currentElement = range.startContainer;
          while (currentElement && currentElement.nodeType !== Node.ELEMENT_NODE) {
            currentElement = currentElement.parentNode;
          }
          
          if (currentElement && (currentElement === mention.parentNode || 
              currentElement.contains(mention) || mention.parentNode?.contains(currentElement))) {
            shouldBlockMention = true;
            break;
          }
        }
      }
      
      if (shouldBlockMention) {
        setShowMention(false);
        setMentionQuery('');
      } else {
        setShowMention(true);
        setMentionQuery(text.slice(atIdx + 1));
        const basePosition = getCaretCoordinates(editorRef);
        const optimalPosition = getOptimalPopupPosition(editorRef, basePosition);
        setMentionPos(optimalPosition);
      }
    } else {
      setShowMention(false);
      setMentionQuery('');
    }
  };

  // Shrink a mention text by removing one word from the end on Backspace
  const shrinkMentionByOneWord = (mentionEl) => {
    if (!mentionEl) return { removed: false };
    // Use data-value if available (without leading @), otherwise derive from innerText
    const originalValue = mentionEl.getAttribute('data-value') || (mentionEl.innerText || '').replace(/^@/, '');
    const parts = originalValue.split(' ').filter(Boolean);
    if (parts.length <= 1) {
      // Remove entire mention
      const parent = mentionEl.parentNode;
      const nextSibling = mentionEl.nextSibling;
      mentionEl.remove();
      // Place caret at the position where the mention was
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        if (nextSibling) {
          range.setStart(nextSibling, 0);
        } else if (parent) {
          range.selectNodeContents(parent);
          range.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {}
      return { removed: true };
    }
    // Remove last word and update
    parts.pop();
    const newValue = parts.join(' ');
    mentionEl.setAttribute('data-value', newValue);
    mentionEl.setAttribute('data-manually-trimmed', 'true'); // Mark as manually trimmed
    mentionEl.innerText = `@${newValue}`;
    // Move caret after the mention element
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStartAfter(mentionEl);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {}
    return { removed: false };
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
    setJustSelectedMention(true);
    updateContent();
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    // Move cursor after mention insertion and ensure it's not inside the mention span
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        // If cursor is inside the mention span, move it after
        let currentNode = range.startContainer;
        while (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
          currentNode = currentNode.parentNode;
        }
        if (currentNode && currentNode.classList && currentNode.classList.contains('tf-mention')) {
          range.setStartAfter(currentNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      editorRef.current.focus();
      
      // Reset the flag after a short delay
      setTimeout(() => {
        setJustSelectedMention(false);
      }, 100);
    }, 0);
  };

  // Insert emoji at caret (called from EmojiPicker or toolbar button)
  const handleInsertEmoji = (emoji, fromToolbar = false) => {
    // If called from toolbar button, show emoji picker
    if (fromToolbar) {
      const basePosition = getCaretCoordinates(editorRef);
      const optimalPosition = getOptimalPopupPosition(editorRef, basePosition);
      setShowEmojiPicker(true);
      setEmojiSearchQuery('');
      setEmojiPos(optimalPosition);
      return;
    }
    
    try {
      // Ensure editor is focused and cursor is inside editor
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.focus();
      }
      
      const sel = window.getSelection();
      if (!sel.rangeCount) {
        // If no selection, place cursor at end of editor
        if (editorRef.current) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          return;
        }
      }
      
      let range = sel.getRangeAt(0);
      
      // Check if cursor is inside the editor
      if (!editorRef.current.contains(range.startContainer)) {
        // Cursor is outside editor, move it to end of editor
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        sel.removeAllRanges();
        sel.addRange(newRange);
        range = newRange;
      }
      
      // Handle empty editor case
      if (!range.startContainer || !range.startContainer.textContent) {
        // Editor is empty, just insert emoji at the beginning
        const emojiNode = document.createTextNode(emoji);
        range.insertNode(emojiNode);
        range.setStartAfter(emojiNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        setShowEmojiPicker(false);
        setEmojiSearchQuery('');
        updateContent();
        if (onChange && editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
          }
        }, 0);
        return;
      }
      
      const text = range.startContainer.textContent;
      const colonIdx = text.lastIndexOf(':');
      
      if (colonIdx !== -1) {
        // Validate that the offset is within bounds
        const maxOffset = range.startContainer.textContent.length;
        const safeOffset = Math.min(colonIdx, maxOffset);
        
        try {
          range.setStart(range.startContainer, safeOffset);
          range.deleteContents();
        } catch (error) {
          console.warn('Error setting range start:', error);
          // If setting range fails, just insert the emoji at current position
        }
      }
      
      // Insert the emoji
      const emojiNode = document.createTextNode(emoji);
      range.insertNode(emojiNode);
      
      // Move cursor after the emoji
      range.setStartAfter(emojiNode);
      range.collapse(true);
      
      sel.removeAllRanges();
      sel.addRange(range);
      
      setShowEmojiPicker(false);
      setEmojiSearchQuery('');
      updateContent();
      
      if (onChange && editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 0);
      
    } catch (error) {
      console.error('Error inserting emoji:', error);
      // Fallback: just insert emoji at the end
      if (editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        range.insertNode(document.createTextNode(emoji));
        editorRef.current.focus();
        updateContent();
        if (onChange) {
          onChange(editorRef.current.innerHTML);
        }
      }
      setShowEmojiPicker(false);
      setEmojiSearchQuery('');
    }
  };

  // Handle drag-and-drop media
  const handleDrop = async e => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
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
    try {
      if (!file) {
        console.error('No file provided to handleInsertMedia');
        return;
      }
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
          // Move cursor after media insertion
          setTimeout(() => {
            if (onChange && editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
            // Move cursor to end of editor
            moveCursorToEnd(editorRef);
          }, 0);
          return newMedia;
        });
      }
    } catch (error) {
      console.error('Error in handleInsertMedia:', error);
      setMediaLoading(m => m.filter(item => item.type !== type));
    }
  };

  // Render media blocks and skeletons with newline placeholders
  const renderMedia = () => (
    <>
      {media.map((m, i) => (
        <React.Fragment key={`media-${i}`}>
          <MediaBlock src={m.src} type={m.type} mediaFullscreen={mediaFullscreen} />
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

  // Handle copy event to preserve hyperlink formatting
  const handleCopy = (e) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    
    // Check if the selection contains any links
    const links = fragment.querySelectorAll('a');
    if (links.length > 0 && e.clipboardData) {
      e.preventDefault();
      
      // Create a temporary container to work with the HTML
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment.cloneNode(true));
      
      // Get both HTML and plain text
      const htmlContent = tempDiv.innerHTML;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // Set clipboard data with both HTML and text formats
      e.clipboardData.setData('text/html', htmlContent);
      e.clipboardData.setData('text/plain', textContent);
    }
  };

  const handleKeyDown = (e) => {
    // Handle backspace and delete for mentions and links
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // If a mention element is selected (non-collapsed), shrink on Backspace
        if (!range.collapsed && e.key === 'Backspace') {
          try {
            if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.ELEMENT_NODE) {
              const containerEl = range.startContainer;
              const startIndex = range.startOffset;
              const endIndex = range.endOffset;
              if (endIndex === startIndex + 1) {
                const candidate = containerEl.childNodes[startIndex];
                if (candidate && candidate.classList && candidate.classList.contains('tf-mention')) {
                  e.preventDefault();
                  shrinkMentionByOneWord(candidate);
                  updateContent();
                  if (onChange) onChange(editorRef.current?.innerHTML || '');
                  return;
                }
              }
            }
          } catch {}
        }
        
        // Helper function to check if element is mention or link
        const isMentionOrLink = (element) => {
          return element && element.classList && (
            element.classList.contains('tf-mention') || 
            element.classList.contains('tf-link')
          );
        };
        
        // Helper function to check if element is whitespace (including &nbsp;)
        const isWhitespace = (element) => {
          if (!element) return false;
          if (element.nodeType === Node.TEXT_NODE) {
            return element.textContent.trim() === '' || element.textContent === '\u00A0';
          }
          return false;
        };
        
        // Only handle mentions/links if we're directly adjacent to them, not searching broadly
        const findAdjacentMentionOrLink = () => {
          let currentNode = range.startContainer;
          
          if (e.key === 'Backspace') {
            // Only check if we're immediately before a mention/link
            if (range.collapsed && currentNode.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
              let prevSibling = currentNode.previousSibling;
              if (prevSibling && isMentionOrLink(prevSibling)) {
                return prevSibling;
              }
            }
            
            // Check if we're at element boundary immediately after a mention/link
            if (range.collapsed && currentNode.nodeType === Node.ELEMENT_NODE && range.startOffset > 0) {
              const prevChild = currentNode.childNodes[range.startOffset - 1];
              if (prevChild && isMentionOrLink(prevChild)) {
                return prevChild;
              }
            }
          }
          
          return null;
        };
        
        const elementToDelete = findAdjacentMentionOrLink();
        if (elementToDelete) {
          // If Backspace adjacent to a mention, shrink it by one word instead of deleting
          if (e.key === 'Backspace' && elementToDelete.classList && elementToDelete.classList.contains('tf-mention')) {
            e.preventDefault();
            const { removed } = shrinkMentionByOneWord(elementToDelete);
            updateContent();
            if (onChange) onChange(editorRef.current?.innerHTML || '');
            return;
          }
          e.preventDefault();
          elementToDelete.remove();
          updateContent();
          if (onChange) onChange(editorRef.current?.innerHTML || '');
          return;
        }
      }
    }

    if (e.key === 'Enter') {
      if (showMention && mentionSuggestions.length > 0 || showEmojiPicker) {
        return;
      }
      
      // Check if we're inside a list
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;
        
        // Find the list item parent
        while (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
          currentNode = currentNode.parentNode;
        }
        
        // Check if we're inside a list item
        if (currentNode && (currentNode.nodeName === 'LI' || currentNode.closest('li'))) {
          const listItem = currentNode.nodeName === 'LI' ? currentNode : currentNode.closest('li');
          const list = listItem.parentNode;
          
          // If we're at the end of a list item, create a new one
          if (range.startOffset === range.startContainer.length || 
              range.startContainer.textContent.trim() === '') {
            e.preventDefault();
            
            // Check if current list item is empty (just <br> or empty)
            const listItemContent = listItem.textContent.trim();
            if (listItemContent === '' || listItemContent === '\u00A0') {
              // Check if we're in a nested list (sublist)
              const isNestedList = list.parentNode && list.parentNode.nodeName === 'LI';
              
              if (isNestedList) {
                // We're in a sublist - remove empty item and exit completely from all lists
                const parentListItem = list.parentNode;
                let topLevelList = parentListItem.parentNode;
                
                // Find the top-level list by going up the hierarchy
                while (topLevelList.parentNode && topLevelList.parentNode.nodeName === 'LI') {
                  topLevelList = topLevelList.parentNode.parentNode;
                }
                
                // Remove the empty sublist item
                listItem.remove();
                
                // If the sublist is now empty, remove it entirely
                if (list.children.length === 0) {
                  list.remove();
                }
                
                // Create paragraph after the top-level list
                const paragraph = document.createElement('p');
                paragraph.innerHTML = '<br>';
                
                if (topLevelList.nextSibling) {
                  topLevelList.parentNode.insertBefore(paragraph, topLevelList.nextSibling);
                } else {
                  topLevelList.parentNode.appendChild(paragraph);
                }
                
                // Move cursor to new paragraph
                const newRange = document.createRange();
                newRange.setStart(paragraph, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              } else {
                // We're in a top-level list - exit to paragraph
                const paragraph = document.createElement('p');
                paragraph.innerHTML = '<br>';
                
                // Remove the empty list item
                listItem.remove();
                
                // If the list is now empty, remove it entirely
                if (list.children.length === 0) {
                  const listParent = list.parentNode;
                  list.remove();
                  
                  if (listParent) {
                    listParent.appendChild(paragraph);
                  } else {
                    editorRef.current.appendChild(paragraph);
                  }
                } else {
                  // List still has items, insert paragraph after the list
                  if (list.nextSibling) {
                    list.parentNode.insertBefore(paragraph, list.nextSibling);
                  } else {
                    list.parentNode.appendChild(paragraph);
                  }
                }
                
                // Move cursor to new paragraph
                const newRange = document.createRange();
                newRange.setStart(paragraph, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } else {
              // Create new list item
              const newLi = document.createElement('li');
              newLi.innerHTML = '<br>';
              
              // Insert after current list item
              if (listItem.nextSibling) {
                list.insertBefore(newLi, listItem.nextSibling);
              } else {
                list.appendChild(newLi);
              }
              
              // Move cursor to new list item
              const newRange = document.createRange();
              newRange.setStart(newLi, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
            
            updateContent();
            if (onChange) onChange(editorRef.current?.innerHTML || '');
            return;
          }
        }
      }
      
      if (e.shiftKey) {
        e.preventDefault();
        document.execCommand('insertLineBreak'); // or 'insertHTML', '<br><br>'
        return;
      } else {
        e.preventDefault();
        if(onEnter){
          onEnter(e);
        }else{
          document.execCommand('insertLineBreak');
        }
        return;
      }
    }
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
      // Make sure user can type after a trailing blockquote
      const trailing = ensureTrailingParagraph(editorRef);
      if (trailing) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(trailing, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    // Ordered List: Ctrl+Shift+L or Ctrl+Shift+7
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'l' || e.key === '7')) {
      e.preventDefault();
      const nested = createNestedListUnderCurrentLI('ordered');
      if (!nested) {
        document.execCommand('insertOrderedList');
        updateContent();
        if (onChange) onChange(editorRef.current?.innerHTML || '');
      }
    }
    // Unordered List: Ctrl+Shift+O or Ctrl+Shift+8
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'o' || e.key === '8')) {
      e.preventDefault();
      const nested = createNestedListUnderCurrentLI('unordered');
      if (!nested) {
        document.execCommand('insertUnorderedList');
        updateContent();
        if (onChange) onChange(editorRef.current?.innerHTML || '');
      }
    }
    // Code Block: Ctrl+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handleInsertCodeBlock();
    }
    // Copy: Ctrl+C - Let the default copy behavior work with our custom handler
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      // Don't prevent default - let our handleCopy function handle it
      // The handleCopy function will preserve hyperlink formatting
    }
  };

  // Clear formatting
  const handleClearFormatting = () => {
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    document.execCommand('formatBlock', false, 'div');
    updateContent();
  };

  // Create or focus a nested list under the current LI and move caret into a new nested item
  const createNestedListUnderCurrentLI = (listType) => {
    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return false;
      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      while (node && node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const currentLi = node && (node.nodeName === 'LI' ? node : (node.closest && node.closest('li')));
      if (!currentLi) return false;
      const nestedTag = listType === 'ordered' ? 'OL' : 'UL';
      let nestedList = null;
      for (let i = 0; i < currentLi.childNodes.length; i++) {
        const child = currentLi.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE && child.nodeName === nestedTag) {
          nestedList = child;
          break;
        }
      }
      if (!nestedList) {
        nestedList = document.createElement(nestedTag);
        while (currentLi.firstChild) currentLi.removeChild(currentLi.firstChild);
        currentLi.appendChild(nestedList);
        currentLi.style.listStyleType = 'none';
        currentLi.style.paddingLeft = '0';
      }
      const nestedItem = document.createElement('li');
      nestedItem.innerHTML = '<br>';
      nestedList.appendChild(nestedItem);
      const newRange = document.createRange();
      newRange.setStart(nestedItem, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      updateContent();
      if (onChange) onChange(editorRef.current?.innerHTML || '');
      return true;
    } catch {
      return false;
    }
  };

  // Insert code block
  const handleInsertCodeBlock = () => {
    // Ensure editor is focused
    if (document.activeElement !== editorRef.current) {
      editorRef.current.focus();
      // Move caret to end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Create code block element
    const codeBlock = document.createElement('pre');
    codeBlock.className = 'tf-code-block';
    codeBlock.contentEditable = 'true';
    codeBlock.style.cssText = `
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 12px;
      margin: 8px 0 0 0;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
      color: var(--text-primary);
    `;

    // Add placeholder text
    const placeholder = document.createTextNode('// Enter your code here...');
    codeBlock.appendChild(placeholder);

    // Insert the code block
    range.insertNode(codeBlock);

    // Insert a new line after code block
    const newLine = document.createElement('div');
    newLine.appendChild(document.createElement('br'));
    codeBlock.parentNode.insertBefore(newLine, codeBlock.nextSibling);

    // Move cursor inside the code block (not after)
    range.selectNodeContents(codeBlock);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    // Focus on the code block
    codeBlock.focus();

    updateContent();
    if (onChange) onChange(editorRef.current?.innerHTML || '');
  };

  // Handle paste for images and code
  const handlePaste = async (e) => {
    if (!e.clipboardData) return;
    const items = Array.from(e.clipboardData.items);
    let handled = false;
    for (const item of items) {
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          if (file.type.startsWith('image') || file.type.startsWith('video')) {
            await handleInsertMedia(file, file.type);
            handled = true;
          }
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

    // Handle code paste - detect if it looks like code
    if (text && (text.includes('function') || text.includes('const ') || text.includes('let ') || 
        text.includes('var ') || text.includes('if (') || text.includes('for (') || 
        text.includes('class ') || text.includes('import ') || text.includes('export ') ||
        text.includes('{') || text.includes('}') || text.includes(';') || 
        text.includes('console.') || text.includes('return ') || text.includes('=>'))) {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      
      // Create code block
      const codeBlock = document.createElement('pre');
      codeBlock.className = 'tf-code-block';
      codeBlock.contentEditable = 'true';
      codeBlock.textContent = text;
      
      // Insert code block
      range.insertNode(codeBlock);
      
      // Insert a new line after code block
      const newLine = document.createElement('div');
      newLine.appendChild(document.createElement('br'));
      codeBlock.parentNode.insertBefore(newLine, codeBlock.nextSibling);
      
      // Move cursor to the new line
      range.setStart(newLine, 0);
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
    const editorEl = editorRef.current;
    if (editorEl && typeof value === 'string' && editorEl.innerHTML !== value) {
      const hadFocus = document.activeElement === editorEl;
      const savedOffset = hadFocus ? getCaretOffset(editorEl) : null;

      editorEl.innerHTML = value;
      updateContent();

      if (hadFocus && savedOffset != null) {
        // Restore caret as close as possible to previous position
        restoreCaretAtOffset(editorEl, savedOffset);
        editorEl.focus();
      }

      // Process existing media for fullscreen functionality
      if (mediaFullscreen) {
        processExistingMedia();
      }
    }
  }, [value, mediaFullscreen]);

  // Process existing media when component mounts or mediaFullscreen changes
  React.useEffect(() => {
    if (mediaFullscreen && editorRef.current) {
      // Small delay to ensure content is loaded
      setTimeout(() => {
        processExistingMedia();
      }, 100);
    }
  }, [mediaFullscreen]);

  // Process existing media in editor content to add fullscreen functionality
  const processExistingMedia = () => {
    if (!editorRef.current || !mediaFullscreen) return;

    const images = editorRef.current.querySelectorAll('img');
    const videos = editorRef.current.querySelectorAll('video');

    // Process images
    images.forEach(img => {
      if (img.dataset.tfMediaListenerAttached !== 'true') {
        if (!img.classList.contains('tf-processed-media')) {
          img.classList.add('tf-processed-media');
        }
        img.style.cursor = 'pointer';
        const onClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          showMediaFullscreen(img.src, 'image');
        };
        img.addEventListener('click', onClick);
        img.dataset.tfMediaListenerAttached = 'true';
      }
    });

    // Process videos
    videos.forEach(video => {
      if (video.dataset.tfMediaListenerAttached !== 'true') {
        if (!video.classList.contains('tf-processed-media')) {
          video.classList.add('tf-processed-media');
        }
        video.style.cursor = 'pointer';
        const onClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          showMediaFullscreen(video.src, 'video');
        };
        video.addEventListener('click', onClick);
        video.dataset.tfMediaListenerAttached = 'true';
      }
    });
  };

  // Show media in fullscreen overlay
  const showMediaFullscreen = (src, type) => {
    const overlay = document.createElement('div');
    overlay.className = 'tf-media-fullscreen-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.85);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 24px;
      right: 32px;
      z-index: 100000;
      background: rgba(30,30,30,0.7);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 28px;
      padding: 2px 16px;
      cursor: pointer;
    `;
    closeButton.setAttribute('aria-label', 'Close preview');

    const closeOverlay = () => {
      document.body.removeChild(overlay);
    };

    closeButton.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeOverlay();
      }
    });

    let mediaElement;
    if (type === 'image') {
      mediaElement = document.createElement('img');
      mediaElement.src = src;
      mediaElement.alt = 'media preview';
      mediaElement.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        border-radius: 8px;
        box-shadow: 0 4px 32px rgba(0,0,0,0.25);
      `;
    } else if (type === 'video') {
      mediaElement = document.createElement('video');
      mediaElement.src = src;
      mediaElement.controls = true;
      mediaElement.autoPlay = true;
      mediaElement.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        border-radius: 8px;
        box-shadow: 0 4px 32px rgba(0,0,0,0.25);
        background: #000;
      `;
    }

    if (mediaElement) {
      mediaElement.addEventListener('click', (e) => e.stopPropagation());
      overlay.appendChild(mediaElement);
    }

    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);
  };

  // Listen for selection change to update code block active state
  React.useEffect(() => {
    const handleSelectionChange = () => {
      setIsFocused(document.activeElement === editorRef.current);
      setIsCodeBlockActiveState(isCodeBlockActive(editorRef));
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  // Simplified capture-phase listener - only handle when inside a mention/link
  React.useEffect(() => {
    const handleMentionLinkDeletion = (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          let currentNode = range.startContainer;
          
          // Only handle if we're inside a mention/link element
          let parentNode = currentNode;
          while (parentNode && parentNode !== editorRef.current) {
            if (parentNode.classList && (parentNode.classList.contains('tf-mention') || parentNode.classList.contains('tf-link'))) {
              e.preventDefault();
              e.stopPropagation();
              if (e.key === 'Backspace' && parentNode.classList.contains('tf-mention')) {
                shrinkMentionByOneWord(parentNode);
              } else {
                parentNode.remove();
              }
              updateContent();
              if (onChange) onChange(editorRef.current?.innerHTML || '');
              return;
            }
            parentNode = parentNode.parentNode;
          }
        }
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('keydown', handleMentionLinkDeletion, true);
      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener('keydown', handleMentionLinkDeletion, true);
        }
      };
    }
  }, [onChange]);

  // Add click event listener to make mentions and links selectable for deletion
  React.useEffect(() => {
    const handleMentionLinkClick = (e) => {
      const target = e.target;
      if (target.classList && (target.classList.contains('tf-mention') || target.classList.contains('tf-link'))) {
        // Select the entire mention/link element
        const range = document.createRange();
        range.selectNode(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('click', handleMentionLinkClick);
      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener('click', handleMentionLinkClick);
        }
      };
    }
  }, []);


  return (
    <div
      className={`tf-editor-container${theme === 'dark' ? ' tf-dark' : ''}`}
    >
      <div
        ref={editorRef}
        className={`tf-editor-area${isDragOver ? ' tf-dropzone-active' : ''}`}
        contentEditable
        spellCheck={true}
        onMouseDown={(e) => {
          const editorEl = editorRef.current;
          if (!editorEl) return;
          // If the user clicks on the empty area of the editor (container itself)
          if (e.target === editorEl) {
            const trailing = ensureTrailingParagraph(editorRef);
            if (trailing) {
              e.preventDefault();
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(trailing, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        }}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          // Don't blur if clicking on toolbar buttons
          if (e.relatedTarget && e.relatedTarget.closest('.tf-toolbar')) {
            return;
          }
          setIsFocused(false);
          setToolbarRerender(v => v + 1);
        }}
        suppressContentEditableWarning
        aria-label="Rich text editor"
      >
        {renderMedia()}
      </div>
      <Toolbar
        key={toolbarRerender}
        theme={theme}
        onInsertMedia={handleInsertMedia}
        onInsertEmoji={handleInsertEmoji}
        onClearFormatting={handleClearFormatting}
        onInsertCodeBlock={handleInsertCodeBlock}
        isFocused={isFocused}
        isCodeBlockActive={isCodeBlockActiveState}
      />
      {showMention && (
        <MentionList
          suggestions={mentionSuggestions}
          onSelect={insertMention}
          position={mentionPos}
        />
      )}
      {showEmojiPicker && (
        <EmojiPicker
          searchQuery={emojiSearchQuery}
          onSelect={handleInsertEmoji}
          position={emojiPos}
          theme={theme}
        />
      )}
    </div>
  );
} 