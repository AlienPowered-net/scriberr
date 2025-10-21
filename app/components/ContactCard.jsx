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
  XIcon
} from '@shopify/polaris-icons';

const ContactCard = ({ 
  contact, 
  variant = 'tooltip', // 'tooltip' or 'modal'
  isVisible = false,
  onClose,
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
    <BlockStack gap="200">
      {/* Header with name and type */}
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <div style={{ borderRadius: '10px', overflow: 'hidden', width: '48px', height: '48px' }}>
            <Avatar initials={getInitials()} size="large" />
          </div>
          <Text as="h3" variant="headingMd" fontWeight="semibold">
            {getDisplayName()}
          </Text>
        </InlineStack>
        <Badge tone={getTypeColor()}>
          {contact.type === 'PERSON' ? 'Person' : 'Business'}
        </Badge>
      </InlineStack>

      {/* Company/Business info */}
      {contact.company && (
        <InlineStack gap="200" blockAlign="center">
          <Icon source={CollectionIcon} tone="subdued" />
          <Text as="span" variant="bodyMd">
            {contact.company}
          </Text>
        </InlineStack>
      )}

      {/* Role */}
      {contact.role && (
        <Text as="p" variant="bodyMd" tone="subdued">
          {contact.role}
        </Text>
      )}

      {/* Contact details */}
      <BlockStack gap="100">
        {contact.email && (
          <InlineStack gap="200" blockAlign="center">
            <Icon source={EmailIcon} tone="subdued" />
            <Text as="span" variant="bodyMd">
              {contact.email}
            </Text>
            {variant === 'modal' && (
              <Button
                size="micro"
                icon={EditIcon}
                onClick={() => handleCopy(contact.email, 'email')}
                disabled={copiedField === 'email'}
              >
                {copiedField === 'email' ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </InlineStack>
        )}

        {contact.phone && (
          <InlineStack gap="200" blockAlign="center">
            <Icon source={PhoneIcon} tone="subdued" />
            <Text as="span" variant="bodyMd">
              {contact.phone}
            </Text>
            {variant === 'modal' && (
              <Button
                size="micro"
                icon={EditIcon}
                onClick={() => handleCopy(contact.phone, 'phone')}
                disabled={copiedField === 'phone'}
              >
                {copiedField === 'phone' ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </InlineStack>
        )}

        {contact.mobile && contact.mobile !== contact.phone && (
          <InlineStack gap="200" blockAlign="center">
            <Icon source={PhoneIcon} tone="subdued" />
            <Text as="span" variant="bodyMd">
              {contact.mobile} (Mobile)
            </Text>
            {variant === 'modal' && (
              <Button
                size="micro"
                icon={EditIcon}
                onClick={() => handleCopy(contact.mobile, 'mobile')}
                disabled={copiedField === 'mobile'}
              >
                {copiedField === 'mobile' ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </InlineStack>
        )}
      </BlockStack>

      {/* Business points of contact */}
      {contact.type === 'BUSINESS' && contact.pointsOfContact && contact.pointsOfContact.length > 0 && (
        <BlockStack gap="200">
          <Text as="h4" variant="headingSm" fontWeight="semibold">
            Points of Contact
          </Text>
          {contact.pointsOfContact.map((point, index) => (
            <Card key={index} sectioned>
              <BlockStack gap="100">
                {point.name && (
                  <Text as="p" variant="bodyMd" fontWeight="medium">
                    {point.name}
                  </Text>
                )}
                {point.phone && (
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={PhoneIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd">
                      {point.phone}
                    </Text>
                    {variant === 'modal' && (
                      <Button
                        size="micro"
                        icon={EditIcon}
                        onClick={() => handleCopy(point.phone, `point-phone-${index}`)}
                        disabled={copiedField === `point-phone-${index}`}
                      >
                        {copiedField === `point-phone-${index}` ? 'Copied!' : 'Copy'}
                      </Button>
                    )}
                  </InlineStack>
                )}
                {point.email && (
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={EmailIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd">
                      {point.email}
                    </Text>
                    {variant === 'modal' && (
                      <Button
                        size="micro"
                        icon={EditIcon}
                        onClick={() => handleCopy(point.email, `point-email-${index}`)}
                        disabled={copiedField === `point-email-${index}`}
                      >
                        {copiedField === `point-email-${index}` ? 'Copied!' : 'Copy'}
                      </Button>
                    )}
                  </InlineStack>
                )}
              </BlockStack>
            </Card>
          ))}
        </BlockStack>
      )}

      {/* Memo */}
      {contact.memo && (
        <BlockStack gap="100">
          <Text as="h4" variant="headingSm" fontWeight="semibold">
            Notes
          </Text>
          <Text as="p" variant="bodyMd">
            {contact.memo}
          </Text>
        </BlockStack>
      )}
    </BlockStack>
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
      title={getDisplayName()}
      size="medium"
      primaryAction={{
        content: 'Close',
        onAction: onClose
      }}
    >
      <Modal.Section>
        <Card sectioned>
          {renderContactInfo()}
        </Card>
      </Modal.Section>
    </Modal>
  );
};

export default ContactCard;
