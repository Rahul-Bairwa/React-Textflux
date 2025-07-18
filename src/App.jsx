import React from 'react';
import Editor from './components/Editor';

export default function App() {
  const mentions = [
    { id: 1, name: 'John Doe', profile_pic: 'https://example.com/john.jpg' },
    { id: 2, name: 'Jane Smith', profile_pic: 'https://example.com/jane.jpg' },
    { id: 3, name: 'Bob Johnson' } // without profile_pic
  ];
  const [content, setContent] = React.useState('');
  console.log("content", content);
  return (
    <div className="tf-min-h-screen">
      <h1 className="tf-text-center tf-mt-8 tf-mb-4">Minimal Rich Text Editor</h1>
      <Editor
        className="my-mention-box"
        mentions={mentions}
        onChange={setContent}
        value={content} 
        placeholder="Write something..."
        mediaFullscreen={true}
      />
    </div>
  );
}
