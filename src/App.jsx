import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor from './components/Editor';

// ✅ Custom debounce
function debounce(func, delay) {
  let timer;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export default function App() {
  const mentions = [
    { id: 250, name: 'Gaurvi patel' },
    { id: 26, name: 'Vikkas Yaduvanshi', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/WhatsApp_Image_2025-01-27_at_10.36.11_PM.jpeg' },
    { id: 174, name: 'Urvashi i Agarwal', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/ImportedPhoto_1714629532569.jpg' },
    { id: 57, name: 'Raghavanand Tripathi', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/20230925_194318_1.jpg' },
    { id: 28, name: 'Vikas j Pareek', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/Skype_Picture_2025_02_03T05_56_26_764Z.jpeg' },
    { id: 205, name: 'mayank Choudhary', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/Screenshot_9.png' },
    { id: 210, name: 'gajendra rathore', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/IMG_9797.JPG' },
    { id: 27, name: 'Rakesh Yadav', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/IMG_20240531_154607.jpg' },
    { id: 29, name: 'abhishek gauttam', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/Khatu_Fcpb5Nl.jpg' },
    { id: 215, name: 'anshika prpwebs' },
    { id: 176, name: 'Rahul Saini', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/Screenshot_2024-06-05-15-10-29-086_com.miui.gallery_CZfmicU.jpg' },
    { id: 193, name: 'Arjun Pareek', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/WhatsApp_Image_2024-05-31_at_5.20.36_PM_XZWAG6z.jpeg' },
    { id: 24, name: 'Bhairav jangid', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/Bhairav.jpeg' },
    { id: 74, name: 'Khushboo Sain', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/IMG-20250210-WA0024.jpg' },
    { id: 75, name: 'Tushar jangid', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/Screenshot_7.png' },
    { id: 86, name: 'Divyanshu', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/IMG20210217130812_11solAz.jpg' },
    { id: 48, name: 'Gaurav Singh', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/1718961201252.JPEG' },
    { id: 25, name: 'Rahul Sain', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/d5fda9bd-a97c-404e-be6f-d17db749eb80.jpeg' },
    { id: 54, name: 'punit pareek', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/1663687257908_Stryviq_WPKiFfP.jpg' },
    { id: 22, name: 'kailash Kumawat', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/IMG-20231011-WA0012.jpg' },
    { id: 687, name: 'Cg Sir', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/cg_7aNCsAv.jpeg' },
    { id: 168, name: 'Sumit Jangir' },
    { id: 692, name: 'sejal jain' },
    { id: 693, name: 'Chavi prpwebs' },
    { id: 814, name: 'shubham saini' },
    { id: 738, name: 'nicky kumawat', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/59171a5b-fd1c-448e-a2c2-e4e0c1dcbf00.JPEG' },
    { id: 835, name: 'ankita jaiswal', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/507a2000-b261-442f-9ab4-69f3c41e89b5.jpg' },
    { id: 747, name: 'Himanshu Yadav' },
    { id: 192, name: 'Rahul ji Bairwa', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/IMG_9753_K94n7Ws.jpg' },
    { id: 874, name: 'TestForPermission' },
    { id: 873, name: 'jaiswalankitajaiswal' },
    { id: 20, name: 'Divya Dhirwani', profile_pic: 'http://staging.api.dyzo.ai/media/profile_pictures/IMG_20241207_082320012_HDR_AE.jpg' },
    { id: 792, name: 'testprp one' },
    { id: 1019, name: 'himanshuyadv6645' },
    { id: 804, name: 'sumit mehta' },
    { id: 948, name: 'Anusha Chowdam' }
   ];
  const [content, setContent] = useState('');
  const [isTransformingLinks, setIsTransformingLinks] = useState(false);

  const contentRef = useRef(content);
  const lastSavedContent = useRef('');

  // useEffect(() => {
  //   contentRef.current = content;
  //   debouncedTransformLinks(content);
  // }, [content]);

  // --- API to transform links ---
  const transformLinks = async (text) => {
    if (!text) return text;

    try {
      const response = await fetch(
        `https://api.dyzo.ai/change-message/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        }
      );

      const data = await response.json();

      if (data.status === 1) {
        return data.message;
      }

      return text;
    } catch (error) {
      console.error('Error transforming links:', error);
      return text;
    }
  };

  // --- Debounced transform logic using custom debounce ---
  const debouncedTransformLinks = useCallback(
    debounce(async (newContent) => {
      if (newContent !== lastSavedContent.current) {
        setIsTransformingLinks(true);
        try {
          const transformed = await transformLinks(newContent);
          if (transformed !== contentRef.current) {
            setContent(transformed);
            lastSavedContent.current = transformed;
          }
        } finally {
          setIsTransformingLinks(false);
        }
      }
    }, 500),
    []
  );

  return (
    <div>
      <h1 className="tf-text-center tf-mt-8 tf-mb-4">Minimal Rich Text Editor</h1>
      <Editor
        theme="dark"
        className="my-mention-box"
        mentions={mentions}
        onChange={setContent}
        value={content}
        placeholder="Write something..."
        mediaFullscreen={true}
        onEnter={() => console.log('enter')}
      />
      {isTransformingLinks && (
        <p className="tf-text-center tf-text-sm">Transforming links...</p>
      )}
    </div>
  );
}
