import React, { useRef, useState } from 'react';
import { format, isFormatActive } from '../utils/formatting';
import Tooltip from './Tooltip';

const icons = {
  bold: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M7 4h4a3 3 0 0 1 0 6H7zm0 6h5a3 3 0 0 1 0 6H7z" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  italic: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 4h4M6 16h4m2-12-4 12" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  underline: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 4v5a4 4 0 0 0 8 0V4M5 16h10" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  strikethrough: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M5 10h10M8 4h4a3 3 0 0 1 2.83 2M6.17 14A3 3 0 0 0 10 16h0a3 3 0 0 0 2.83-2" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  blockquote: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M7 7h6v6H7z" stroke="currentColor" strokeWidth="1.5"/><path d="M5 13V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  orderedList: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M8 6h8M8 10h8M8 14h8M4 6h.01M4 10h.01M4 14h.01" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  unorderedList: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="5" cy="6" r="1.5" fill="currentColor"/><circle cx="5" cy="10" r="1.5" fill="currentColor"/><circle cx="5" cy="14" r="1.5" fill="currentColor"/><path d="M9 6h7M9 10h7M9 14h7" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  image: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="7" cy="9" r="1.5" fill="currentColor"/><path d="M3 15l4.5-4.5a2 2 0 0 1 2.83 0L17 15" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  video: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="3" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M13 8l4-2v8l-4-2" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  emoji: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><circle cx="7" cy="9" r="1" fill="currentColor"/><circle cx="13" cy="9" r="1" fill="currentColor"/><path d="M7.5 13a3.5 3.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.5"/></svg>
  ),
  clear: (
    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5"/><text x="2" y="18" fontSize="8" fill="currentColor">Tx</text></svg>
  ),
};

const emojis = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😜','😝','😛','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🙏','🤝','💪','🦾','🦵','🦶','👂','👃','🧠','🦷','🦴','👀','👁️','👅','👄','💋','🩷','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💌','💤','💢','💥','💫','💦','💨','🕳️','💣','💬','👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','🫵','🫱','🫲','🫳','🫴','👏','🙌','👐','🤲','🙏','🫶','🦾','🦿','🦵','🦶','👣','👂','👃','🧠','🦷','🦴','👀','👁️','👅','👄','💋','🩷','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💌','💤','💢','💥','💫','💦','💨','🕳️','💣','💬','🗨️','🗯️','💭','🗣️','👤','👥','🫂','👣','🧳','🌂','☂️','🧵','🧶','👓','🕶️','🥽','🥼','🦺','👔','👕','👖','🧣','🧤','🧥','🧦','👗','👘','🥻','🩱','🩲','🩳','👙','👚','👛','👜','👝','🛍️','🎒','🩴','👞','👟','🥾','🥿','👠','👡','🩰','👢','👑','👒','🎩','🎓','🧢','🪖','⛑️','📿','💄','💍','💎','🔇','🔈','🔉','🔊','📢','📣','📯','🔔','🔕','🎼','🎵','🎶','🎙️','🎚️','🎛️','🎤','🎧','📻','🎷','🪗','🎸','🎹','🎺','🎻','🪕','🥁','🪘','📱','📲','☎️','📞','📟','📠','🔋','🔌','💻','🖥️','🖨️','⌨️','🖱️','🖲️','💽','💾','💿','📀','🧮','🎥','🎞️','📽️','🎬','📺','📷','📸','📹','📼','🔍','🔎','🕯️','💡','🔦','🏮','🪔','📔','📕','📖','📗','📘','📙','📚','📓','📒','📃','📜','📄','📰','🗞️','📑','🔖','🏷️','💰','🪙','💴','💵','💶','💷','💸','💳','🧾','💹','💱','💲','✉️','📧','📨','📩','📤','📥','📦','📫','📪','📬','📭','📮','🗳️','✏️','✒️','🖋️','🖊️','🖌️','🖍️','📝','💼','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋','📌','📍','📎','🖇️','📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🔫','🪃','🏹','🛡️','🪚','🔧','🪛','🔩','⚙️','🗜️','⚖️','🦯','🔗','⛓️','🪝','🧰','🧲','🪜','⚗️','🧪','🧫','🧬','🔬','🔭','📡','💉','🩸','💊','🩹','🩺','🩻','🚪','🛗','🪞','🪟','🛏️','🛋️','🪑','🚽','🚿','🛁','🪠','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🧯','🛒','🚬','⚰️','🪦','⚱️','🧿','🪬','🧸','🪅','🪩','🪆','🎈','🎉','🎊','🎎','🎏','🎐','🧧','🎀','🎁','🎟️','🎫','🎗️','🎖️','🏆','🏅','🥇','🥈','🥉','⚽','⚾','🥎','🏀','🏐','🏈','🏉','🎾','🥏','🎳','🏏','🏑','🏒','🥍','🏓','🏸','🥊','🥋','🥅','⛳','⛸️','🎣','🤿','🎽','🎿','🛷','🥌','🛹','🛼','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🚀','🛸','🛰️','🛎️','🧳'];

const tooltips = {
  bold: { label: 'Bold', shortcut: 'Ctrl+B' },
  italic: { label: 'Italic', shortcut: 'Ctrl+I' },
  underline: { label: 'Underline', shortcut: 'Ctrl+U' },
  strikethrough: { label: 'Strikethrough', shortcut: 'Ctrl+Shift+S' },
  blockquote: { label: 'Blockquote', shortcut: 'Ctrl+Q' },
  orderedList: { label: 'Ordered List', shortcut: 'Ctrl+Shift+7' },
  unorderedList: { label: 'Unordered List', shortcut: 'Ctrl+Shift+8' },
  image: { label: 'Insert Image', shortcut: '' },
  video: { label: 'Insert Video', shortcut: '' },
  emoji: { label: 'Emoji', shortcut: '' },
  clear: { label: 'Clear Formatting', shortcut: '' },
};

export default function Toolbar({ theme = 'light', onInsertMedia, onInsertEmoji, onClearFormatting }) {
  const imgInput = useRef();
  const vidInput = useRef();
  const [showEmoji, setShowEmoji] = useState(false);

  const handleFile = (type) => {
    if (type === 'image') imgInput.current.click();
    else if (type === 'video') vidInput.current.click();
  };

  return (
    <div className={`toolbar ${theme === 'dark' ? 'dark' : ''}`}>
      {Object.entries(icons).map(([key, icon]) => {
        if (key === 'image' || key === 'video' || key === 'emoji' || key === 'clear') return null;
        let active = false;
        if (key === 'bold' || key === 'italic' || key === 'underline' || key === 'strikethrough') {
          active = isFormatActive(key === 'strikethrough' ? 'strikeThrough' : key);
        }
        return (
          <Tooltip key={key} label={tooltips[key].label} shortcut={tooltips[key].shortcut} theme={theme}>
            <button
              title={tooltips[key].label}
              className={`toolbar-btn ${active ? 'active' : ''}`}
              onMouseDown={e => {
                e.preventDefault();
                if (key === 'blockquote') format('formatBlock', 'BLOCKQUOTE');
                else if (key === 'orderedList') format('insertOrderedList');
                else if (key === 'unorderedList') format('insertUnorderedList');
                else format(key === 'strikethrough' ? 'strikeThrough' : key);
              }}
            >
              {icon}
            </button>
          </Tooltip>
        );
      })}
      <Tooltip label={tooltips.image.label} shortcut={tooltips.image.shortcut} theme={theme}>
        <button title="Insert Image" className="toolbar-btn" onMouseDown={e => {e.preventDefault();handleFile('image');}}>{icons.image}</button>
      </Tooltip>
      <input type="file" accept="image/*" ref={imgInput} className="file-input" onChange={e => {if(e.target.files[0]) onInsertMedia(e.target.files[0],'image'); e.target.value='';}} />
      <Tooltip label={tooltips.video.label} shortcut={tooltips.video.shortcut} theme={theme}>
        <button title="Insert Video" className="toolbar-btn" onMouseDown={e => {e.preventDefault();handleFile('video');}}>{icons.video}</button>
      </Tooltip>
      <input type="file" accept="video/*" ref={vidInput} className="file-input" onChange={e => {if(e.target.files[0]) onInsertMedia(e.target.files[0],'video'); e.target.value='';}} />
      <div className="relative">
        <Tooltip label={tooltips.emoji.label} shortcut={tooltips.emoji.shortcut} theme={theme}>
          <button title="Emoji" className="toolbar-btn" onMouseDown={e => {e.preventDefault();setShowEmoji(v=>!v);}}>{icons.emoji}</button>
        </Tooltip>
        {showEmoji && (
          <div className={`emoji-picker max-w-200 max-h-200 overflow-y-auto flex flex-wrap gap-1 ${theme === 'dark' ? 'dark' : ''}`}>
            {emojis.map(emo => (
              <button key={emo} className="emoji-btn" onMouseDown={e => {e.preventDefault();onInsertEmoji(emo);setShowEmoji(false);}}>{emo}</button>
            ))}
          </div>
        )}
      </div>
      <Tooltip label={tooltips.clear.label} shortcut={tooltips.clear.shortcut} theme={theme}>
        <button title="Clear Formatting" className="toolbar-btn" onMouseDown={e => {e.preventDefault();onClearFormatting();}}>{icons.clear}</button>
      </Tooltip>
    </div>
  );
} 