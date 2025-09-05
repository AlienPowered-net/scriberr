// Utility to handle folder icons with fallback for migration status
export const addIconFieldsToFolders = (folders, localIconData = {}) => {
  return folders.map(folder => ({
    ...folder,
    icon: folder.icon || localIconData[folder.id]?.icon || 'folder',
    iconColor: folder.iconColor || localIconData[folder.id]?.iconColor || '#f57c00'
  }));
};

export const createFolderWithIcon = async (folderData) => {
  try {
    const response = await fetch('/api/create-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderData)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

export const updateFolderIcon = async (folderId, iconData) => {
  try {
    const response = await fetch('/api/update-folder-icon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folderId,
        icon: iconData.icon,
        color: iconData.color
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error updating folder icon:', error);
    throw error;
  }
};