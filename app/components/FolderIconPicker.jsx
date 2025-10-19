import React, { useState } from 'react';
import { Modal, Button, Text, InlineStack } from '@shopify/polaris';

const FolderIconPicker = ({ 
  isOpen, 
  onClose, 
  onSelectIcon, 
  currentIcon = "folder",
  currentColor = "rgba(255, 184, 0, 1)",
  folderName = "Folder",
  showOnlyColor = false,
  selectedIcon = "folder",
  selectedColor = "rgba(255, 184, 0, 1)",
  onColorChange
}) => {
  const [selectedIcon, setSelectedIcon] = useState(selectedIcon);
  const [selectedColor, setSelectedColor] = useState(selectedColor);

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
    { color: "rgba(1, 75, 64, 1)", name: "Green", activeColor: "rgba(2, 38, 34, 1)" },
    { color: "rgba(199, 10, 36, 1)", name: "Red", activeColor: "rgba(142, 11, 33, 1)" },
    { color: "rgba(255, 184, 0, 1)", name: "Orange", activeColor: "rgba(178, 132, 0, 1)" },
    { color: "rgba(255, 230, 0, 1)", name: "Yellow", activeColor: "rgba(225, 203, 0, 1)" },
    { color: "rgba(227, 227, 227, 1)", name: "White", activeColor: "rgba(181, 181, 181, 1)" },
    { color: "rgba(48, 48, 48, 1)", name: "Black", activeColor: "rgba(26, 26, 26, 1)" },
    { color: "rgba(0, 91, 211, 1)", name: "Blue", activeColor: "rgba(0, 46, 106, 1)" },
    { color: "rgba(128, 81, 255, 1)", name: "Purple", activeColor: "rgba(87, 0, 209, 1)" }
  ];

  const handleSave = () => {
    if (onSelectIcon) {
      onSelectIcon({ icon: selectedIcon, color: selectedColor });
      onClose();
    }
  };

  const handleColorClick = (color) => {
    setSelectedColor(color);
    if (onColorChange) {
      onColorChange(color);
    }
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
      style={{ zIndex: 10001 }}
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
                boxShadow: colorData.color === 'rgba(227, 227, 227, 1)' ? 'inset 0 0 0 1px #e1e3e5' : 'none'
              }}
              title={colorData.name}
            >
              {selectedColor === colorData.color && (
                <i className="fas fa-check" style={{ 
                  color: colorData.color === 'rgba(255, 230, 0, 1)' || colorData.color === 'rgba(227, 227, 227, 1)' ? 'rgba(48, 48, 48, 1)' : 'white',
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