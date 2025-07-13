import { useRef, useState } from 'react';

export default function useEditor() {
  const editorRef = useRef(null);
  const [html, setHtml] = useState('');
  const [json, setJson] = useState({ blocks: [] });

  // Update HTML and JSON state
  const updateContent = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    setHtml(htmlContent);
    setJson({ blocks: [{ type: 'rich', data: htmlContent }] });
  };

  // Set content from HTML
  const setContentFromHtml = (htmlString) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlString;
      updateContent();
    }
  };

  // Set content from JSON
  const setContentFromJson = (jsonObj) => {
    if (editorRef.current && jsonObj?.blocks?.[0]?.data) {
      editorRef.current.innerHTML = jsonObj.blocks[0].data;
      updateContent();
    }
  };

  return {
    editorRef,
    html,
    json,
    updateContent,
    setContentFromHtml,
    setContentFromJson,
  };
} 