export interface ActionParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
}

export interface Action {
  id: string;
  label: string;
  params: ActionParam[];
}

export interface Integration {
  name: string;
  listActions(): Action[];
  execute(actionId: string, params: Record<string, unknown>): Promise<unknown>;
}
