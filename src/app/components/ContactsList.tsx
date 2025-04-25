"use client";

import { useEffect, useState } from 'react';

interface Contact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
  };
}

interface ContactsListProps {
  shouldRefresh?: boolean;
  onRefreshComplete?: () => void;
}

export default function ContactsList({ shouldRefresh, onRefreshComplete }: ContactsListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/hubspot/contacts');
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      const data = await response.json();
      setContacts(data.contacts);
      onRefreshComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    // Set up polling to refresh contacts every 30 seconds
    const interval = setInterval(fetchContacts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (shouldRefresh) {
      fetchContacts();
    }
  }, [shouldRefresh]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p>Loading contacts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 max-h-[600px] overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">HubSpot Contacts</h2>
        <p className="text-sm text-gray-600">
          Here is a live list (via the Hubspot API) of the contacts in the connected Hubspot CRM. 
          Watch them appear after requesting a new contact in the chat!
        </p>
      </div>
      <div className="space-y-4">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="border rounded-lg p-3 hover:bg-gray-50"
          >
            <p className="font-medium">
              {contact.properties.firstname || ''} {contact.properties.lastname || ''}
            </p>
            {contact.properties.email && (
              <p className="text-sm text-gray-600">{contact.properties.email}</p>
            )}
            {contact.properties.phone && (
              <p className="text-sm text-gray-600">{contact.properties.phone}</p>
            )}
          </div>
        ))}
        {contacts.length === 0 && (
          <p className="text-gray-500">No contacts found</p>
        )}
      </div>
    </div>
  );
} 