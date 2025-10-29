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
  CopyIcon
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
        icon={CopyIcon}
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '24px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background pattern */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '200px',
        height: '200px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-30px',
        width: '150px',
        height: '150px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        zIndex: 0
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header with name and type */}
        <InlineStack align="space-between" blockAlign="center" wrap={false}>
          <InlineStack gap="300" blockAlign="center">
            <div style={{ 
              borderRadius: '12px', 
              overflow: 'hidden', 
              width: '64px', 
              height: '64px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              <Avatar initials={getInitials()} size="large" />
            </div>
            <BlockStack gap="100">
              <Text as="h2" variant="headingLg" fontWeight="bold" style={{ color: 'white', margin: 0 }}>
                {getDisplayName()}
              </Text>
              {contact.role && (
                <Text as="p" variant="bodyMd" style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                  {contact.role}
                </Text>
              )}
            </BlockStack>
          </InlineStack>
          <Badge tone="info" size="large">
            {contact.type === 'PERSON' ? 'Person' : 'Business'}
          </Badge>
        </InlineStack>

        {/* Company/Business info */}
        {contact.company && (
          <div style={{ marginTop: '16px' }}>
            <InlineStack gap="200" blockAlign="center">
              <Icon source={CollectionIcon} tone="subdued" />
              <Text as="span" variant="bodyLg" fontWeight="medium" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {contact.company}
              </Text>
            </InlineStack>
          </div>
        )}

        {/* Contact details */}
        <div style={{ marginTop: '20px' }}>
          <BlockStack gap="300">
            {contact.email && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                backdropFilter: 'blur(10px)'
              }}>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={EmailIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd" style={{ color: 'white' }}>
                      {contact.email}
                    </Text>
                  </InlineStack>
                    {variant === 'modal' && (
                      <CopyButton text={contact.email} fieldName="email" />
                    )}
                </InlineStack>
              </div>
            )}

            {contact.phone && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                backdropFilter: 'blur(10px)'
              }}>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={PhoneIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd" style={{ color: 'white' }}>
                      {contact.phone}
                    </Text>
                  </InlineStack>
                    {variant === 'modal' && (
                      <CopyButton text={contact.phone} fieldName="phone" />
                    )}
                </InlineStack>
              </div>
            )}

            {contact.mobile && contact.mobile !== contact.phone && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                backdropFilter: 'blur(10px)'
              }}>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={PhoneIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd" style={{ color: 'white' }}>
                      {contact.mobile} (Mobile)
                    </Text>
                  </InlineStack>
                    {variant === 'modal' && (
                      <CopyButton text={contact.mobile} fieldName="mobile" />
                    )}
                </InlineStack>
              </div>
            )}
          </BlockStack>
        </div>

        {/* Business points of contact */}
        {contact.type === 'BUSINESS' && contact.pointsOfContact && contact.pointsOfContact.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <Text as="h4" variant="headingSm" fontWeight="semibold" style={{ color: 'white', marginBottom: '12px' }}>
              Points of Contact
            </Text>
            <BlockStack gap="200">
              {contact.pointsOfContact.map((point, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '16px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <BlockStack gap="200">
                    {point.name && (
                      <Text as="p" variant="bodyMd" fontWeight="medium" style={{ color: 'white', margin: 0 }}>
                        {point.name}
                      </Text>
                    )}
                    {point.phone && (
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Icon source={PhoneIcon} tone="subdued" />
                          <Text as="span" variant="bodyMd" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {point.phone}
                          </Text>
                        </InlineStack>
                        {variant === 'modal' && (
                          <CopyButton text={point.phone} fieldName={`point-phone-${index}`} />
                        )}
                      </InlineStack>
                    )}
                    {point.email && (
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" blockAlign="center">
                          <Icon source={EmailIcon} tone="subdued" />
                          <Text as="span" variant="bodyMd" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                            {point.email}
                          </Text>
                        </InlineStack>
                        {variant === 'modal' && (
                          <CopyButton text={point.email} fieldName={`point-email-${index}`} />
                        )}
                      </InlineStack>
                    )}
                  </BlockStack>
                </div>
              ))}
            </BlockStack>
          </div>
        )}

        {/* Memo */}
        {contact.memo && (
          <div style={{ marginTop: '20px' }}>
            <Text as="h4" variant="headingSm" fontWeight="semibold" style={{ color: 'white', marginBottom: '8px' }}>
              Notes
            </Text>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              backdropFilter: 'blur(10px)'
            }}>
              <Text as="p" variant="bodyMd" style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0 }}>
                {contact.memo}
              </Text>
            </div>
          </div>
        )}
      </div>
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
      size="large"
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
