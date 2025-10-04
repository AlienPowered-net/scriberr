import { Node, mergeAttributes } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';

export const EntityMentionPluginKey = new PluginKey('entityMention');

export const EntityMention = Node.create({
  name: 'entityMention',

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ options, node }) {
        return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: {
        char: '@',
        pluginKey: EntityMentionPluginKey,
        command: ({ editor, range, props }) => {
          // nodeAfter is the next node in document after current position
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            range.to += 1;
          }

          // Insert the mention and a space after it
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();

          // Debug: Log the insertion
          console.log('[EntityMention] Inserted mention at range:', range);
          console.log('[EntityMention] Mention attrs:', props);

          // DON'T move the cursor - let Tiptap position it naturally after the insertion
          // The cursor should automatically be positioned after the space we just inserted
          window.requestAnimationFrame(() => {
            const { state, view } = editor;
            
            console.log('[EntityMention] Natural cursor position after insert:', {
              selectionFrom: state.selection.from,
              selectionTo: state.selection.to,
              docSize: state.doc.content.size,
              rangeFrom: range.from
            });
            
            const nodeAt = state.doc.nodeAt(state.selection.from);
            const nodeBefore = state.selection.from > 0 ? state.doc.nodeAt(state.selection.from - 1) : null;
            
            console.log('[EntityMention] Node info at natural position:', {
              nodeAtCursor: nodeAt?.type.name,
              nodeBefore: nodeBefore?.type.name,
              editable: view.editable,
              parentNode: state.selection.$from.parent.type.name
            });
          });
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          const allow = !!$from.parent.type.contentMatch.matchType(type);

          return allow;
        },
      },
    };
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }

          return {
            'data-id': attributes.id,
          };
        },
      },

      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {};
          }

          return {
            'data-label': attributes.label,
          };
        },
      },

      type: {
        default: 'person',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => {
          if (!attributes.type) {
            return {};
          }

          return {
            'data-type': attributes.type,
          };
        },
      },

      url: {
        default: null,
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes => {
          if (!attributes.url) {
            return {};
          }

          return {
            'data-url': attributes.url,
          };
        },
      },

      metadata: {
        default: null,
        parseHTML: element => {
          const meta = element.getAttribute('data-metadata');
          return meta ? JSON.parse(meta) : null;
        },
        renderHTML: attributes => {
          if (!attributes.metadata) {
            return {};
          }

          return {
            'data-metadata': JSON.stringify(attributes.metadata),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = mergeAttributes(
      { 'data-type': this.name },
      this.options.HTMLAttributes,
      HTMLAttributes
    );

    // Get entity type for styling
    const entityType = node.attrs.type || 'person';
    const label = node.attrs.label || node.attrs.id;
    const url = node.attrs.url;

    // Entity-specific colors
    const entityColors = {
      product: { bg: '#e3f2fd', border: '#90caf9', text: '#1565c0' },
      variant: { bg: '#f3e5f5', border: '#ce93d8', text: '#6a1b9a' },
      order: { bg: '#fff3e0', border: '#ffcc80', text: '#e65100' },
      customer: { bg: '#e8f5e9', border: '#a5d6a7', text: '#2e7d32' },
      collection: { bg: '#fce4ec', border: '#f48fb1', text: '#c2185b' },
      discount: { bg: '#fff9c4', border: '#fff176', text: '#f57f17' },
      draftOrder: { bg: '#f1f8e9', border: '#c5e1a5', text: '#558b2f' },
      person: { bg: '#e0f2f1', border: '#80cbc4', text: '#00695c' },
    };

    const colors = entityColors[entityType] || { bg: '#f0f0f0', border: '#ddd', text: '#333' };

    // Add entity type class for styling
    attrs.class = `entity-mention entity-mention-${entityType}`;
    attrs.style = `cursor: pointer; font-weight: 700; background-color: ${colors.bg}; border: 1px solid ${colors.border}; color: ${colors.text}; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; font-size: 0.95em; white-space: nowrap; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);`;
    attrs.title = url ? `Click to open ${label} in Shopify Admin` : label;
    
    // Add click handler to open URL in new tab
    if (url) {
      attrs.onclick = `window.open('${url}', '_blank', 'noopener,noreferrer'); event.stopPropagation(); return false;`;
    }

    return [
      'span',
      attrs,
      this.options.renderLabel({
        options: this.options,
        node,
      }),
    ];
  },

  renderText({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node,
    });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          console.log('[EntityMention Backspace] Triggered');
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            console.log('[EntityMention Backspace] Selection not empty, allowing default');
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            console.log('[EntityMention Backspace] Checking node:', node.type.name, 'at pos:', pos);
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText(
                this.options.suggestion.char || '',
                pos,
                pos + node.nodeSize
              );
              console.log('[EntityMention Backspace] Deleted mention, replacing with @');
              return false;
            }
          });

          return isMention;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
