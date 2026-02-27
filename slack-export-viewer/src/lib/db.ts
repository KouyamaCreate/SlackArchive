import Dexie, { type EntityTable } from 'dexie';

export interface Workspace {
  id?: number;
  name: string;
  importedAt: Date;
}

export interface SlackUser {
  id?: number;
  workspaceId: number;
  slackId: string;
  name: string;
  real_name: string;
  profile: any;
  is_admin?: boolean;
  is_owner?: boolean;
  is_bot?: boolean;
  deleted?: boolean;
}

export interface SlackChannel {
  id?: number;
  workspaceId: number;
  slackId: string;
  name: string;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  members: string[];
  topic: any;
  purpose: any;
}

export interface SlackMessage {
  id?: number;
  workspaceId: number;
  channelId: string;
  ts: string;
  type: string;
  subtype?: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  files?: any[];
  reactions?: any[];
  attachments?: any[];
  blocks?: any[];
  [key: string]: any;
}

export interface SlackSection {
  id?: number;
  workspaceId: number;
  name: string;
  order: number;
}

export interface SlackFileCache {
  id?: number;
  workspaceId: number;
  fileId: string;
  dataUrl?: string;
  blob?: Blob;
  mimeType: string;
}

const db = new Dexie('SlackViewerDB') as Dexie & {
  workspaces: EntityTable<Workspace, 'id'>;
  users: EntityTable<SlackUser, 'id'>;
  channels: EntityTable<SlackChannel, 'id'>;
  messages: EntityTable<SlackMessage, 'id'>;
  sections: EntityTable<SlackSection, 'id'>;
  files: EntityTable<SlackFileCache, 'id'>;
};

db.version(2).stores({
  workspaces: '++id, name, importedAt',
  users: '++id, workspaceId, slackId, name',
  channels: '++id, workspaceId, slackId, name',
  messages: '++id, workspaceId, channelId, ts, thread_ts, user',
  sections: '++id, workspaceId, order',
  files: '++id, workspaceId, fileId'
}).upgrade(tx => {
  // Migration if needed
});

export { db };
