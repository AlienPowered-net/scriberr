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

      // Create container for React content - only create when needed
      let contentContainer = null;
      let root = null;
      let tippyInstance = null;
      
      // Function to create and render content (only called when popover shows)
      const createContent = () => {
        if (contentContainer) return contentContainer;
        
        contentContainer = document.createElement('div');
        root = createRoot(contentContainer);
        
        // Render ContactPopoverContent
        root.render(
          React.createElement(ContactPopoverContent, {
            contactId,
            contactType,
            onEdit: () => {
              if (tippyInstance) {
                tippyInstance.hide();
              }
              navigate(`/app/contacts?edit=${contactId}`);
            }
          })
        );
        
        return contentContainer;
      };

      // Create Tippy instance
      tippyInstance = tippy(element, {
        content: createContent, // Use function so content is only created when shown
        trigger: 'manual', // Use manual trigger so we control it
        interactive: true,
        arrow: true,
        theme: 'light contact-popover',
        placement: 'top',
        hideOnClick: true,
        animation: 'scale-subtle',
        inertia: true,
        delay: [150, 400], // [showDelay, hideDelay] in milliseconds
        moveTransition: 'transform 0.2s ease-out', // Smooth transition when moving
        appendTo: () => document.body, // Ensure popover is appended to body, not editor
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
          // Create content when showing
          createContent();
        },
        onHide() {
          // Cleanup content when hiding to prevent leaks
          if (root) {
            root.unmount();
            root = null;
            contentContainer = null;
          }
        },
        onDestroy() {
          // Cleanup React root
          if (root) {
            root.unmount();
          }
        },
      });
      
      // Prevent editor from handling clicks on this element
      const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent other handlers from running
        
        // Prevent editor from getting focus
        if (document.activeElement) {
          const activeElement = document.activeElement;
          if (activeElement.closest && activeElement.closest('.ProseMirror')) {
            activeElement.blur();
          }
        }
        
        // Toggle Tippy popover
        if (tippyInstance.state.isVisible) {
          tippyInstance.hide();
        } else {
          tippyInstance.show();
        }
      };
      
      element.addEventListener('click', handleClick, true);
      
      // Store cleanup function
      const cleanup = () => {
        element.removeEventListener('click', handleClick, true);
      };
      
      // Override onDestroy to include cleanup
      const originalOnDestroy = tippyInstance.props.onDestroy;
      tippyInstance.setProps({
        onDestroy() {
          cleanup();
          if (originalOnDestroy) originalOnDestroy();
        }
      });

      tippyInstancesRef.current.set(element, tippyInstance);
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

