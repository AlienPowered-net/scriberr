import React, { useState } from 'react';
import { Modal, Button, Text, InlineStack } from '@shopify/polaris';

const FolderIconPicker = ({ 
  isOpen, 
  onClose, 
  onSelectIcon, 
  currentIcon = "folder",
  currentColor = "#f57c00",
  folderName = "Folder"
}) => {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const folderIcons = [
    { icon: "folder", name: "Folder" },
    { icon: "folder-open", name: "Folder Open" },
    { icon: "image", name: "Image" },
    { icon: "house", name: "House" },
    { icon: "face-smile", name: "Smile" },
    { icon: "star", name: "Star" },
    { icon: "heart", name: "Heart" },
    { icon: "address-book", name: "Address Book" },
    { icon: "bookmark", name: "Bookmark" },
    { icon: "pen-to-square", name: "Compose" },
    { icon: "user", name: "User" },
    { icon: "gem", name: "Gem" },
    { icon: "square-check", name: "Check" },
    { icon: "trash-can", name: "Trash" },
    { icon: "flag", name: "Flag" },
    { icon: "calendar", name: "Calendar" },
    { icon: "lightbulb", name: "Light Bulb" },
    { icon: "bell", name: "Bell" },
    { icon: "truck", name: "Truck" },
    { icon: "file-code", name: "Code" }
  ];

  const iconColors = [
    { color: "#16a34a", name: "Green" },
    { color: "#dc2626", name: "Red" },
    { color: "#f57c00", name: "Orange" },
    { color: "#facc15", name: "Yellow" },
    { color: "#ffffff", name: "White" },
    { color: "#374151", name: "Black" },
    { color: "#2563eb", name: "Blue" },
    { color: "#9333ea", name: "Purple" }
  ];

  const handleSave = () => {
    onSelectIcon({ icon: selectedIcon, color: selectedColor });
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Change Icon for "${folderName}"`}
      primaryAction={{
        content: 'Save Icon',
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <div style={{ marginBottom: '16px' }}>
          <Text variant="bodyMd" as="p">
            Current icon: <i className={`far fa-${currentIcon}`} style={{ fontSize: '24px', marginLeft: '8px', color: currentColor }}></i>
          </Text>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <Text variant="bodyMd" as="p">
            Selected icon: <i className={`far fa-${selectedIcon}`} style={{ fontSize: '24px', marginLeft: '8px', color: selectedColor }}></i>
          </Text>
        </div>

        <Text variant="headingSm" as="h3" style={{ marginBottom: '12px' }}>
          Choose an icon:
        </Text>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          marginBottom: '24px',
          padding: '8px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          backgroundColor: '#fafbfb'
        }}>
          {folderIcons.map((iconData, index) => (
            <button
              key={index}
              onClick={() => setSelectedIcon(iconData.icon)}
              style={{
                width: '50px',
                height: '50px',
                border: selectedIcon === iconData.icon ? '2px solid #2e7d32' : '1px solid #e1e3e5',
                borderRadius: '8px',
                backgroundColor: selectedIcon === iconData.icon ? '#e8f5e8' : 'white',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'all 0.2s ease',
                padding: '4px'
              }}
              title={iconData.name}
            >
              <i className={`far fa-${iconData.icon}`} style={{ color: selectedColor }}></i>
            </button>
          ))}
        </div>

        <Text variant="headingSm" as="h3" style={{ marginBottom: '12px' }}>
          Choose a color:
        </Text>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '8px',
          padding: '8px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          backgroundColor: '#fafbfb'
        }}>
          {iconColors.map((colorData, index) => (
            <button
              key={index}
              onClick={() => setSelectedColor(colorData.color)}
              style={{
                width: '40px',
                height: '40px',
                border: selectedColor === colorData.color ? '3px solid #2e7d32' : '2px solid #e1e3e5',
                borderRadius: '50%',
                backgroundColor: colorData.color,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: colorData.color === '#ffffff' ? 'inset 0 0 0 1px #e1e3e5' : 'none'
              }}
              title={colorData.name}
            >
              {selectedColor === colorData.color && (
                <i className="fas fa-check" style={{ 
                  color: colorData.color === '#ffffff' || colorData.color === '#facc15' ? '#374151' : 'white',
                  fontSize: '14px' 
                }}></i>
              )}
            </button>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  );
};

export default FolderIconPicker;