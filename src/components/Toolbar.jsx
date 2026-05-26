import React, { useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code,
  List, ListOrdered, CheckSquare, Quote, Minus,
  Heading1, Heading2, Heading3, Link2, Image,
  Highlighter, Undo2, Redo2, Palette
} from 'lucide-react';

function ToolBtn({ onClick, isActive, title, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? 'bg-anotata-roxo text-white'
          : 'text-anotata-text-suave hover:text-anotata-roxo hover:bg-anotata-hover'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

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
    <div className="border-b border-anotata-border px-4 py-2 flex flex-wrap items-center gap-0.5 bg-white">
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer" disabled={!editor.can().undo()}>
        <Undo2 size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer" disabled={!editor.can().redo()}>
        <Redo2 size={14} />
      </ToolBtn>

      <div className="w-px h-5 bg-anotata-border mx-1"></div>

      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Título 1">
        <Heading1 size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Título 2">
        <Heading2 size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Título 3">
        <Heading3 size={14} />
      </ToolBtn>

      <div className="w-px h-5 bg-anotata-border mx-1"></div>

      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito">
        <Bold size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico">
        <Italic size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado">
        <Underline size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Tachado">
        <Strikethrough size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Destaque">
        <Highlighter size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Código">
        <Code size={14} />
      </ToolBtn>

      <div className="relative">
        <ToolBtn onClick={() => setShowColorPicker(!showColorPicker)} title="Cor do texto">
          <Palette size={14} />
        </ToolBtn>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-anotata-border rounded-lg p-2 grid grid-cols-5 gap-1 z-50 shadow-xl">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }}
                className="w-5 h-5 rounded-full border border-anotata-border hover:scale-125 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
            <button
              onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
              className="col-span-5 text-[10px] text-anotata-muted hover:text-anotata-text mt-1"
            >
              Remover cor
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-anotata-border mx-1"></div>

      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista">
        <List size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista numerada">
        <ListOrdered size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="Checklist">
        <CheckSquare size={14} />
      </ToolBtn>

      <div className="w-px h-5 bg-anotata-border mx-1"></div>

      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citação">
        <Quote size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha separadora">
        <Minus size={14} />
      </ToolBtn>

      <div className="w-px h-5 bg-anotata-border mx-1"></div>

      <ToolBtn onClick={addLink} isActive={editor.isActive('link')} title="Inserir link">
        <Link2 size={14} />
      </ToolBtn>
      <ToolBtn onClick={addImage} title="Inserir imagem">
        <Image size={14} />
      </ToolBtn>
    </div>
  );
}
