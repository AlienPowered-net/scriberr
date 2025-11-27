/**
 * MinimalMentionDebugEditor.jsx
 * 
 * A minimal Tiptap editor using ONLY stock extensions to isolate
 * whether the "frozen input after mention" bug is in:
 * - Tiptap core (unlikely)
 * - Our custom EntityMention extension
 * - Our editor wrapper code (AdvancedRTE/NotionTiptapEditor)
 * 
 * This editor uses:
 * - StarterKit (basic editing)
 * - Stock @tiptap/extension-mention
 * - @tiptap/suggestion
 * 
 * NO custom extensions, NO custom key handlers, NO EntityMention.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Card, Text, BlockStack, Banner } from '@shopify/polaris';

// Simple static list of mentions for testing
const DEMO_MENTIONS = [
  { id: '1', label: 'John Smith' },
  { id: '2', label: 'Jane Doe' },
  { id: '3', label: 'Bob Johnson' },
  { id: '4', label: 'Alice Williams' },
  { id: '5', label: 'Charlie Brown' },
];

// Simple suggestion popup component
const SuggestionList = ({ items, command, selectedIndex }) => {
  if (!items || items.length === 0) {
    return (
      <div style={{
        padding: '8px 12px',
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        No results
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}>
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => command(item)}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: index === selectedIndex ? '#e0e0e0' : 'white',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '14px',
          }}
        >
          @{item.label}
        </button>
      ))}
    </div>
  );
};

export default function MinimalMentionDebugEditor() {
  const [logs, setLogs] = useState([]);
  
  const addLog = useCallback((message, data = {}) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[MinimalEditor] ${message}`, data);
    setLogs(prev => [...prev.slice(-19), { timestamp, message, data: JSON.stringify(data) }]);
  }, []);

  // Configure the stock Mention extension with simple suggestion
  const MentionExtension = Mention.configure({
    HTMLAttributes: {
      class: 'mention',
    },
    suggestion: {
      char: '@',
      items: ({ query }) => {
        addLog('Suggestion items query', { query });
        return DEMO_MENTIONS.filter(item =>
          item.label.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
      },
      render: () => {
        let component = null;
        let popup = null;
        let selectedIndex = 0;

        return {
          onStart: (props) => {
            addLog('Suggestion onStart', { query: props.query });
            selectedIndex = 0;
            
            popup = document.createElement('div');
            popup.className = 'minimal-mention-popup';
            popup.style.cssText = 'position: fixed; z-index: 10000;';
            document.body.appendChild(popup);

            const updatePopup = () => {
              if (!popup) return;
              popup.innerHTML = '';
              
              const container = document.createElement('div');
              container.style.cssText = `
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                overflow: hidden;
                min-width: 150px;
              `;
              
              if (props.items.length === 0) {
                const noResults = document.createElement('div');
                noResults.textContent = 'No results';
                noResults.style.cssText = 'padding: 8px 12px; color: #666;';
                container.appendChild(noResults);
              } else {
                props.items.forEach((item, index) => {
                  const btn = document.createElement('button');
                  btn.textContent = `@${item.label}`;
                  btn.style.cssText = `
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    border: none;
                    background: ${index === selectedIndex ? '#e0e0e0' : 'white'};
                    cursor: pointer;
                    text-align: left;
                    font-size: 14px;
                  `;
                  btn.onclick = () => props.command(item);
                  container.appendChild(btn);
                });
              }
              
              popup.appendChild(container);
              
              if (props.clientRect) {
                const rect = props.clientRect();
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + 4}px`;
              }
            };
            
            component = { updatePopup, selectedIndex };
            updatePopup();
          },
          
          onUpdate: (props) => {
            addLog('Suggestion onUpdate', { query: props.query, itemCount: props.items.length });
            if (component) {
              component.updatePopup = () => {
                if (!popup) return;
                popup.innerHTML = '';
                
                const container = document.createElement('div');
                container.style.cssText = `
                  background: white;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                  overflow: hidden;
                  min-width: 150px;
                `;
                
                if (props.items.length === 0) {
                  const noResults = document.createElement('div');
                  noResults.textContent = 'No results';
                  noResults.style.cssText = 'padding: 8px 12px; color: #666;';
                  container.appendChild(noResults);
                } else {
                  props.items.forEach((item, index) => {
                    const btn = document.createElement('button');
                    btn.textContent = `@${item.label}`;
                    btn.style.cssText = `
                      display: block;
                      width: 100%;
                      padding: 8px 12px;
                      border: none;
                      background: ${index === selectedIndex ? '#e0e0e0' : 'white'};
                      cursor: pointer;
                      text-align: left;
                      font-size: 14px;
                    `;
                    btn.onclick = () => props.command(item);
                    container.appendChild(btn);
                  });
                }
                
                popup.appendChild(container);
                
                if (props.clientRect) {
                  const rect = props.clientRect();
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 4}px`;
                }
              };
              component.updatePopup();
            }
          },
          
          onKeyDown: (props) => {
            addLog('Suggestion onKeyDown', { key: props.event.key });
            
            if (props.event.key === 'Escape') {
              addLog('Suggestion: Escape pressed, closing');
              return true;
            }
            
            if (props.event.key === 'ArrowUp') {
              selectedIndex = Math.max(0, selectedIndex - 1);
              if (component) component.updatePopup();
              return true;
            }
            
            if (props.event.key === 'ArrowDown') {
              selectedIndex = Math.min(props.items.length - 1, selectedIndex + 1);
              if (component) component.updatePopup();
              return true;
            }
            
            if (props.event.key === 'Enter') {
              if (props.items[selectedIndex]) {
                addLog('Suggestion: Enter pressed, selecting item', { item: props.items[selectedIndex] });
                props.command(props.items[selectedIndex]);
              }
              return true;
            }
            
            // Let all other keys through!
            return false;
          },
          
          onExit: (props) => {
            addLog('Suggestion onExit called');
            if (popup) {
              popup.remove();
              popup = null;
            }
            component = null;
          },
        };
      },
      
      // The command that inserts the mention - using insertContentAt as recommended
      command: ({ editor, range, props }) => {
        addLog('Suggestion command called', { range, props });
        
        // Check if there's already a space after
        const nodeAfter = editor.view.state.selection.$to.nodeAfter;
        const overrideSpace = nodeAfter?.text?.startsWith(' ');

        if (overrideSpace) {
          range.to += 1;
        }

        // Use insertContentAt for atomic insertion with proper cursor positioning
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: 'mention',
              attrs: props,
            },
            {
              type: 'text',
              text: ' ', // Space after mention for continued typing
            },
          ])
          .run();
          
        addLog('Mention inserted', { 
          selectionAfter: editor.state.selection.from 
        });
      },
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      MentionExtension,
    ],
    content: '<p>Type here. Try typing @jo to test mentions.</p>',
    onUpdate: ({ editor }) => {
      addLog('Editor onUpdate', {
        selectionFrom: editor.state.selection.from,
        selectionTo: editor.state.selection.to,
      });
    },
  });

  // Log transactions for debugging
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = ({ transaction }) => {
      if (transaction.docChanged) {
        addLog('Transaction (doc changed)', {
          selectionFrom: transaction.selection.from,
          selectionTo: transaction.selection.to,
        });
      }
    };

    editor.on('transaction', handleTransaction);
    return () => editor.off('transaction', handleTransaction);
  }, [editor, addLog]);

  // Handle keydown on the editor wrapper for debugging
  const handleKeyDown = (e) => {
    addLog('EditorContent keydown', { 
      key: e.key, 
      code: e.code,
      selectionFrom: editor?.state?.selection?.from,
      selectionTo: editor?.state?.selection?.to,
    });
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <BlockStack gap="400">
      <Banner tone="info">
        <p><strong>Minimal Debug Editor</strong> - Uses ONLY stock Tiptap Mention extension.</p>
        <p>If typing works here after inserting a mention, the bug is in our custom EntityMention or editor wrappers.</p>
      </Banner>

      <Card>
        <div style={{ padding: '16px' }}>
          <Text as="h2" variant="headingMd">Test Editor</Text>
          <div 
            style={{ 
              marginTop: '12px',
              border: '2px solid #008060',
              borderRadius: '8px',
              minHeight: '150px',
            }}
            onKeyDown={handleKeyDown}
          >
            <EditorContent 
              editor={editor}
              style={{
                padding: '12px',
                minHeight: '150px',
              }}
            />
          </div>
          
          <div style={{ marginTop: '12px' }}>
            <Text variant="bodySm" tone="subdued">
              Selection: {editor.state.selection.from} - {editor.state.selection.to}
            </Text>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ padding: '16px' }}>
          <Text as="h2" variant="headingMd">Test Instructions</Text>
          <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>Type some normal text - verify typing works</li>
            <li>Type <code>@jo</code> - the suggestion popup should appear</li>
            <li>Click or press Enter to select "John Smith"</li>
            <li><strong>Try typing after the mention on the same line</strong></li>
            <li>Try pressing Backspace</li>
            <li>Check if the line is "frozen" or if typing works normally</li>
          </ol>
        </div>
      </Card>

      <Card>
        <div style={{ padding: '16px' }}>
          <Text as="h2" variant="headingMd">Debug Logs (Last 20)</Text>
          <div style={{ 
            marginTop: '8px',
            background: '#1a1a1a', 
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '12px',
            borderRadius: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#666' }}>No logs yet. Start typing...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#888' }}>[{log.timestamp}]</span>{' '}
                  <span style={{ color: '#fff' }}>{log.message}</span>{' '}
                  <span style={{ color: '#888' }}>{log.data !== '{}' ? log.data : ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <style>{`
        .mention {
          background-color: #e0f2f1;
          border: 1px solid #80cbc4;
          color: #00695c;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }
        
        .ProseMirror {
          outline: none;
        }
        
        .ProseMirror p {
          margin: 0 0 8px 0;
        }
      `}</style>
    </BlockStack>
  );
}

