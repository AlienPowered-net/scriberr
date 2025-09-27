import React, { useState } from 'react';
import { Button, Modal, Text, BlockStack } from '@shopify/polaris';
import AdvancedRTE from './AdvancedRTE';

const MobileEditorButton = ({ 
  value = '', 
  onChange, 
  placeholder = "Type your note here...",
  isMobile = false 
}) => {
  const [showEditorModal, setShowEditorModal] = useState(false);

  const openEditor = () => {
    console.log('Opening editor modal...');
    setShowEditorModal(true);
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

  const previewText = getPreviewText();
  const hasContent = value && value.trim().length > 0;
  const currentDateTime = getCurrentDateTime();

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
        onClick={openEditor}
      >
          {/* Header with icon and date */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                fontSize: '24px',
                color: hasContent ? '#007bff' : '#6c757d'
              }}>
                {hasContent ? '📄' : '📝'}
              </div>
              <Text variant="headingMd" fontWeight="semibold">
                {hasContent ? 'Note Content' : 'New Note'}
              </Text>
            </div>
            <Text variant="bodySm" color="subdued">
              {currentDateTime}
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

          {/* Edit Button */}
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
                e.stopPropagation();
                openEditor();
              }}
              style={{
                minWidth: '200px',
                height: '48px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {hasContent ? 'Edit Note' : 'Start Writing'}
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

      {/* Fullscreen Editor Modal */}
      <Modal
        open={showEditorModal}
        onClose={closeEditor}
        title="Note Editor"
        size="fullScreen"
        primaryAction={{
          content: 'Done',
          onAction: closeEditor,
        }}
      >
        <Modal.Section>
          <div style={{
            height: 'calc(100vh - 140px)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '0'
          }}>
            <div style={{
              height: '100%',
              width: '100%',
              border: '1px solid #e1e3e5',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <AdvancedRTE
                value={value}
                onChange={onChange}
                placeholder={placeholder}
              />
            </div>
          </div>
        </Modal.Section>
      </Modal>

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