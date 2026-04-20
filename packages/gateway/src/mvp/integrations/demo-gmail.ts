import { Integration, Action } from './types';

const DEMO_EMAILS = [
  { id: 'e1', from: 'John Park <john@acme.com>', subject: 'Re: Q2 roadmap feedback', snippet: 'Looks good overall. Quick question on the timeline for item 3—can we push it to May?', unread: true, time: '8:12 AM' },
  { id: 'e2', from: 'Sara Chen <sara@designlabs.co>', subject: 'Design review notes attached', snippet: 'I put the revised mocks in Figma. Main changes: header, spacing, empty state.', unread: true, time: '7:54 AM' },
  { id: 'e3', from: 'Billing <billing@vercel.com>', subject: 'Your April invoice is ready', snippet: 'Your invoice of $87.42 is available for download.', unread: true, time: '7:03 AM' },
  { id: 'e4', from: 'GitHub <notifications@github.com>', subject: '[PR] Fix LM Studio compatibility', snippet: 'Jonahbkerr merged pull request #42 into main.', unread: false, time: 'Yesterday' },
];

export class DemoGmailIntegration implements Integration {
  name = 'gmail';

  listActions(): Action[] {
    return [
      { id: 'list_unread', label: 'List unread emails', params: [] },
      { id: 'create_draft', label: 'Draft a reply', params: [
        { name: 'to', type: 'string', required: true },
        { name: 'subject', type: 'string', required: true },
        { name: 'body', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    switch (actionId) {
      case 'list_unread':
        return { messages: DEMO_EMAILS.filter(e => e.unread) };
      case 'create_draft':
        return {
          draft: {
            id: 'draft-' + Date.now(),
            to: params.to,
            subject: params.subject,
            preview: String(params.body ?? '').slice(0, 120),
          },
          status: 'Draft saved (demo mode — not sent)',
        };
      default:
        throw new Error(`Unknown Gmail action: ${actionId}`);
    }
  }
}
