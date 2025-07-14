import React from 'react';

export default function MediaBlock({ src, type }) {
  if (type.startsWith('image')) {
    return <div className="tf-media-block"><img src={src} alt="media" /></div>;
  }
  if (type.startsWith('video')) {
    return <div className="tf-media-block"><video src={src} controls /></div>;
  }
  return null;
} 