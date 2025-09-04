import React, { useState } from 'react';
import { Modal, Button, Text, InlineStack } from '@shopify/polaris';

const FolderIconPicker = ({ 
  isOpen, 
  onClose, 
  onSelectIcon, 
  currentIcon = "📁",
  folderName = "Folder"
}) => {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);

  const folderIcons = [
    "📁", "📂", "🗂️", "📋", "📊", "📈", "📉", "📌", "📍", "🔖",
    "🏷️", "📝", "📄", "📃", "📑", "📜", "🗃️", "🗄️", "📚", "📖",
    "📘", "📙", "📗", "📕", "📓", "📔", "📒", "📰", "🗞️", "📦",
    "📫", "📪", "📬", "📭", "📮", "🎯", "🎪", "🎨", "🎭", "🎪",
    "💼", "👜", "🎒", "💰", "💎", "🔥", "⭐", "🌟", "✨", "💫",
    "🚀", "🎉", "🎊", "🏆", "🥇", "🏅", "🎖️", "🔔", "📢", "📣",
    "💡", "🔍", "🔎", "🔗", "⚡", "🌈", "🔮", "🎲", "🧩", "🔧",
    "⚙️", "🛠️", "🔨", "⚒️", "🪓", "⛏️", "🔩", "⚖️", "🧭", "🗺️"
  ];

  const handleSave = () => {
    onSelectIcon(selectedIcon);
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
            Current icon: <span style={{ fontSize: '24px', marginLeft: '8px' }}>{currentIcon}</span>
          </Text>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <Text variant="bodyMd" as="p">
            Selected icon: <span style={{ fontSize: '24px', marginLeft: '8px' }}>{selectedIcon}</span>
          </Text>
        </div>

        <Text variant="headingSm" as="h3" style={{ marginBottom: '12px' }}>
          Choose a new icon:
        </Text>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '8px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          backgroundColor: '#fafbfb'
        }}>
          {folderIcons.map((icon, index) => (
            <button
              key={index}
              onClick={() => setSelectedIcon(icon)}
              style={{
                width: '40px',
                height: '40px',
                border: selectedIcon === icon ? '2px solid #2e7d32' : '1px solid #e1e3e5',
                borderRadius: '6px',
                backgroundColor: selectedIcon === icon ? '#e8f5e8' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transition: 'all 0.2s ease',
                ':hover': {
                  borderColor: '#2e7d32',
                  backgroundColor: '#f0f9f0'
                }
              }}
              title={`Select ${icon}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </Modal.Section>
    </Modal>
  );
};

export default FolderIconPicker;