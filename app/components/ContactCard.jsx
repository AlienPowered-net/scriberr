import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Text,
  InlineStack,
  BlockStack,
  Button,
  Modal,
  Icon,
  Badge,
  Tooltip,
  ButtonGroup,
  Avatar
} from '@shopify/polaris';
import {
  PersonIcon,
  OrganizationIcon,
  PhoneIcon,
  EmailIcon,
  CollectionIcon,
  EditIcon,
  XIcon,
  DuplicateIcon
} from '@shopify/polaris-icons';

const ContactCard = ({ 
  contact, 
  variant = 'tooltip', // 'tooltip' or 'modal'
  isVisible = false,
  onClose,
  onEdit,
  position = { x: 0, y: 0 }
}) => {
  const [copiedField, setCopiedField] = useState(null);
  const cardRef = useRef(null);

  // Get contact initials for avatar
  const getInitials = () => {
    if (contact.type === 'PERSON') {
      const first = (contact.firstName || '').trim();
      const last = (contact.lastName || '').trim();
      if (first && last) {
        return (first[0] + last[0]).toUpperCase();
      } else if (first) {
        return first.substring(0, 2).toUpperCase();
      } else if (last) {
        return last.substring(0, 2).toUpperCase();
      }
      return 'UN';
    } else {
      const business = (contact.businessName || '').trim();
      if (business.length >= 2) {
        return business.substring(0, 2).toUpperCase();
      } else if (business.length === 1) {
        return business[0].toUpperCase();
      }
      return 'BU';
    }
  };

  // Handle copy to clipboard
  const handleCopy = async (text, fieldName) => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Copy button component
  const CopyButton = ({ text, fieldName, size = "micro" }) => (
    <Tooltip content={copiedField === fieldName ? "Copied!" : "Copy to clipboard"}>
      <Button
        size={size}
        icon={DuplicateIcon}
        onClick={() => handleCopy(text, fieldName)}
        disabled={copiedField === fieldName}
        tone={copiedField === fieldName ? "success" : "subdued"}
      />
    </Tooltip>
  );

  // Get contact display name
  const getDisplayName = () => {
    if (contact.type === 'PERSON') {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Person';
    } else {
      return contact.businessName || 'Unnamed Business';
    }
  };

  // Get contact type icon
  const getTypeIcon = () => {
    return contact.type === 'PERSON' ? PersonIcon : OrganizationIcon;
  };

  // Get contact type color
  const getTypeColor = () => {
    return contact.type === 'PERSON' ? 'info' : 'success';
  };

  // Render contact info section
  const renderContactInfo = () => (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      {/* Header with avatar and name */}
      <div style={{ marginBottom: '24px' }}>
        <InlineStack gap="300" blockAlign="center">
          <div style={{ 
            borderRadius: '50%', 
            overflow: 'hidden', 
            width: '60px', 
            height: '60px',
            border: '2px solid #e1e3e5'
          }}>
            <Avatar initials={getInitials()} size="large" />
          </div>
          <div>
            <Text as="h2" variant="headingLg" fontWeight="bold" style={{ margin: 0, color: '#202223' }}>
              {getDisplayName()}
            </Text>
            {contact.role && (
              <Text as="p" variant="bodyMd" style={{ color: '#6d7175', margin: '4px 0 0 0' }}>
                {contact.role}
              </Text>
            )}
          </div>
        </InlineStack>
        <div style={{ marginTop: '12px' }}>
          <Badge tone={getTypeColor()}>
            {contact.type === 'PERSON' ? 'Person' : 'Business'}
          </Badge>
        </div>
      </div>

      {/* Company Information Section */}
      {contact.company && (
        <div style={{ marginBottom: '24px' }}>
          <Text as="h3" variant="headingSm" fontWeight="semibold" style={{ color: '#202223', marginBottom: '12px' }}>
            Company Information
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Icon source={CollectionIcon} tone="subdued" />
            <Text as="span" variant="bodyMd" style={{ color: '#6d7175' }}>Company</Text>
            <Text as="span" variant="bodyMd" style={{ color: '#202223', marginLeft: '8px' }}>
              {contact.company}
            </Text>
          </div>
          {contact.role && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icon source={PersonIcon} tone="subdued" />
              <Text as="span" variant="bodyMd" style={{ color: '#6d7175' }}>Role</Text>
              <Text as="span" variant="bodyMd" style={{ color: '#202223', marginLeft: '8px' }}>
                {contact.role}
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Contact Information Section */}
      <div style={{ marginBottom: '24px' }}>
        <Text as="h3" variant="headingSm" fontWeight="semibold" style={{ color: '#202223', marginBottom: '12px' }}>
          Contact Information
        </Text>
        <BlockStack gap="200">
          {contact.email && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon source={EmailIcon} tone="subdued" />
                <Text as="span" variant="bodyMd" style={{ color: '#202223' }}>
                  {contact.email}
                </Text>
              </div>
              {variant === 'modal' && (
                <CopyButton text={contact.email} fieldName="email" />
              )}
            </div>
          )}

          {contact.phone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon source={PhoneIcon} tone="subdued" />
                <Text as="span" variant="bodyMd" style={{ color: '#202223' }}>
                  {contact.phone}
                </Text>
              </div>
              {variant === 'modal' && (
                <CopyButton text={contact.phone} fieldName="phone" />
              )}
            </div>
          )}

          {contact.mobile && contact.mobile !== contact.phone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon source={PhoneIcon} tone="subdued" />
                <Text as="span" variant="bodyMd" style={{ color: '#202223' }}>
                  {contact.mobile} (Mobile)
                </Text>
              </div>
              {variant === 'modal' && (
                <CopyButton text={contact.mobile} fieldName="mobile" />
              )}
            </div>
          )}
        </BlockStack>
      </div>

      {/* Business points of contact */}
      {contact.type === 'BUSINESS' && contact.pointsOfContact && contact.pointsOfContact.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <Text as="h3" variant="headingSm" fontWeight="semibold" style={{ color: '#202223', marginBottom: '12px' }}>
            Points of Contact
          </Text>
          <BlockStack gap="200">
            {contact.pointsOfContact.map((point, index) => (
              <div key={index} style={{
                background: '#f6f6f7',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #e1e3e5'
              }}>
                <BlockStack gap="200">
                  {point.name && (
                    <Text as="p" variant="bodyMd" fontWeight="medium" style={{ color: '#202223', margin: 0 }}>
                      {point.name}
                    </Text>
                  )}
                  {point.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon source={PhoneIcon} tone="subdued" />
                        <Text as="span" variant="bodyMd" style={{ color: '#6d7175' }}>
                          {point.phone}
                        </Text>
                      </div>
                      {variant === 'modal' && (
                        <CopyButton text={point.phone} fieldName={`point-phone-${index}`} />
                      )}
                    </div>
                  )}
                  {point.email && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon source={EmailIcon} tone="subdued" />
                        <Text as="span" variant="bodyMd" style={{ color: '#6d7175' }}>
                          {point.email}
                        </Text>
                      </div>
                      {variant === 'modal' && (
                        <CopyButton text={point.email} fieldName={`point-email-${index}`} />
                      )}
                    </div>
                  )}
                </BlockStack>
              </div>
            ))}
          </BlockStack>
        </div>
      )}

      {/* Summary/Memo Section */}
      {contact.memo && (
        <div>
          <Text as="h3" variant="headingSm" fontWeight="semibold" style={{ color: '#202223', marginBottom: '12px' }}>
            Summary
          </Text>
          <div style={{
            background: '#f6f6f7',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid #e1e3e5'
          }}>
            <Text as="p" variant="bodyMd" style={{ color: '#6d7175', margin: 0 }}>
              {contact.memo}
            </Text>
          </div>
        </div>
      )}
    </div>
  );

  // Tooltip variant
  if (variant === 'tooltip') {
    if (!isVisible || !contact) return null;

    return (
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          maxWidth: '300px',
          backgroundColor: 'white',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '16px',
          pointerEvents: 'none'
        }}
      >
        <Card sectioned>
          {renderContactInfo()}
        </Card>
      </div>
    );
  }

  // Modal variant
  return (
    <Modal
      open={isVisible}
      onClose={onClose}
      title=""
      size="small"
      primaryAction={onEdit ? {
        content: 'Edit Contact',
        icon: EditIcon,
        onAction: onEdit
      } : undefined}
      secondaryActions={[
        {
          content: 'Close',
          icon: XIcon,
          onAction: onClose
        }
      ]}
    >
      <Modal.Section>
        {renderContactInfo()}
      </Modal.Section>
    </Modal>
  );
};

export default ContactCard;
