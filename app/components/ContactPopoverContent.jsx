/**
 * ContactPopoverContent.jsx
 * 
 * The content component for the Tippy popover.
 * This is rendered inside the popover and handles contact data fetching and display.
 */

import React, { useState, useEffect } from 'react';
import {
  Text,
  InlineStack,
  BlockStack,
  Button,
  Icon,
  Tooltip,
  Avatar,
  Badge,
  Spinner,
} from '@shopify/polaris';
import {
  PersonIcon,
  OrganizationIcon,
  PhoneIcon,
  EmailIcon,
  CollectionIcon,
  EditIcon,
  DuplicateIcon,
} from '@shopify/polaris-icons';

export default function ContactPopoverContent({ contactId, contactType, onEdit }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Fetch contact data
  useEffect(() => {
    if (!contactId) return;

    const fetchContact = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/contacts');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contacts = await response.json();
        
        // API returns array directly, not wrapped in { success, contacts }
        if (Array.isArray(contacts)) {
          const foundContact = contacts.find(c => c.id === contactId);
          if (foundContact) {
            setContact(foundContact);
          } else {
            setError('Contact not found');
          }
        } else {
          setError('Failed to load contact');
        }
      } catch (err) {
        console.error('Error fetching contact:', err);
        setError('Failed to load contact');
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [contactId]);

  // Handle copy to clipboard
  const handleCopy = async (text, fieldName) => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Copy button component
  const CopyButton = ({ text, fieldName, size = "micro" }) => (
    <Tooltip content={copiedField === fieldName ? "Copied!" : "Copy to clipboard"}>
      <Button
        size={size}
        icon={DuplicateIcon}
        onClick={(e) => {
          e.stopPropagation();
          handleCopy(text, fieldName);
        }}
        disabled={copiedField === fieldName}
        tone={copiedField === fieldName ? "success" : "subdued"}
      />
    </Tooltip>
  );

  // Get contact initials for avatar
  const getInitials = () => {
    if (!contact) return 'UN';
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

  // Get contact display name
  const getDisplayName = () => {
    if (!contact) return 'Loading...';
    if (contact.type === 'PERSON') {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Person';
    } else {
      return contact.businessName || 'Unnamed Business';
    }
  };

  // Handle edit contact
  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', minWidth: '200px' }}>
        <Spinner size="small" />
        <Text as="p" variant="bodySm" style={{ marginTop: '12px', color: '#6d7175' }}>
          Loading contact...
        </Text>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', minWidth: '200px' }}>
        <Text as="p" variant="bodyMd" tone="critical">
          {error || 'Contact not found'}
        </Text>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      minWidth: '360px',
      maxWidth: '400px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <BlockStack gap="400">
        {/* Header with avatar and name */}
        <div>
          <InlineStack gap="300" blockAlign="center">
            <div style={{ 
              borderRadius: '50%', 
              overflow: 'hidden', 
              width: '56px', 
              height: '56px',
              border: '2px solid #e1e3e5',
              flexShrink: 0,
            }}>
              <Avatar initials={getInitials()} size="large" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text as="h3" variant="headingMd" fontWeight="bold" style={{ margin: 0, color: '#202223' }}>
                {getDisplayName()}
              </Text>
              {contact.role && (
                <Text as="p" variant="bodySm" style={{ color: '#6d7175', margin: '4px 0 0 0' }}>
                  {contact.role}
                </Text>
              )}
            </div>
          </InlineStack>
          <div style={{ marginTop: '12px' }}>
            <InlineStack gap="200" wrap>
              <Badge tone={contact.type === 'PERSON' ? 'info' : 'success'}>
                {contact.type === 'PERSON' ? 'Person' : 'Business'}
              </Badge>
              {contact.folder && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: `${contact.folder.iconColor || '#f57c00'}15`,
                    border: `1px solid ${contact.folder.iconColor || '#f57c00'}40`,
                    fontSize: '12px',
                    fontWeight: '500',
                    color: contact.folder.iconColor || '#f57c00',
                  }}
                >
                  <i className={`far fa-${contact.folder.icon || 'folder'}`} style={{ fontSize: '12px' }}></i>
                  <span>{contact.folder.name}</span>
                </div>
              )}
              {contact.tags && contact.tags.length > 0 && contact.tags.map((tag, index) => (
                <div
                  key={index}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: '#f6f6f7',
                    border: '1px solid #e1e3e5',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6d7175',
                  }}
                >
                  {tag}
                </div>
              ))}
            </InlineStack>
          </div>
        </div>

        {/* Company Information */}
        {contact.company && (
          <div>
            <Text as="h4" variant="headingSm" fontWeight="semibold" style={{ color: '#202223', marginBottom: '8px' }}>
              Company
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <Icon source={CollectionIcon} tone="subdued" />
                <Text as="span" variant="bodyMd" style={{ color: '#202223', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {contact.company}
                </Text>
              </div>
              <CopyButton text={contact.company} fieldName="company" />
            </div>
          </div>
        )}

        {/* Contact Information */}
        {(contact.email || contact.phone || contact.mobile) && (
          <div>
            <Text as="h4" variant="headingSm" fontWeight="semibold" style={{ color: '#202223', marginBottom: '8px' }}>
              Contact Information
            </Text>
            <BlockStack gap="200">
              {contact.email && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <Icon source={EmailIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd" style={{ color: '#202223', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contact.email}
                    </Text>
                  </div>
                  <CopyButton text={contact.email} fieldName="email" />
                </div>
              )}

              {contact.phone && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <Icon source={PhoneIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd" style={{ color: '#202223', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contact.phone}
                    </Text>
                  </div>
                  <CopyButton text={contact.phone} fieldName="phone" />
                </div>
              )}

              {contact.mobile && contact.mobile !== contact.phone && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <Icon source={PhoneIcon} tone="subdued" />
                    <Text as="span" variant="bodyMd" style={{ color: '#202223', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contact.mobile} (Mobile)
                    </Text>
                  </div>
                  <CopyButton text={contact.mobile} fieldName="mobile" />
                </div>
              )}
            </BlockStack>
          </div>
        )}

        {/* Business points of contact */}
        {contact.type === 'BUSINESS' && contact.pointsOfContact && contact.pointsOfContact.length > 0 && (
          <div>
            <Text as="h4" variant="headingSm" fontWeight="semibold" style={{ color: '#202223', marginBottom: '8px' }}>
              Points of Contact
            </Text>
            <BlockStack gap="200">
              {contact.pointsOfContact.slice(0, 2).map((point, index) => (
                <div key={index} style={{
                  background: '#f6f6f7',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid #e1e3e5'
                }}>
                  <BlockStack gap="100">
                    {point.name && (
                      <Text as="p" variant="bodyMd" fontWeight="medium" style={{ color: '#202223', margin: 0 }}>
                        {point.name}
                      </Text>
                    )}
                    {point.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <Icon source={PhoneIcon} tone="subdued" />
                          <Text as="span" variant="bodySm" style={{ color: '#6d7175', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {point.phone}
                          </Text>
                        </div>
                        <CopyButton text={point.phone} fieldName={`point-phone-${index}`} />
                      </div>
                    )}
                    {point.email && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <Icon source={EmailIcon} tone="subdued" />
                          <Text as="span" variant="bodySm" style={{ color: '#6d7175', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {point.email}
                          </Text>
                        </div>
                        <CopyButton text={point.email} fieldName={`point-email-${index}`} />
                      </div>
                    )}
                  </BlockStack>
                </div>
              ))}
            </BlockStack>
          </div>
        )}

        {/* Edit Contact Button */}
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="slim"
            icon={EditIcon}
            onClick={handleEdit}
            variant="secondary"
          >
            Edit contact
          </Button>
        </div>
      </BlockStack>
    </div>
  );
}

