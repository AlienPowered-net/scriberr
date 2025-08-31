import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { $getRoot } from 'lexical';
import LexicalToolbarPlugin from './LexicalToolbarPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { OverflowNode } from '@lexical/overflow';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

// Remove emoji characters from input
const removeEmojis = (str) => {
  if (!str) return str;
  return str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]/gu, '');
};

// Test plugin to verify editor is working
function TestPlugin() {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    console.log('Lexical editor initialized successfully');
    console.log('Editor instance:', editor);
    
    return editor.registerUpdateListener(({ editorState }) => {
      console.log('Editor state updated');
    });
  }, [editor]);
  
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
    <>
      <style>{`
        .editor-placeholder {
          color: #6d7175;
          overflow: hidden;
          user-select: none;
          pointer-events: none;
          position: absolute;
          top: 12px;
          left: 12px;
          font-size: 14px;
          line-height: 1.5;
        }
        .editor-container {
          border: 1px solid #c9cccf;
          border-radius: 4px;
          min-height: 300px;
        }
        .editor-inner {
          padding: 12px;
          min-height: 250px;
          position: relative;
        }
        .editor-content {
          outline: none;
          min-height: 250px;
          font-size: 14px;
          line-height: 1.5;
        }
      `}</style>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container">
          <LexicalToolbarPlugin />
          <div className="editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="editor-content" />
              }
              placeholder={
                <div className="editor-placeholder">
                  {placeholder}
                </div>
              }
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <LinkPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <TestPlugin />
            <OnChangePlugin 
              onChange={(editorState) => {
                editorState.read(() => {
                  const root = $getRoot();
                  const textContent = root.getTextContent();
                  const filteredContent = removeEmojis(textContent);
                  onChange(filteredContent);
                });
              }}
            />
          </div>
        </div>
      </LexicalComposer>
    </>
  );
}

export default LexicalEditor;