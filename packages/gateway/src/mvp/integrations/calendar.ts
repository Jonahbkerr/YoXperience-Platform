import { google, calendar_v3 } from 'googleapis';
import { Integration, Action } from './types';
import { TokenStore } from './token-store';
import { buildGoogleOAuthClient } from './gmail';

export class CalendarIntegration implements Integration {
  name = 'calendar';

  constructor(private tokenStore: TokenStore) {}

  private getClient(): calendar_v3.Calendar {
    const tokens = this.tokenStore.get('gmail'); // shares Google tokens
    if (!tokens) throw new Error('Google not connected');
    const oauth = buildGoogleOAuthClient();
    oauth.setCredentials(tokens);
    return google.calendar({ version: 'v3', auth: oauth });
  }

  listActions(): Action[] {
    return [
      { id: 'list_upcoming', label: 'Upcoming events', params: [] },
      { id: 'create_event', label: 'Create event', params: [
        { name: 'summary', type: 'string', required: true },
        { name: 'start', type: 'string', required: true },
        { name: 'end', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    const cal = this.getClient();
    switch (actionId) {
      case 'list_upcoming': {
        const res = await cal.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        });
        return res.data;
      }
      case 'create_event': {
        const res = await cal.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: params.summary as string,
            start: { dateTime: params.start as string },
            end: { dateTime: params.end as string },
          },
        });
        return res.data;
      }
      default:
        throw new Error(`Unknown Calendar action: ${actionId}`);
    }
  }
}
