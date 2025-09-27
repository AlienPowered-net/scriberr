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
    setShowEditorModal(true);
  };

  const closeEditor = () => {
    setShowEditorModal(false);
  };

  // If not mobile, return null (desktop should use normal editor)
  if (!isMobile) {
    return null;
  }

  // Get preview text (first 100 characters of content)
  const getPreviewText = () => {
    if (!value) return placeholder;
    // Strip HTML tags for preview
    const textOnly = value.replace(/<[^>]*>/g, '');
    return textOnly.length > 100 ? textOnly.substring(0, 100) + '...' : textOnly;
  };

  const previewText = getPreviewText();
  const hasContent = value && value.trim().length > 0;

  return (
    <>
      {/* Mobile Editor Button */}
      <div 
        className="mobile-editor-button"
        style={{
          width: '100%',
          minHeight: '140px',
          border: hasContent ? '2px solid #007bff' : '2px dashed #e1e3e5',
          borderRadius: '12px',
          backgroundColor: hasContent ? '#f8f9fa' : '#ffffff',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          boxShadow: hasContent ? '0 2px 8px rgba(0, 123, 255, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
        onClick={openEditor}
      >
        {/* Editor Icon */}
        <div style={{
          fontSize: '40px',
          marginBottom: '16px',
          color: hasContent ? '#007bff' : '#6c757d',
          filter: hasContent ? 'drop-shadow(0 2px 4px rgba(0, 123, 255, 0.2))' : 'none'
        }}>
          {hasContent ? '✏️' : '📝'}
        </div>

        {/* Button Text */}
        <Button
          size="large"
          variant={hasContent ? "primary" : "secondary"}
          onClick={(e) => {
            e.stopPropagation();
            openEditor();
          }}
          style={{
            marginBottom: '12px',
            minWidth: '180px',
            height: '44px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {hasContent ? 'Edit Note' : 'Open Editor'}
        </Button>

        {/* Preview Text */}
        {hasContent && (
          <Text variant="bodySm" color="subdued" alignment="center" style={{
            maxWidth: '280px',
            lineHeight: '1.4',
            marginTop: '4px'
          }}>
            {previewText}
          </Text>
        )}

        {/* Hint Text */}
        {!hasContent && (
          <Text variant="bodySm" color="subdued" alignment="center" style={{
            maxWidth: '280px',
            lineHeight: '1.4'
          }}>
            Tap to start writing your note
          </Text>
        )}

        {/* Corner indicator */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: hasContent ? '#007bff' : '#e1e3e5',
          transition: 'background-color 0.2s ease'
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
          .mobile-editor-button {
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
          }
          
          .mobile-editor-button:hover {
            border-color: #007bff;
            background-color: #f8f9fa;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
          }
          
          .mobile-editor-button:active {
            transform: scale(0.98) translateY(0);
            box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
          }
          
          .mobile-editor-button:focus {
            outline: 2px solid #007bff;
            outline-offset: 2px;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .mobile-editor-button {
            background-color: #191919;
            border-color: #373737;
          }
          
          .mobile-editor-button:hover {
            background-color: #202020;
          }
        }
      `}</style>
    </>
  );
};

export default MobileEditorButton;