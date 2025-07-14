import React from 'react';
import Editor from './components/Editor';

export default function App() {
  return (
    <div className="tf-min-h-screen">
      <h1 className="tf-text-center tf-mt-8 tf-mb-4">Minimal Rich Text Editor</h1>
      <Editor/>
    </div>
  );
}
