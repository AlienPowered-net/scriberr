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

          // Use insertContentAt for atomic insertion with proper cursor positioning
          // This replaces the trigger text (@query) with the mention node + a trailing space
          // The space ensures the user can continue typing normally after the mention
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
    // SIMPLIFIED: Match stock Mention renderHTML pattern
    // All styling moved to CSS to avoid breaking contenteditable behavior
    const entityType = node.attrs.type || 'person';
    
    return [
      'span',
      mergeAttributes(
        { 
          'data-type': this.name,
          'data-entity-type': entityType,
          'data-id': node.attrs.id,
          'data-label': node.attrs.label,
          'data-url': node.attrs.url || '',
          class: `entity-mention entity-mention-${entityType}`,
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
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

  // Removed custom Backspace handler that was re-triggering suggestions when deleting a mention.
  // This was causing issues with normal typing/backspace after mention insertion.
  // Default atom node deletion behavior now applies - users can re-type @ to change a mention.

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
