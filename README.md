# React Textflux

## 🚀 What's New
- **Production ready:** All major bugs fixed, UX polished
- **Enhanced Emoji Picker:** Type `:` in editor to trigger emoji search, keyboard navigation with arrow keys, auto-scroll, recently used emojis, and category organization
- **Mention dropdown:** Keyboard navigation auto-scrolls, dark/light theme highlight, visible text always
- **Media skeleton loader:** Shows animated skeleton while uploading/inserting images/videos
- **Unified media handling:** Paste, drag-and-drop, and toolbar all use the same upload logic
- **Accessibility:** All dropdowns and toolbars are keyboard accessible
- **CSS isolation:** All classes prefixed with `tf-` (no conflicts)
- **Media fullscreen control:** You can now control whether images/videos are clickable for fullscreen preview using the `mediaFullscreen` prop on the Editor component.
- **Smart cursor positioning:** Cursor automatically moves to the end after inserting media, mentions, or emojis
- **Improved button reliability:** Fixed image/video insert buttons that sometimes didn't work
- **Enhanced error handling:** Better error handling for file operations and media uploads
- **Focus management:** Improved focus handling between editor and toolbar
- **Existing media support:** All existing images/videos in editor content are automatically clickable for fullscreen preview
- **Code block UX:** When you insert a code block, a new line is automatically added after it, but focus stays inside the code block so you can start typing code immediately. Move out of the code block with arrow keys or mouse to continue writing.

---

A minimal, modular, and customizable React rich text editor component with:
- Basic formatting (bold, italic, underline, strikethrough, blockquote, lists)
- @mention with profile pic/initials
- **Enhanced Emoji Picker:** Type `:` to search emojis, keyboard navigation, recently used, categories
- Media rendering (image/video) with fullscreen preview
- **Document file uploads** (PDF, Excel, Word, CSV, etc.) with drag & drop support
- **Code block support with text wrapping and monospace font**
- Dark/light theme support
- Custom upload logic via callback
- **No CSS framework dependency (pure CSS, all classes prefixed with `tf-` for isolation)**
- **Optional fullscreen media preview**
- **Smart cursor positioning for seamless writing experience**
- **Existing media support for fullscreen preview**

---

## Enhanced Emoji Picker

### Trigger Emoji Search
- **Type `:` in editor** to open emoji picker with search functionality
- **Real-time search** as you type after `:` (e.g., `:smile`, `:heart`, `:food`)
- **Keyboard navigation** with arrow keys (↑↓←→) and Enter to select
- **Auto-scroll** keeps selected emoji visible during navigation
- **Escape key** to close emoji picker

### Emoji Categories & Recently Used
- **Recently used emojis** appear at the top for quick access
- **Category organization:** Smileys, Hearts, Food, Animals, Nature, Activity, Travel, Objects
- **Popular emojis** pre-loaded in recently used section
- **Local storage** remembers your frequently used emojis

### Keyboard Navigation
- **Arrow keys** for grid navigation (up/down for rows, left/right for columns)
- **Enter** to select highlighted emoji
- **Escape** to close picker
- **Auto-scroll** follows your navigation smoothly
- **Mouse hover** also updates selection

### Usage Examples
```
Type in editor: ":smile" → Shows all smile-related emojis
Type in editor: ":heart" → Shows all heart/love emojis  
Type in editor: ":food" → Shows all food emojis
```

---

## Code Block Support

- **Insert code blocks** using the toolbar button (</>) or keyboard shortcut `Ctrl+K` (Cmd+K on Mac)
- **Paste code from any IDE** and it will auto-format as a code block
- **Text wrapping** and horizontal scroll for long lines
- **Monospace font** for code clarity
- **Continue typing after code:** After pasting/inserting code, a new line is added so you can keep writing. **Focus remains inside the code block so you can start typing code immediately.**
- **Move out of code block:** Use arrow keys or mouse to move to the new line and continue writing after the code block.
- **Highlighting:** Toolbar button is highlighted when your cursor is inside a code block

> **Tip:** After inserting a code block, just start typing your code. To continue writing outside the code block, use the arrow keys or click on the new line below the code block.

---

## Document File Uploads

### Supported File Types
- **PDF Documents** (.pdf)
- **Microsoft Office** (.doc, .docx, .xls, .xlsx, .ppt, .pptx)
- **Text Files** (.txt)
- **Data Files** (.csv)
- **Archives** (.zip, .rar)

### Upload Methods
- **Drag & Drop:** Simply drag any supported file into the editor
- **Toolbar Button:** Click the file icon (📎) in the toolbar
- **Paste:** Copy a file and paste it into the editor

### File Display
- **File type icons** with appropriate colors for each file type
- **File name** with truncation for long names
- **File size** displayed in human-readable format
- **Download functionality** - click any file to download it
- **Hover effects** with subtle animations

### File Management
- Files are converted to base64 for storage (or use your custom `onMediaUpload` handler)
- Each file shows a download button (⬇️) for easy access
- File blocks are responsive and work on all screen sizes
- Dark theme support for file blocks

---

## Install

```
npm install react-textflux
```

---

## Usage

```jsx
// Only default import is supported:
import Editor from 'react-textflux';
import "react-textflux/dist/react-textflux.css";
function App() {
  // Example: controlled usage with backend value
  const [description, setDescription] = React.useState('');

  // Simulate fetching from backend
  React.useEffect(() => {
    // fetch description from backend
    setTimeout(() => setDescription('<p>Initial <b>description</b> from backend</p>'), 1000);
  }, []);

  // Example: custom upload logic (S3, base64, etc.)
  const handleMediaUpload = async (file, type) => {
    // Upload file to your server or S3, return { url, type, name }
    // Or fallback to base64:
    const toBase64 = file => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    const url = await toBase64(file);
    return { url, type, name: file.name };
  };

  // Example: mention data
  const mentions = [
    { id: 1, name: 'John Doe', profile_pic: 'https://example.com/john.jpg' },
    { id: 2, name: 'Jane Smith', profile_pic: 'https://example.com/jane.jpg' },
    { id: 3, name: 'Bob Johnson' } // without profile_pic
  ];

  // Example: custom API call and clear on Enter
  const handleEnter = async (e) => {
    // 1. API call
    await fetch('/your-api', { method: 'POST', body: JSON.stringify({ content: description }) });
    // 2. Clear editor (controlled mode)
    setDescription('');
    // (Uncontrolled: e.target.innerHTML = '';) 
  };

  return (
    <Editor
      theme="light" // or "dark"
      mentions={mentions}
      onMediaUpload={handleMediaUpload}
      value={description} // controlled value
      onChange={setDescription} // updates state on any content change
      mediaFullscreen={true} // <-- Add this line to enable fullscreen media preview
      onEnter={handleEnter} // <-- Called when Enter is pressed
    />
  );
}
```

> **Note:** The `value` prop makes the editor controlled, just like a textarea. Pass your HTML string to `value`, and update it via `onChange`. All content changes (typing, media insert, mentions, formatting) will trigger `onChange` with the latest HTML.

> **Note:** The `onEnter` prop is called whenever the user presses Enter in the editor. You can use it for custom actions like submitting, saving, or clearing the editor. In controlled mode, clear the editor by setting your value state to ''. In uncontrolled mode, use `e.target.innerHTML = ''` inside onEnter.

---

## Media Fullscreen Preview

- **Media Fullscreen Preview:** Click any image or video in the editor to open a fullscreen overlay preview. Click the close (×) button or outside the media to exit preview.
- **Works with all media:** Both newly inserted and existing media (from database, etc.) are clickable for fullscreen preview when `mediaFullscreen={true}` is enabled.

> **Tip:** You can customize the fullscreen overlay style by editing the relevant CSS in the source.

---

## Smart Cursor Positioning

The editor now automatically positions the cursor in the most logical place after various operations:

- **Media Insertion:** After inserting images/videos via toolbar, drag & drop, or paste, the cursor moves to the end so you can continue typing
- **Mention Insertion:** After selecting a mention from the dropdown, cursor moves to the end
- **Emoji Insertion:** After inserting an emoji, cursor moves to the end with automatic space
- **Seamless Writing:** No more manual cursor positioning - just keep typing naturally
- **Code Block Paste:** After pasting code, a new line is added so you can keep typing outside the code block

---

## Features
- **Formatting:** Bold, Italic, Underline, Strikethrough, Blockquote, Lists
- **@Mention:** User list with profile pic/initials, keyboard navigation, auto-scroll
- **Enhanced Emoji Picker:** Type `:` to search, keyboard navigation, recently used, categories, auto-scroll
- **Media:** Render images/videos (upload logic is up to you), **click to fullscreen preview**
- **Media Skeleton:** Animated skeleton loader while uploading/inserting
- **Code Block:** Insert code blocks via toolbar or Ctrl+K, auto-format on paste, text wrapping, monospace font, **auto new line after code block with focus inside code block**
- **Theme:** Light & dark mode (prop)
- **Keyboard Shortcuts:** Tooltips show shortcuts (e.g. Ctrl+B, Ctrl+K)
- **Custom CSS:** No Tailwind/Bootstrap required
- **CSS Isolation:** All classes prefixed with `tf-` (no conflicts with other frameworks)
- **Dark Theme Polish:** Selected toolbar/mention is deep blue for better contrast
- **Emoji/Mention Scrollbar:** Thin, theme-aware, and modern
- **Accessibility:** All dropdowns and toolbars are keyboard accessible
- **Optional Media Fullscreen:** Enable fullscreen preview for images/videos by setting `mediaFullscreen={true}` on the Editor. If not set, media is not clickable by default.
- **Smart Cursor Positioning:** Automatic cursor positioning after media, mention, emoji, and code block insertion
- **Reliable Button Operation:** Fixed image/video insert buttons for consistent functionality
- **Enhanced Error Handling:** Better error handling and debugging for file operations
- **Existing Media Support:** All existing images/videos in editor content automatically get fullscreen functionality

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Bold | Ctrl+B / Cmd+B |
| Italic | Ctrl+I / Cmd+I |
| Underline | Ctrl+U / Cmd+U |
| Strikethrough | Ctrl+Shift+S / Cmd+Shift+S |
| Blockquote | Ctrl+Q / Cmd+Q |
| Ordered List | Ctrl+Shift+L / Cmd+Shift+L |
| Unordered List | Ctrl+Shift+U / Cmd+Shift+U |
| **Code Block** | **Ctrl+K / Cmd+K** |

### Emoji Navigation
| Action | Key |
|--------|-----|
| Open emoji search | Type `:` in editor |
| Navigate emojis | Arrow keys (↑↓←→) |
| Select emoji | Enter |
| Close picker | Escape |

---

## Props
| Prop                | Type     | Default   | Description |
|---------------------|----------|-----------|-------------|
| `theme`             | string   | 'light'   | 'light' or 'dark' |
| `mentions`          | array    | []        | Array of user objects: `[{id, name, profile_pic?}]` |
| `onMediaUpload`     | function | undefined | Custom upload handler: `(file, type) => Promise<{url, type, name}>` |
| `value`             | string   | undefined | **Controlled value**: HTML string to display in the editor. Use with `onChange` for controlled usage. |
| `onChange`          | function | undefined | Called with latest HTML string on any content change (typing, media, mentions, formatting, etc). |
| `mediaFullscreen`   | boolean  | false     | If true, images/videos are clickable and open in fullscreen overlay. If false or not set, media is not clickable. |
| `onEnter`           | function | undefined | Called with the keyboard event when Enter is pressed in the editor. Use for custom submit, save, or clear logic. |

---

## onEnter: API Call & Clear Example

**Controlled mode:**
```jsx
<Editor
  value={description}
  onChange={setDescription}
  onEnter={async () => {
    await fetch('/api/save', { method: 'POST', body: JSON.stringify({ content: description }) });
    setDescription(''); // clear editor
  }}
/>
```

**Uncontrolled mode:**
```jsx
<Editor
  onEnter={async (e) => {
    await fetch('/api/save', { method: 'POST', body: JSON.stringify({ content: e.target.innerHTML }) });
    e.target.innerHTML = '';
  }}
/>
```

---

## Customization
- **Mentions:** Pass your user list as `mentions` prop
- **Emoji List:** Edit `emojiData.js` to add/modify emojis and categories
- **CSS:** Edit `src/index.css` for full style control (all classes use `tf-` prefix)
- **Toolbar/Theme:** Update colors in `src/index.css` for your brand
- **Media Fullscreen:** Use the `mediaFullscreen` prop to control whether media is clickable for fullscreen preview.

---

## Troubleshooting

### Image/Video Insert Buttons Not Working
- **Fixed in latest version:** The buttons now use proper event handling and should work reliably
- If issues persist, check browser console for error messages
- Ensure file input permissions are granted

### Emoji Picker Not Opening
- **Type `:` in editor** to trigger emoji search
- Ensure no other keyboard shortcuts are conflicting
- Check browser console for any JavaScript errors

### [plugin:vite:import-analysis] Failed to resolve entry for package
- Make sure your `package.json` has correct `main`, `module`, and `exports` fields
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`