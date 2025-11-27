import { Node, mergeAttributes } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';

export const EntityMentionPluginKey = new PluginKey('entityMention');

export const EntityMention = Node.create({
  name: 'entityMention',

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ options, node }) {
        return `${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: {
        char: '@',
        pluginKey: EntityMentionPluginKey,
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          // nodeAfter is the next node in document after current position
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            range.to += 1;
          }

          // Delete the trigger text first, then insert mention + space
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
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
        tag: 'span.entity-mention',
        getAttrs: (element) => {
          // Only parse if it has the proper attributes
          const id = element.getAttribute('data-id');
          const label = element.getAttribute('data-label');
          
          if (!id || !label) {
            return false; // Don't parse this element
          }
          
          // Parse all the data attributes
          return {
            id: id,
            label: label,
            type: element.getAttribute('data-type') || 'person',
            url: element.getAttribute('data-url') || null,
            metadata: element.getAttribute('data-metadata') 
              ? JSON.parse(element.getAttribute('data-metadata'))
              : null,
          };
        },
      },
      {
        tag: `span[data-type="${this.name}"]`,
        getAttrs: (element) => {
          return {
            id: element.getAttribute('data-id'),
            label: element.getAttribute('data-label'),
            type: element.getAttribute('data-type') || 'person',
            url: element.getAttribute('data-url') || null,
            metadata: element.getAttribute('data-metadata') 
              ? JSON.parse(element.getAttribute('data-metadata'))
              : null,
          };
        },
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
    
    // Note: Click handler is now added via React useEffect in the editor components
    // This ensures it works for both new and saved mentions

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
      Backspace: ({ editor }) => {
        const { selection, doc } = editor.state;
        const { empty, anchor } = selection;

        // Only handle if selection is empty (cursor, not selection)
        if (!empty) {
          return false;
        }

        // Check if there's a mention node directly before the cursor
        const $pos = doc.resolve(anchor);
        const nodeBefore = $pos.nodeBefore;

        if (nodeBefore?.type.name === this.name) {
          // Delete the mention and replace with @ to re-trigger suggestion
          editor
            .chain()
            .focus()
            .deleteRange({ from: anchor - nodeBefore.nodeSize, to: anchor })
            .insertContent(this.options.suggestion.char || '@')
            .run();
          return true;
        }

        // Let default backspace behavior happen
        return false;
      },
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
