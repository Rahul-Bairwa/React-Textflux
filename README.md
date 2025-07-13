# Textflux

A minimal, modular, and customizable React rich text editor component with:
- Basic formatting (bold, italic, underline, strikethrough, blockquote, lists)
- @mention with profile pic/initials
- Emoji picker (hundreds of emojis)
- Media rendering (image/video)
- Dark/light theme support
- Custom upload logic via callback
- No CSS framework dependency (pure CSS)

---

## Install

```
npm install Textflux
```

---

## Usage

```jsx
import Editor from 'Textflux';

function App() {
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
    />
  );
}
```

---

## Mentions (@mention)

You can pass your own mention data as a prop:

```jsx
const mentions = [
  { id: 1, name: 'rahul bairwa', profile_pic: 'https://dyzo.fly.dev/welcome.jpg' },
  { id: 2, name: 'sejal dev', profile_pic: 'https://dyzo.fly.dev/welcome.jpg' },
  { id: 3, name: 'tech guru', profile_pic: 'https://dyzo.fly.dev/welcome.jpg' },
  // ...add more users
];

<Editor mentions={mentions} />
```

- **id**: unique user id (number or string)
- **name**: user's display name (used for search and display)
- **profile_pic**: (optional) image URL for avatar. If missing or image fails, initials will be shown automatically.

**How it works:**
- When you type `@`, a dropdown appears with user suggestions.
- You can navigate with up/down keys and select with Enter.
- The mention inserted in the editor will include the user's name and id (and profile_pic if present).

---

## Features
- **Formatting:** Bold, Italic, Underline, Strikethrough, Blockquote, Lists
- **@Mention:** User list with profile pic/initials, keyboard navigation
- **Emoji Picker:** 200+ emojis, fast search
- **Media:** Render images/videos (upload logic is up to you)
- **Theme:** Light & dark mode (prop)
- **Keyboard Shortcuts:** Tooltips show shortcuts (e.g. Ctrl+B)
- **Custom CSS:** No Tailwind/Bootstrap required

---

## Props
| Prop            | Type     | Default   | Description |
|-----------------|----------|-----------|-------------|
| `theme`         | string   | 'light'   | 'light' or 'dark' |
| `mentions`      | array    | []        | Array of user objects: `[{id, name, profile_pic?}]` |
| `onMediaUpload` | function | undefined | Custom upload handler: `(file, type) => Promise<{url, type, name}>` |

---

## Customization
- **Mentions:** Pass your user list as `mentions` prop
- **Emoji List:** Edit `Toolbar.jsx` emojis array
- **CSS:** Edit `index.css` for full style control

---

## License
MIT
