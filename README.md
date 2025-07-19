# React Textflux

## 🚀 What's New
- **Production ready:** All major bugs fixed, UX polished
- **Mention dropdown:** Keyboard navigation auto-scrolls, dark/light theme highlight, visible text always
- **Media skeleton loader:** Shows animated skeleton while uploading/inserting images/videos
- **Unified media handling:** Paste, drag-and-drop, and toolbar all use the same upload logic
- **Accessibility:** All dropdowns and toolbars are keyboard accessible
- **CSS isolation:** All classes prefixed with `tf-` (no conflicts)
- **Fullscreen editor:** Toggle fullscreen mode with the button in the top-right corner (maximize/restore icon)
- **Media preview:** Click any image or video in the editor to view it fullscreen in an overlay

---

A minimal, modular, and customizable React rich text editor component with:
- Basic formatting (bold, italic, underline, strikethrough, blockquote, lists)
- @mention with profile pic/initials
- Emoji picker (hundreds of emojis)
- Media rendering (image/video) with fullscreen preview
- Dark/light theme support
- Custom upload logic via callback
- **No CSS framework dependency (pure CSS, all classes prefixed with `tf-` for isolation)**

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

  return (
    <Editor
      theme="light" // or "dark"
      mentions={mentions}
      onMediaUpload={handleMediaUpload}
      value={description} // controlled value
      onChange={setDescription} // updates state on any content change
    />
  );
}
```

> **Note:** The `value` prop makes the editor controlled, just like a textarea. Pass your HTML string to `value`, and update it via `onChange`. All content changes (typing, media insert, mentions, formatting) will trigger `onChange` with the latest HTML.

---

## Fullscreen Editor & Media Preview

- **Editor Fullscreen:** Click the maximize/restore icon in the top-right corner of the editor to toggle fullscreen mode. The editor will expand to fill the viewport for distraction-free writing.
- **Media Fullscreen Preview:** Click any image or video in the editor to open a fullscreen overlay preview. Click the close (×) button or outside the media to exit preview.

> **Tip:** You can customize the fullscreen icons or overlay style by editing the relevant SVG or CSS in the source.

---

## Mentions (@mention)

You can pass your own mention data as a prop:

```jsx
const mentions = [
  { id: 1, name: 'John Doe', profile_pic: 'https://example.com/john.jpg' },
  { id: 2, name: 'Jane Smith', profile_pic: 'https://example.com/jane.jpg' },
  { id: 3, name: 'Bob Johnson' } // without profile_pic
];

<Editor mentions={mentions} />
```

- **id**: unique user id (number or string)
- **name**: user's display name (used for search and display)
- **profile_pic**: (optional) image URL for avatar. If missing or image fails, initials will be shown automatically.

**How it works:**
- When you type `@`, a dropdown appears with user suggestions.
- You can navigate with up/down keys and select with Enter. **Dropdown auto-scrolls to keep selection visible.**
- The mention inserted in the editor will include the user's name and id (and profile_pic if present).

---

## Features
- **Formatting:** Bold, Italic, Underline, Strikethrough, Blockquote, Lists
- **@Mention:** User list with profile pic/initials, keyboard navigation, auto-scroll
- **Emoji Picker:** 200+ emojis, fast search, **outside click to close**
- **Media:** Render images/videos (upload logic is up to you), **click to fullscreen preview**
- **Media Skeleton:** Animated skeleton loader while uploading/inserting
- **Theme:** Light & dark mode (prop)
- **Keyboard Shortcuts:** Tooltips show shortcuts (e.g. Ctrl+B)
- **Custom CSS:** No Tailwind/Bootstrap required
- **CSS Isolation:** All classes prefixed with `tf-` (no conflicts with other frameworks)
- **Dark Theme Polish:** Selected toolbar/mention is deep blue for better contrast
- **Emoji/Mention Scrollbar:** Thin, theme-aware, and modern
- **Accessibility:** All dropdowns and toolbars are keyboard accessible
- **Fullscreen Editor:** Maximize/restore icon in top-right for distraction-free writing
- **Media Fullscreen Preview:** Click any image/video to view fullscreen overlay

---

## Props
| Prop            | Type     | Default   | Description |
|-----------------|----------|-----------|-------------|
| `theme`         | string   | 'light'   | 'light' or 'dark' |
| `mentions`      | array    | []        | Array of user objects: `[{id, name, profile_pic?}]` |
| `onMediaUpload` | function | undefined | Custom upload handler: `(file, type) => Promise<{url, type, name}>` |
| `value`         | string   | undefined | **Controlled value**: HTML string to display in the editor. Use with `onChange` for controlled usage. |
| `onChange`      | function | undefined | Called with latest HTML string on any content change (typing, media, mentions, formatting, etc). |

---

## Customization
- **Mentions:** Pass your user list as `mentions` prop
- **Emoji List:** Edit `Toolbar.jsx` emojis array
- **CSS:** Edit `src/index.css` for full style control (all classes use `tf-` prefix)
- **Toolbar/Theme:** Update colors in `src/index.css` for your brand
- **Fullscreen/Media Overlay:** Customize overlay and icons in `MediaBlock.jsx` and `Editor.jsx`

---

## Troubleshooting

### [plugin:vite:import-analysis] Failed to resolve entry for package
- Make sure your `package.json` has correct `main`, `module`, and `exports` fields.
- Both `dist/index.es.js` and `dist/index.umd.js` must exist after build.

### React Context/JSX Runtime Errors
- Ensure your library's Vite config has:
  ```js
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react/jsx-dev-runtime'
  ]
  ```
- And `output.globals` includes:
  ```js
  globals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    'react/jsx-runtime': 'jsxRuntime',
    'react/jsx-dev-runtime': 'jsxDevRuntime'
  }
  ```
- Consumer app and library must use the **same React version**.

---

## License
MIT
