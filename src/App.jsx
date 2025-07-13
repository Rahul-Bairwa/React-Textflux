import React from 'react';
import Editor from './components/Editor';

export default function App() {
  return (
    <div className="min-h-screen">
      <h1 className="text-center mt-8 mb-4">Minimal Rich Text Editor</h1>
      <Editor />
    </div>
  );
}
