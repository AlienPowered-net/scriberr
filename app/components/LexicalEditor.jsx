import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { $getRoot, $getSelection } from 'lexical';
import { useEffect } from 'react';
import LexicalToolbarPlugin from './LexicalToolbarPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { OverflowNode } from '@lexical/overflow';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

// Remove emoji characters from input
const removeEmojis = (str) => {
  if (!str) return str;
  // Remove emoji characters using regex
  return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]/gu, '');
};

// Custom plugin to handle onChange with emoji filtering
function CustomOnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const textContent = root.getTextContent();
        
        // Filter emojis from the content
        const filteredContent = removeEmojis(textContent);
        
        if (textContent !== filteredContent) {
          console.warn('Emojis detected and removed from content');
        }
        
        onChange(filteredContent);
      });
    });
  }, [editor, onChange]);
  
  return null;
}

function LexicalEditor({ value, onChange, placeholder }) {
  const initialConfig = {
    namespace: 'ScriberrEditor',
    theme: {
      root: 'outline-none',
      paragraph: 'mb-1',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
        underlineStrikethrough: 'underline line-through',
      },
    },
    onError: (error) => {
      console.error('Lexical error:', error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListItemNode,
      ListNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      OverflowNode,
    ],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container" style={{ border: '1px solid #c9cccf', borderRadius: '4px', minHeight: '300px' }}>
        <LexicalToolbarPlugin />
        <div className="editor-inner" style={{ padding: '12px', minHeight: '250px' }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                style={{ 
                  outline: 'none',
                  minHeight: '250px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              />
            }
            placeholder={
              <div style={{ 
                color: '#6d7175',
                overflow: 'hidden',
                userSelect: 'none',
                pointerEvents: 'none',
                position: 'absolute',
                top: '12px',
                left: '12px'
              }}>
                {placeholder}
              </div>
            }
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <ClearEditorPlugin />
          <CustomOnChangePlugin onChange={onChange} />
        </div>
      </div>
    </LexicalComposer>
  );
}

export default LexicalEditor;