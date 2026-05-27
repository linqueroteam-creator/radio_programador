import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState } from 'react';

/**
 * Extensão de imagem redimensionável.
 * - Suporta colar imagem (paste)
 * - Clica na imagem para abrir opções de tamanho
 * - Tem larguras pré-definidas (25%, 50%, 75%, 100%)
 * - Pode alinhar (esquerda, centro, direita)
 */

function ResizableImageComponent({ node, updateAttributes, selected, deleteNode }) {
  const [showToolbar, setShowToolbar] = useState(false);
  const { src, alt, width, align } = node.attrs;

  const widthStyle = width ? `${width}%` : '100%';
  const alignClass =
    align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';

  const handleClick = (e) => {
    e.stopPropagation();
    setShowToolbar(true);
  };

  return (
    <NodeViewWrapper
      className={`resizable-image-wrapper my-2 ${alignClass}`}
      data-align={align || 'center'}
    >
      <span style={{ display: 'inline-block', position: 'relative', maxWidth: '100%' }}>
        <img
          src={src}
          alt={alt || 'Imagem colada'}
          onClick={handleClick}
          className={`rounded-lg cursor-pointer transition-all ${
            selected || showToolbar ? 'ring-2 ring-anotata-roxo ring-offset-2' : ''
          }`}
          style={{
            width: widthStyle,
            maxWidth: '100%',
            display: 'block',
          }}
          draggable={false}
        />

        {(selected || showToolbar) && (
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white border border-anotata-border rounded-lg shadow-lg px-1 py-1 z-50"
            style={{ whiteSpace: 'nowrap' }}
          >
            <SizeBtn active={width === 25} onClick={() => updateAttributes({ width: 25 })}>25%</SizeBtn>
            <SizeBtn active={width === 50} onClick={() => updateAttributes({ width: 50 })}>50%</SizeBtn>
            <SizeBtn active={width === 75} onClick={() => updateAttributes({ width: 75 })}>75%</SizeBtn>
            <SizeBtn active={width === 100 || !width} onClick={() => updateAttributes({ width: 100 })}>100%</SizeBtn>

            <div className="w-px h-4 bg-anotata-border mx-1"></div>

            <SizeBtn active={align === 'left'} onClick={() => updateAttributes({ align: 'left' })}>←</SizeBtn>
            <SizeBtn active={align === 'center' || !align} onClick={() => updateAttributes({ align: 'center' })}>•</SizeBtn>
            <SizeBtn active={align === 'right'} onClick={() => updateAttributes({ align: 'right' })}>→</SizeBtn>

            <div className="w-px h-4 bg-anotata-border mx-1"></div>

            <button
              onClick={() => deleteNode()}
              className="text-xs px-2 py-1 rounded text-anotata-goiaba hover:bg-anotata-goiaba hover:text-white transition-colors"
              title="Remover imagem"
            >
              ✕
            </button>
          </div>
        )}
      </span>
    </NodeViewWrapper>
  );
}

function SizeBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
        active
          ? 'bg-anotata-roxo text-white'
          : 'text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo'
      }`}
    >
      {children}
    </button>
  );
}

const ResizableImage = Node.create({
  name: 'resizableImage',
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      width: {
        default: 100,
        parseHTML: (el) => {
          const w = el.getAttribute('data-width') || el.style.width;
          if (typeof w === 'string' && w.endsWith('%')) {
            return parseInt(w);
          }
          return parseInt(w) || 100;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return {
            'data-width': attrs.width,
            style: `width: ${attrs.width}%`,
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'img[src]' },
      { tag: 'figure[data-type="resizableImage"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addCommands() {
    return {
      setResizableImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { width: 100, align: 'center', ...options },
        });
      },
    };
  },
});

export default ResizableImage;
