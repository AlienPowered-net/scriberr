/**
 * useContactMentionPopover.js
 * 
 * Custom hook that attaches Tippy.js popovers to contact mention pills
 * in the editor. This works by finding all .entity-mention elements
 * with type='person' or type='business' and wrapping them with Tippy.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import tippy, { hideAll } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import { createRoot } from 'react-dom/client';
import ContactPopoverContent from './ContactPopoverContent';

/**
 * Hook to attach Tippy popovers to contact mentions
 * 
 * @param {Object} editorRef - Ref to the editor DOM element
 */
export function useContactMentionPopover(editorRef) {
  const navigate = useNavigate();
  const tippyInstancesRef = useRef(new Map());
  const observerRef = useRef(null);

  useEffect(() => {
    if (!editorRef?.current) return;

    // Find the ProseMirror editor element inside the ref
    // The ref might be on a wrapper, so we need to find .ProseMirror
    const wrapperElement = editorRef.current;
    let editorElement = wrapperElement.querySelector?.('.ProseMirror') || wrapperElement;
    
    // Function to attach Tippy to a mention element
    const attachTippy = (element) => {
      // Skip if already has Tippy
      if (element._tippy || tippyInstancesRef.current.has(element)) {
        return;
      }

      const contactId = element.getAttribute('data-id');
      const contactType = element.getAttribute('data-type') || element.getAttribute('data-entity-type');
      
      // Only attach to person/business mentions
      if (!contactId || (contactType !== 'person' && contactType !== 'business')) {
        return;
      }

      // Create container for React content
      const contentContainer = document.createElement('div');
      const root = createRoot(contentContainer);
      
      // Render ContactPopoverContent
      root.render(
        React.createElement(ContactPopoverContent, {
          contactId,
          contactType,
          onEdit: () => {
            navigate(`/app/contacts?edit=${contactId}`);
          }
        })
      );

      // Create Tippy instance
      const instance = tippy(element, {
        content: contentContainer,
        trigger: 'click',
        interactive: true,
        arrow: true,
        theme: 'light contact-popover',
        placement: 'top',
        hideOnClick: true,
        animation: 'scale-subtle',
        inertia: true,
        popperOptions: {
          modifiers: [
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['right', 'bottom', 'left'],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                padding: 8,
              },
            },
          ],
        },
        onShow() {
          // Hide all other popovers when showing this one
          hideAll({ duration: 0 });
        },
        onDestroy() {
          // Cleanup React root
          root.unmount();
        },
      });

      tippyInstancesRef.current.set(element, instance);
    };

    // Function to find and attach Tippy to all contact mentions
    const attachToAllMentions = () => {
      const currentElement = wrapperElement.querySelector?.('.ProseMirror') || wrapperElement;
      if (!currentElement || !currentElement.querySelector) return;
      
      const mentions = currentElement.querySelectorAll('.entity-mention[data-type="person"], .entity-mention[data-type="business"], .entity-mention[data-entity-type="person"], .entity-mention[data-entity-type="business"]');
      mentions.forEach(attachTippy);
    };

    // If ProseMirror not found yet, wait a bit for it to mount
    if (!editorElement || !editorElement.querySelector) {
      const checkInterval = setInterval(() => {
        editorElement = wrapperElement.querySelector?.('.ProseMirror') || wrapperElement;
        if (editorElement && editorElement.querySelector) {
          clearInterval(checkInterval);
          attachToAllMentions();
          if (editorElement && editorElement.querySelector) {
            observerRef.current?.observe(editorElement, {
              childList: true,
              subtree: true,
            });
          }
        }
      }, 100);
      
      // Cleanup interval after 5 seconds
      setTimeout(() => clearInterval(checkInterval), 5000);
    }

    // Initial attachment (only if editor element is ready)
    if (editorElement && editorElement.querySelector) {
      attachToAllMentions();
    }

    // Watch for new mentions being added
    observerRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a mention
            if (node.classList?.contains('entity-mention')) {
              attachTippy(node);
            }
            // Check for mentions inside the added node
            const mentions = node.querySelectorAll?.('.entity-mention[data-type="person"], .entity-mention[data-type="business"], .entity-mention[data-entity-type="person"], .entity-mention[data-entity-type="business"]');
            mentions?.forEach(attachTippy);
          }
        });
      });
    });

    if (editorElement && editorElement.querySelector) {
      observerRef.current.observe(editorElement, {
        childList: true,
        subtree: true,
      });
    }

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      // Destroy all Tippy instances
      tippyInstancesRef.current.forEach((instance) => {
        instance.destroy();
      });
      tippyInstancesRef.current.clear();
    };
  }, [editorRef, navigate]);
}

