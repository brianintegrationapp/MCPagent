import { NextResponse } from 'next/server';

const HUBSPOT_API_TOKEN = 'pat-na2-22a82878-f217-4ff0-a906-0b8509200db3';

export async function GET() {
  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch contacts from HubSpot');
    }

    const data = await response.json();
    return NextResponse.json({ contacts: data.results });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
