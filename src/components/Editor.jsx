import React, { useState } from 'react';
import Tooltip from './Tooltip';
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

// Check if current selection fully covers the editor contents
function selectionCoversEntireEditor(editorRef) {
  try {
    const editor = editorRef?.current;
    if (!editor) return false;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
    if (range.collapsed) return false;

    // Compute text before selection
    const before = document.createRange();
    before.selectNodeContents(editor);
    before.setEnd(range.startContainer, range.startOffset);
    const beforeText = (before.toString() || '').replace(/\u00A0/g, '').trim();

    // Compute text after selection
    const after = document.createRange();
    after.selectNodeContents(editor);
    after.setStart(range.endContainer, range.endOffset);
    const afterText = (after.toString() || '').replace(/\u00A0/g, '').trim();

    return beforeText === '' && afterText === '';
  } catch {
    return false;
  }
}

// Clear editor to a single empty paragraph and place caret
function clearEditorToEmptyParagraph(editorRef, updateContent, onChange) {
  const editor = editorRef?.current;
  if (!editor) return;
  editor.innerHTML = '';
  const paragraph = document.createElement('div');
  paragraph.appendChild(document.createElement('br'));
  editor.appendChild(paragraph);
  const sel = window.getSelection();
  const range = document.createRange();
  range.setStart(paragraph, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  updateContent();
  if (onChange) onChange(editorRef.current?.innerHTML || '');
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

export default function Editor({
  theme = 'light',
  onMediaUpload,
  mentions = [],
  onChange,
  value,
  onEnter,
  mediaFullscreen = false,
  smartToolbar = false,
  defaultShowToolbar = true,
  toggleButtonPosition = 'bottom-right',
  className = '',
  style = {}
}) {
  const { editorRef, html, updateContent } = useEditor();
  const [showToolbar, setShowToolbar] = useState(defaultShowToolbar);
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
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
    // Find the container (LI if in list, or current block)
    let container = range.startContainer;
    while (container && container.nodeType !== Node.ELEMENT_NODE) {
      container = container.parentNode;
    }
    const listItem = container?.closest('li');
    const textContainer = listItem || container || editorRef.current;
    
    let text = '';
    let curr = range.startContainer;
    let offset = range.startOffset;
    if (curr.nodeType === Node.TEXT_NODE) {
      text = curr.textContent.slice(0, offset);
      curr = curr.previousSibling;
    }
    // Walk backwards through siblings, but stop at container boundary
    while (curr && textContainer.contains(curr)) {
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
      // Remove entire mention using execCommand to maintain undo history
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNode(mentionEl);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete', false, null);
      } catch {
        // Fallback: direct removal
        mentionEl.remove();
      }
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
    
    // Find the parent container (LI if in list, or current block)
    let container = range.startContainer;
    while (container && container.nodeType !== Node.ELEMENT_NODE) {
      container = container.parentNode;
    }
    
    // If we're in a list item, use the LI as container; otherwise use the current element
    const listItem = container?.closest('li');
    const searchContainer = listItem || container || editorRef.current;
    
    // Get plain text before cursor (same logic as handleKeyUp)
    let text = '';
    let curr = range.startContainer;
    let offset = range.startOffset;
    if (curr.nodeType === Node.TEXT_NODE) {
      text = curr.textContent.slice(0, offset);
      curr = curr.previousSibling;
    }
    while (curr) {
      if (curr.nodeType === Node.TEXT_NODE) text = curr.textContent + text;
      else if (curr.nodeType === Node.ELEMENT_NODE && !curr.classList?.contains('tf-mention')) {
        if (curr.nodeName === 'BR') {
          text = '\n' + text;
        } else {
          text = curr.textContent + text;
        }
      }
      curr = curr.previousSibling;
    }
    
    // Find the @ symbol in the extracted text
    const atIdx = text.lastIndexOf('@');
    if (atIdx !== -1) {
      // Use TreeWalker to find all text nodes in order and locate @ position
      const deleteRange = document.createRange();
      let charCount = 0;
      let foundAt = false;
      let atNode = null;
      let atOffset = 0;
      let cursorNode = null;
      let cursorOffset = 0;
      
      // Create TreeWalker to traverse all text nodes in the container
      const walker = document.createTreeWalker(
        searchContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip text nodes inside mention spans
            let parent = node.parentNode;
            while (parent && parent !== searchContainer) {
              if (parent.classList?.contains('tf-mention')) {
                return NodeFilter.FILTER_REJECT;
              }
              parent = parent.parentNode;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      let textNode;
      while ((textNode = walker.nextNode())) {
        const nodeText = textNode.textContent;
        const nodeLength = nodeText.length;
        
        // Check if cursor is in this node
        if (textNode === range.startContainer && textNode.nodeType === Node.TEXT_NODE) {
          cursorNode = textNode;
          cursorOffset = range.startOffset;
        }
        
        // Check if @ is in this node
        if (!foundAt && charCount + nodeLength >= atIdx) {
          const localAtIdx = atIdx - charCount;
          if (localAtIdx >= 0 && localAtIdx < nodeLength) {
            // Verify the character at this position is actually @
            if (nodeText[localAtIdx] === '@') {
              atNode = textNode;
              atOffset = localAtIdx;
              foundAt = true;
            }
          }
        }
        
        charCount += nodeLength;
      }
      
      // If we found the @, create and delete the range
      if (foundAt && atNode) {
        try {
          deleteRange.setStart(atNode, atOffset);
          if (cursorNode) {
            deleteRange.setEnd(cursorNode, cursorOffset);
          } else {
            deleteRange.setEnd(range.startContainer, range.startOffset);
          }
          
          deleteRange.deleteContents();
          
          // After deleteContents(), the range automatically points to where deletion ended
          // This is exactly where we want to insert the mention (where @ was)
          const newSel = window.getSelection();
          newSel.removeAllRanges();
          
          // Use the deleteRange's position directly - it's already at the right place
          deleteRange.collapse(true);
          newSel.addRange(deleteRange);
        } catch (e) {
          // Fallback: try simpler approach on current text node
          const textNode = range.startContainer;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const textContent = textNode.textContent;
            const atPos = textContent.lastIndexOf('@');
            if (atPos !== -1 && atPos < range.startOffset) {
              const fallbackRange = document.createRange();
              fallbackRange.setStart(textNode, atPos);
              fallbackRange.setEnd(textNode, range.startOffset);
              fallbackRange.deleteContents();
              
              // After deleteContents(), the range points to where deletion ended
              const newSel = window.getSelection();
              newSel.removeAllRanges();
              fallbackRange.collapse(true);
              newSel.addRange(fallbackRange);
            }
          }
        }
      }
    }
    
    // Get the current selection (should be set correctly after deletion above)
    let finalSel = window.getSelection();
    if (!finalSel.rangeCount) {
      // Fallback: if selection was lost, try to recreate it
      finalSel = window.getSelection();
      const newRange = document.createRange();
      
      // Try to use the original range position
      const textNode = range.startContainer;
      if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode) {
        const atPos = textNode.textContent.lastIndexOf('@');
        if (atPos !== -1) {
          newRange.setStart(textNode, atPos);
        } else {
          newRange.setStart(textNode, Math.min(range.startOffset, textNode.textContent.length));
        }
      } else if (textNode.parentNode) {
        // Find first text node in parent
        const walker = document.createTreeWalker(
          textNode.parentNode,
          NodeFilter.SHOW_TEXT,
          null
        );
        const firstTextNode = walker.nextNode();
        if (firstTextNode) {
          newRange.setStart(firstTextNode, 0);
        } else {
          newRange.setStart(textNode.parentNode, 0);
        }
      } else if (editorRef.current) {
        newRange.setStart(editorRef.current, 0);
      }
      
      newRange.collapse(true);
      finalSel.removeAllRanges();
      finalSel.addRange(newRange);
    }
    
    // Create mention element directly using DOM (more reliable than execCommand)
    const mentionSpan = document.createElement('span');
    mentionSpan.className = 'tf-mention';
    mentionSpan.setAttribute('contenteditable', 'false');
    mentionSpan.setAttribute('data-id', user.id.toString());
    mentionSpan.setAttribute('data-value', user.name);
    if (user.profile_pic) {
      mentionSpan.setAttribute('data-profile-pic', user.profile_pic);
    }
    mentionSpan.textContent = `@${user.name}`;
    
    // Insert mention and zero-width space
    if (finalSel.rangeCount) {
      const insertRange = finalSel.getRangeAt(0);
      
      // Insert mention span
      insertRange.insertNode(mentionSpan);
      
      // Insert zero-width space after mention
      const zws = document.createTextNode('\u200B');
      insertRange.setStartAfter(mentionSpan);
      insertRange.collapse(true);
      insertRange.insertNode(zws);
      
      // Move cursor after zero-width space
      insertRange.setStartAfter(zws);
      insertRange.collapse(true);
      finalSel.removeAllRanges();
      finalSel.addRange(insertRange);
    }
    
    setShowMention(false);
    setMentionQuery('');
    setJustSelectedMention(true);
    updateContent();
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    
    // Ensure cursor is positioned correctly
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
      if (editorRef.current) {
        editorRef.current.focus();
      }
      
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
        // Editor is empty, just insert emoji using execCommand
        document.execCommand('insertHTML', false, emoji + '\u200B');
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
      
      // Insert the emoji using execCommand to maintain undo history with zero-width space
      document.execCommand('insertHTML', false, emoji + '\u200B');
      
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
      // Fallback: just insert emoji using execCommand
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand('insertHTML', false, emoji + '\u200B');
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
      
      // Create loading skeleton at cursor position
      const id = genId();
      const skeletonHTML = `<div class="tf-media-block tf-media-skeleton tf-media-skeleton-${type.startsWith('image') ? 'img' : 'video'}" data-loading-id="${id}">
        <div class="tf-skeleton-anim" style="width: 100%; height: ${type.startsWith('image') ? 180 : 180}px; border-radius: 6px; background: #f0f0f0; animation: pulse 1.5s ease-in-out infinite;"></div>
      </div><div><br></div>`;
      
      // Insert skeleton using execCommand to maintain undo history
      document.execCommand('insertHTML', false, skeletonHTML);
      
      setMediaLoading(m => [...m, { id, type }]);
      
      let url = '';
      if (onMediaUpload) {
        const result = await onMediaUpload(file, type);
        url = result?.url;
      } else {
        url = await fileToBase64(file);
      }
      
      setMediaLoading(m => m.filter(item => item.id !== id));
      
      // Find the skeleton element by data-loading-id
      const skeletonBlock = editorRef.current?.querySelector(`[data-loading-id="${id}"]`);
      
      if (url && skeletonBlock) {
        // Create media HTML
        let mediaHTML = '';
        if (type.startsWith('image')) {
          const cursorStyle = mediaFullscreen ? 'cursor: pointer;' : '';
          mediaHTML = `<div class="tf-media-block"><img src="${url}" alt="uploaded image" style="max-width: 100%; height: auto; border-radius: 6px; display: block; ${cursorStyle}"></div>`;
        } else {
          const cursorStyle = mediaFullscreen ? 'cursor: pointer;' : '';
          mediaHTML = `<div class="tf-media-block"><video src="${url}" controls style="max-width: 100%; height: auto; border-radius: 6px; display: block; ${cursorStyle}"></video></div>`;
        }
        
        // Replace skeleton with media block
        skeletonBlock.outerHTML = mediaHTML;
        
        // Process media for fullscreen if enabled
        if (mediaFullscreen) {
          setTimeout(() => {
            processExistingMedia();
          }, 0);
        }
        
        // Update content and trigger onChange
        setTimeout(() => {
          if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
          editorRef.current.focus();
        }, 0);
      } else if (skeletonBlock) {
        // Remove skeleton if upload failed
        skeletonBlock.remove();
      }
    } catch (error) {
      console.error('Error in handleInsertMedia:', error);
      setMediaLoading(m => m.filter(item => item.type !== type));
    }
  };


  // Sync content on input
  const handleInput = () => {
    // Normalize legacy list containers that hide markers and break numbering
    try {
      if (editorRef.current) {
        const ols = editorRef.current.querySelectorAll('ol');
        ols.forEach(ol => {
          const items = Array.from(ol.children || []);
          items.forEach(li => {
            if (li && li.nodeName === 'LI') {
              const onlySublist = li.childElementCount === 1 && (li.firstElementChild?.nodeName === 'UL' || li.firstElementChild?.nodeName === 'OL');
              const hasHiddenMarker = (li.getAttribute('style') || '').includes('list-style-type: none');
              const noText = (li.textContent || '').replace(/\u00A0/g, '').trim() === '';
              if ((onlySublist && (hasHiddenMarker || noText)) && li.previousElementSibling && li.previousElementSibling.nodeName === 'LI') {
                // Move sublist under previous LI and remove this empty container LI
                const sub = li.firstElementChild;
                li.previousElementSibling.appendChild(sub);
                li.remove();
              }
            }
          });
        });
      }
    } catch {}
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
    // If everything inside the editor is selected, a single Backspace/Delete clears all
    if ((e.key === 'Backspace' || e.key === 'Delete') && selectionCoversEntireEditor(editorRef)) {
      e.preventDefault();
      // Use execCommand to maintain undo history
      document.execCommand('delete', false, null);
      // Ensure editor has at least one empty paragraph for cursor
      setTimeout(() => {
        const editor = editorRef.current;
        if (editor && (!editor.firstChild || editor.textContent.trim() === '')) {
          editor.appendChild(paragraph);
          const sel = window.getSelection();
          const range = document.createRange();
          range.setStart(paragraph, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        updateContent();
        if (onChange) onChange(editorRef.current?.innerHTML || '');
      }, 0);
      return;
    }
    // Handle backspace and delete for mentions and links
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Backspace at start of code block → remove code block
        if (e.key === 'Backspace') {
          try {
            let node = range.startContainer;
            while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
            const codeBlock = node && (node.classList && node.classList.contains('tf-code-block')
              ? node
              : (node.closest && node.closest('pre.tf-code-block')));
            if (codeBlock) {
              const probe = document.createRange();
              probe.setStart(codeBlock, 0);
              probe.setEnd(range.startContainer, range.startOffset);
              const isAtStart = (probe.toString() || '').length === 0;
              if (isAtStart) {
                e.preventDefault();
                const paragraph = document.createElement('p');
                paragraph.innerHTML = '<br>';
                codeBlock.parentNode.insertBefore(paragraph, codeBlock);
                codeBlock.remove();
                const newRange = document.createRange();
                newRange.setStart(paragraph, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                updateContent();
                if (onChange) onChange(editorRef.current?.innerHTML || '');
                return;
              }
            }
          } catch {}
        }

        // Backspace at start of a list item → convert that item to a normal paragraph
        if (e.key === 'Backspace') {
          try {
            // Find enclosing LI
            let liNode = range.startContainer;
            while (liNode && liNode.nodeType === Node.TEXT_NODE) liNode = liNode.parentNode;
            liNode = liNode && (liNode.nodeName === 'LI' ? liNode : (liNode.closest && liNode.closest('li')));
            const parentList = liNode && liNode.parentNode;
            if (liNode && parentList && (parentList.nodeName === 'OL' || parentList.nodeName === 'UL')) {
              // Determine if caret is at absolute start of this LI
              const probe = document.createRange();
              probe.setStart(liNode, 0);
              probe.setEnd(range.startContainer, range.startOffset);
              const atStartOfLi = (probe.toString() || '').replace(/\u00A0/g, '').trim() === '';
              if (atStartOfLi) {
                e.preventDefault();
                // Create paragraph; we'll insert it OUTSIDE the OL/UL to avoid list styling bleed
                const paragraph = document.createElement('p');
                paragraph.innerHTML = '';

                // Move inline content (non-list children) into paragraph
                const toMove = [];
                Array.from(liNode.childNodes).forEach((child) => {
                  if (child.nodeType === Node.ELEMENT_NODE && (child.nodeName === 'UL' || child.nodeName === 'OL')) return;
                  toMove.push(child);
                });
                if (toMove.length === 0) paragraph.innerHTML = '<br>';
                else toMove.forEach(n => paragraph.appendChild(n));

                // Determine LI index within its list
                const liIndex = Array.prototype.indexOf.call(parentList.children, liNode);

                // Collect remaining sublists from current LI to be placed after the paragraph
                const liSublists = Array.from(liNode.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE && (n.nodeName === 'UL' || n.nodeName === 'OL'));

                // If there are following LIs, move them to a new list and insert after paragraph
                const followingLis = [];
                for (let sib = liNode.nextSibling; sib; ) {
                  const next = sib.nextSibling;
                  if (sib.nodeName === 'LI') followingLis.push(sib);
                  sib = next;
                }

                let newList = null;
                if (followingLis.length > 0) {
                  newList = document.createElement(parentList.nodeName);
                  followingLis.forEach(li => newList.appendChild(li));
                }

                // Remove the LI from its list
                liNode.remove();

                // Insert paragraph outside the list at the correct position
                const listParent = parentList.parentNode;
                if (liIndex === 0) {
                  // Insert before the list
                  listParent.insertBefore(paragraph, parentList);
                } else {
                  // Insert after the list (we keep previous LIs in original list)
                  if (parentList.nextSibling) listParent.insertBefore(paragraph, parentList.nextSibling);
                  else listParent.appendChild(paragraph);
                }

                // Append any sublists from the LI after the paragraph
                liSublists.forEach(sub => {
                  if (paragraph.nextSibling) listParent.insertBefore(sub, paragraph.nextSibling);
                  else listParent.appendChild(sub);
                });

                // If we created a new list from following items, place it after the paragraph/sublist
                if (newList) {
                  if (paragraph.nextSibling) listParent.insertBefore(newList, paragraph.nextSibling);
                  else listParent.appendChild(newList);
                }

                // If parent list becomes empty, remove it
                if (parentList.children.length === 0) {
                  parentList.remove();
                }

                // Place caret in the paragraph
                const newRange = document.createRange();
                newRange.selectNodeContents(paragraph);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                updateContent();
                if (onChange) onChange(editorRef.current?.innerHTML || '');
                return;
              }
            }
          } catch {}
        }
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
            // Check if cursor is in a zero-width space node (inserted after mentions)
            if (range.collapsed && currentNode.nodeType === Node.TEXT_NODE) {
              // Check if this is a zero-width space node
              const isZeroWidthSpace = currentNode.textContent === '\u200B' || 
                                      (currentNode.textContent.length === 1 && currentNode.textContent.charCodeAt(0) === 0x200B);
              
              if (isZeroWidthSpace) {
                // Check previous sibling for mention/link
                let prevSibling = currentNode.previousSibling;
                if (prevSibling && isMentionOrLink(prevSibling)) {
                  return prevSibling;
                }
              }
              
              // Check if cursor is at the start of a text node (might be after zero-width space was deleted)
              if (range.startOffset === 0) {
                let prevSibling = currentNode.previousSibling;
                if (prevSibling && isMentionOrLink(prevSibling)) {
                  return prevSibling;
                }
              }
            }
            
            // Check if we're at element boundary immediately after a mention/link
            if (range.collapsed && currentNode.nodeType === Node.ELEMENT_NODE && range.startOffset > 0) {
              const prevChild = currentNode.childNodes[range.startOffset - 1];
              if (prevChild && isMentionOrLink(prevChild)) {
                return prevChild;
              }
              // Also check if previous child is a zero-width space, then check its previous sibling
              if (prevChild && prevChild.nodeType === Node.TEXT_NODE) {
                const textContent = prevChild.textContent;
                const isZeroWidthSpace = textContent === '\u200B' || 
                                        (textContent.length === 1 && textContent.charCodeAt(0) === 0x200B);
                if (isZeroWidthSpace) {
                  const mentionSibling = prevChild.previousSibling;
                  if (mentionSibling && isMentionOrLink(mentionSibling)) {
                    return mentionSibling;
                  }
                }
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
            // Use execCommand to maintain undo history
            try {
              const sel = window.getSelection();
              const deleteRange = document.createRange();
              deleteRange.selectNode(elementToDelete);
              sel.removeAllRanges();
              sel.addRange(deleteRange);
              document.execCommand('delete', false, null);
            } catch {
              // Fallback: direct removal
              elementToDelete.remove();
            }
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
    // Toggle Toolbar: Ctrl+Shift+F
    if (smartToolbar && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowToolbar(prev => !prev);
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

    // Create code block HTML
    const codeBlockHTML = `<pre class="tf-code-block" contenteditable="true" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; margin: 8px 0 0 0; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; overflow-x: auto; color: var(--text-primary);">// Enter your code here...</pre><div><br></div>`;

    // Insert using execCommand to maintain undo history
    document.execCommand('insertHTML', false, codeBlockHTML);

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
      // Create link HTML with a zero-width space after it to ensure cursor can move there
      const linkHTML = `<a href="${text}" target="_blank" rel="noopener noreferrer" class="tf-link" contenteditable="false">${text}</a>\u200B`;
      // Insert using execCommand to maintain undo history
      document.execCommand('insertHTML', false, linkHTML);
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
      
      // Escape HTML entities in code text
      const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Create code block HTML
      const codeBlockHTML = `<pre class="tf-code-block" contenteditable="true">${escapedText}</pre><div><br></div>`;
      
      // Insert using execCommand to maintain undo history
      document.execCommand('insertHTML', false, codeBlockHTML);
      
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
        // If full editor selection is active, clear all in one go
        if (selectionCoversEntireEditor(editorRef)) {
          e.preventDefault();
          e.stopPropagation();
          // Use execCommand to maintain undo history
          document.execCommand('delete', false, null);
          // Ensure editor has at least one empty paragraph for cursor
          setTimeout(() => {
            const editor = editorRef.current;
            if (editor && (!editor.firstChild || editor.textContent.trim() === '')) {
              editor.appendChild(paragraph);
              const sel = window.getSelection();
              const range = document.createRange();
              range.setStart(paragraph, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
            updateContent();
            if (onChange) onChange(editorRef.current?.innerHTML || '');
          }, 0);
          return;
        }
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
                // Use execCommand to maintain undo history
                try {
                  const deleteRange = document.createRange();
                  deleteRange.selectNode(parentNode);
                  selection.removeAllRanges();
                  selection.addRange(deleteRange);
                  document.execCommand('delete', false, null);
                } catch {
                  // Fallback: direct removal
                  parentNode.remove();
                }
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
      className={`tf-editor-container${theme === 'dark' ? ' tf-dark' : ''} ${className}${smartToolbar ? ' tf-editor-container-smart' : ''}${smartToolbar && !showToolbar ? ' tf-toolbar-collapsed' : ''}${smartToolbar && !showToolbar ? ` tf-toggle-pos-${toggleButtonPosition}` : ''}`}
      style={style}
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
        smartToolbar={smartToolbar}
        showToolbar={showToolbar}
        onToggleToolbar={() => setShowToolbar(prev => !prev)}
        toggleButtonPosition={toggleButtonPosition}
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