import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagBar({ store, noteId, noteTags }) {
  const [showInput, setShowInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAdd = () => {
    if (newTag.trim()) {
      store.addTagToNote(noteId, newTag.trim());
      setNewTag('');
      setShowInput(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {noteTags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs bg-anotata-lavanda-clara px-2 py-0.5 rounded-full text-anotata-roxo border border-anotata-lavanda font-medium"
        >
          #{tag}
          <button
            onClick={() => store.removeTagFromNote(noteId, tag)}
            className="hover:text-anotata-goiaba transition-colors"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {showInput ? (
        <div className="inline-flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowInput(false); }}
            placeholder="tag..."
            className="text-xs bg-white border border-anotata-border rounded px-2 py-0.5 text-anotata-text w-20 focus:outline-none focus:border-anotata-roxo"
            list="tag-suggestions"
          />
          <datalist id="tag-suggestions">
            {store.tags.filter(t => !noteTags.includes(t)).map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      ) : (
        <button
          data-tag-add-btn
          onClick={() => setShowInput(true)}
          className="inline-flex items-center gap-0.5 text-xs text-anotata-muted hover:text-anotata-roxo transition-colors"
        >
          <Plus size={12} />
          tag
        </button>
      )}
    </div>
  );
}
