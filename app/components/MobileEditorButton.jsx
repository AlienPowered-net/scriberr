import React, { useState } from 'react';
import { Button, Modal, Text, BlockStack } from '@shopify/polaris';
import AdvancedRTE from './AdvancedRTE';

const MobileEditorButton = ({ 
  value = '', 
  onChange, 
  placeholder = "Type your note here...",
  isMobile = false,
  hasUnsavedChanges = false,
  lastSavedTime = null,
  autoSaveTime = null
}) => {
  const [showEditorModal, setShowEditorModal] = useState(false);

  const openEditor = (e) => {
    console.log('Opening editor modal...', { showEditorModal });
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowEditorModal(true);
    console.log('Modal state set to true');
  };

  const closeEditor = () => {
    setShowEditorModal(false);
  };

  // If not mobile, return null (desktop should use normal editor)
  if (!isMobile) {
    return null;
  }

  // Get preview text (first 150 characters of content)
  const getPreviewText = () => {
    if (!value) return 'No content yet. Tap to start writing...';
    // Strip HTML tags for preview
    const textOnly = value.replace(/<[^>]*>/g, '').trim();
    return textOnly.length > 150 ? textOnly.substring(0, 150) + '...' : textOnly;
  };

  // Get current date/time for display
  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Get save status text and color
  const getSaveStatus = () => {
    if (hasUnsavedChanges) {
      return {
        text: "You have unsaved changes",
        color: "#d82c0d" // Red
      };
    }
    
    if (autoSaveTime) {
      return {
        text: `Auto Saved at ${autoSaveTime}`,
        color: "#008060" // Green
      };
    }
    
    if (lastSavedTime) {
      return {
        text: `Saved on ${lastSavedTime}`,
        color: "#008060" // Green
      };
    }
    
    return {
      text: getCurrentDateTime(),
      color: "#6d7175" // Default gray
    };
  };

  const previewText = getPreviewText();
  const hasContent = value && value.trim().length > 0;
  const saveStatus = getSaveStatus();

  return (
    <>
      {/* Mobile Note Card */}
      <div 
        className="mobile-note-card"
        style={{
          width: '100%',
          minHeight: '160px',
          padding: '20px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          margin: '0'
        }}
      >
          {/* Header with title and save status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Text variant="headingMd" fontWeight="semibold">
              {hasContent ? 'Note Content' : 'New Note'}
            </Text>
            <Text variant="bodySm" style={{ color: saveStatus.color, fontWeight: '500' }}>
              {saveStatus.text}
            </Text>
          </div>

          {/* Preview Content */}
          <div style={{
            marginBottom: '20px',
            minHeight: '60px'
          }}>
            <Text variant="bodyMd" color={hasContent ? "base" : "subdued"} style={{
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {previewText}
            </Text>
          </div>

          {/* Open Editor Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}>
            <Button
              size="large"
              variant={hasContent ? "primary" : "secondary"}
              onClick={(e) => {
                console.log('Button clicked!');
                e.preventDefault();
                e.stopPropagation();
                openEditor();
              }}
              style={{
                width: '100%',
                height: '48px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {hasContent ? 'Open Editor' : 'Start Writing'}
            </Button>
          </div>

          {/* Status indicator */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: hasContent ? '#28a745' : '#ffc107',
            border: '2px solid #ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }} />
        </div>

      {/* Custom Fullscreen Editor Modal */}
      {console.log('Rendering modal with showEditorModal:', showEditorModal)}
      {showEditorModal && (
        <div 
          className="mobile-fullscreen-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeEditor();
            }
          }}
        >
          {/* Modal Header */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderBottom: '1px solid #e1e3e5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Note Editor</h2>
            <button
              onClick={closeEditor}
              style={{
                padding: '8px 16px',
                backgroundColor: '#008060',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
          
          {/* Modal Content */}
          <div style={{
            flex: 1,
            backgroundColor: '#ffffff',
            overflow: 'hidden'
          }}>
            <AdvancedRTE
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              isMobileProp={true}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-note-card {
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
            pointer-events: auto;
            z-index: 1;
            margin: 0 !important;
            padding: 20px !important;
            box-sizing: border-box;
          }
          
          /* Ensure modal appears on top */
          .mobile-fullscreen-modal {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 10000 !important;
          }
          
          .mobile-note-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: #007bff;
          }
          
          .mobile-note-card:active {
            transform: scale(0.98) translateY(0);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .mobile-note-card:focus {
            outline: 2px solid #007bff;
            outline-offset: 2px;
          }
          
          /* Ensure input fields work properly */
          .mobile-note-card input,
          .mobile-note-card textarea {
            pointer-events: auto !important;
            z-index: 10 !important;
            position: relative !important;
          }
          
          /* Remove any unwanted spacing */
          .mobile-note-card * {
            box-sizing: border-box;
          }
          
          /* Ensure no extra margins or padding */
          .mobile-note-card {
            margin: 0 !important;
            padding: 20px !important;
            border: 1px solid #e1e3e5 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Ensure proper touch interaction */
          .mobile-note-card * {
            pointer-events: auto !important;
          }
          
          .mobile-note-card button {
            pointer-events: auto !important;
            z-index: 10 !important;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .mobile-note-card {
            background-color: #191919;
            border-color: #373737;
          }
          
          .mobile-note-card:hover {
            background-color: #202020;
          }
        }
      `}</style>
    </>
  );
};

export default MobileEditorButton;