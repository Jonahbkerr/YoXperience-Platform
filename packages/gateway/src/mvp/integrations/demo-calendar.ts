import { Integration, Action } from './types';

const DEMO_EVENTS = [
  { id: 'evt1', title: 'Standup', start: '9:00 AM', end: '9:15 AM', attendees: ['team@yoxperience.com'], link: 'meet.google.com/abc-defg-hij' },
  { id: 'evt2', title: '1:1 with Sara', start: '11:00 AM', end: '11:30 AM', attendees: ['sara@designlabs.co'], link: 'meet.google.com/xyz-uvwx-rst' },
  { id: 'evt3', title: 'Design review', start: '2:00 PM', end: '3:00 PM', attendees: ['sara@designlabs.co', 'john@acme.com'], link: 'meet.google.com/lmn-opqr-stu' },
];

export class DemoCalendarIntegration implements Integration {
  name = 'calendar';

  listActions(): Action[] {
    return [
      { id: 'list_upcoming', label: 'Today\'s events', params: [] },
      { id: 'create_event', label: 'Create event', params: [
        { name: 'summary', type: 'string', required: true },
        { name: 'start', type: 'string', required: true },
        { name: 'end', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    switch (actionId) {
      case 'list_upcoming':
        return { events: DEMO_EVENTS };
      case 'create_event':
        return {
          event: { id: 'evt-' + Date.now(), title: params.summary, start: params.start, end: params.end },
          status: 'Event created (demo mode)',
        };
      default:
        throw new Error(`Unknown Calendar action: ${actionId}`);
    }
  }
}
