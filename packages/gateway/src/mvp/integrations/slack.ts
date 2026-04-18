import { WebClient } from '@slack/web-api';
import { Integration, Action } from './types';
import { TokenStore } from './token-store';

export class SlackIntegration implements Integration {
  name = 'slack';

  constructor(private tokenStore: TokenStore) {}

  private getClient(): WebClient {
    const tokens = this.tokenStore.get('slack') as { access_token?: string } | undefined;
    if (!tokens?.access_token) throw new Error('Slack not connected');
    return new WebClient(tokens.access_token);
  }

  listActions(): Action[] {
    return [
      { id: 'list_channels', label: 'List channels', params: [] },
      { id: 'send_message', label: 'Send message', params: [
        { name: 'channel', type: 'string', required: true },
        { name: 'text', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    const slack = this.getClient();
    switch (actionId) {
      case 'list_channels': {
        return slack.conversations.list({ limit: 30, types: 'public_channel,private_channel' });
      }
      case 'send_message': {
        return slack.chat.postMessage({
          channel: params.channel as string,
          text: params.text as string,
        });
      }
      default:
        throw new Error(`Unknown Slack action: ${actionId}`);
    }
  }
}
