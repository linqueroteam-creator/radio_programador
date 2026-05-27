import React, { useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code,
  List, ListOrdered, CheckSquare, Quote, Minus,
  Heading1, Heading2, Heading3, Link2, Image,
  Highlighter, Undo2, Redo2, Palette
} from 'lucide-react';
import IconButton from './ui/IconButton';

export default function Toolbar({ editor }) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!editor) return null;

  const colors = [
    '#2D1B4E', '#5B2D8E', '#7C4DC9', '#E8637C', '#C44862',
    '#F08AA0', '#5B4A7A', '#9888B5', '#3D1B66', '#E0D7EC'
  ];

  const addLink = () => {
    const url = prompt('URL do link:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = prompt('URL da imagem:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div
      data-toolbar="true"
      className="border-b border-anotata-border px-4 py-2 flex flex-wrap items-center gap-0.5 bg-white"
    >
      <IconButton
        icon={Undo2}
        label="Desfazer"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <IconButton
        icon={Redo2}
        label="Refazer"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />

      <div className="w-px h-5 bg-anotata-border mx-1" aria-hidden="true"></div>

      <IconButton
        icon={Heading1}
        label="Título 1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
      />
      <IconButton
        icon={Heading2}
        label="Título 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
      />
      <IconButton
        icon={Heading3}
        label="Título 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
      />

      <div className="w-px h-5 bg-anotata-border mx-1" aria-hidden="true"></div>

      <IconButton
        icon={Bold}
        label="Negrito"
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
      />
      <IconButton
        icon={Italic}
        label="Itálico"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
      />
      <IconButton
        icon={Underline}
        label="Sublinhado"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
      />
      <IconButton
        icon={Strikethrough}
        label="Tachado"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
      />
      <IconButton
        icon={Highlighter}
        label="Destaque"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
      />
      <IconButton
        icon={Code}
        label="Código"
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
      />

      <div className="relative">
        <IconButton
          icon={Palette}
          label="Cor do texto"
          onClick={() => setShowColorPicker(!showColorPicker)}
          isActive={showColorPicker}
        />
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-anotata-border rounded-lg p-2 grid grid-cols-5 gap-1 z-50 shadow-xl">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }}
                className="w-5 h-5 rounded-full border border-anotata-border hover:scale-125 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50"
                style={{ backgroundColor: color }}
                aria-label={`Cor ${color}`}
              />
            ))}
            <button
              onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
              className="col-span-5 text-2xs text-anotata-muted hover:text-anotata-text mt-1 focus-visible:outline-none focus-visible:underline"
            >
              Remover cor
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-anotata-border mx-1" aria-hidden="true"></div>

      <IconButton
        icon={List}
        label="Lista"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
      />
      <IconButton
        icon={ListOrdered}
        label="Lista numerada"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
      />
      <IconButton
        icon={CheckSquare}
        label="Checklist"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
      />

      <div className="w-px h-5 bg-anotata-border mx-1" aria-hidden="true"></div>

      <IconButton
        icon={Quote}
        label="Citação"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
      />
      <IconButton
        icon={Minus}
        label="Linha separadora"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />

      <div className="w-px h-5 bg-anotata-border mx-1" aria-hidden="true"></div>

      <IconButton
        icon={Link2}
        label="Inserir link"
        onClick={addLink}
        isActive={editor.isActive('link')}
      />
      <IconButton
        icon={Image}
        label="Inserir imagem"
        onClick={addImage}
      />
    </div>
  );
}
