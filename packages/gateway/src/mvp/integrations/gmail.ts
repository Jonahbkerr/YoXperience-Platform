import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Integration, Action } from './types';
import { TokenStore } from './token-store';

export function buildGoogleOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export class GmailIntegration implements Integration {
  name = 'gmail';

  constructor(private tokenStore: TokenStore) {}

  private getClient(): gmail_v1.Gmail {
    const tokens = this.tokenStore.get('gmail');
    if (!tokens) throw new Error('Gmail not connected');
    const oauth = buildGoogleOAuthClient();
    oauth.setCredentials(tokens);
    return google.gmail({ version: 'v1', auth: oauth });
  }

  listActions(): Action[] {
    return [
      { id: 'list_unread', label: 'List unread', params: [] },
      { id: 'search', label: 'Search', params: [{ name: 'q', type: 'string', required: true }] },
      { id: 'create_draft', label: 'Create draft', params: [
        { name: 'to', type: 'string', required: true },
        { name: 'subject', type: 'string', required: true },
        { name: 'body', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    const gmail = this.getClient();
    switch (actionId) {
      case 'list_unread': {
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
          maxResults: 10,
        });
        return res.data;
      }
      case 'search': {
        const q = params.q as string;
        const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 10 });
        return res.data;
      }
      case 'create_draft': {
        const raw = Buffer.from(
          `To: ${params.to}\r\nSubject: ${params.subject}\r\n\r\n${params.body}`
        ).toString('base64url');
        const res = await gmail.users.drafts.create({
          userId: 'me',
          requestBody: { message: { raw } },
        });
        return res.data;
      }
      default:
        throw new Error(`Unknown Gmail action: ${actionId}`);
    }
  }
}
