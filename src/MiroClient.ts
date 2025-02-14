import fetch, { Response } from 'node-fetch';

interface MiroBoard {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  modifiedAt?: string;
  createdBy?: {
    id: string;
    name: string;
  };
  modifiedBy?: {
    id: string;
    name: string;
  };
  owner?: {
    id: string;
    name: string;
  };
  picture?: {
    url: string;
  };
  viewLink?: string;
  team?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
  };
  policy?: {
    permissionsPolicy: {
      collaborationToolsStartAccess: string;
      copyAccess: string;
      sharingAccess: string;
    };
    sharingPolicy: {
      access: string;
      teamAccess: string;
    };
  };
}

interface MiroBoardsResponse {
  data: MiroBoard[];
  total: number;
  size: number;
  offset: number;
}

interface MiroItemsResponse {
  data: MiroItem[];
  cursor?: string;
}

interface ConnectorEndpoint {
  item: string;  // Item ID
  position?: {
    x: number;
    y: number;
  };
  snapTo?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

interface ConnectorStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle?: 'normal' | 'dashed';
  startStrokeCap?: 'none' | 'arrow' | 'triangle' | 'circle';
  endStrokeCap?: 'none' | 'arrow' | 'triangle' | 'circle';
}

interface ConnectorCreateRequest {
  startItem: ConnectorEndpoint;
  endItem: ConnectorEndpoint;
  style?: ConnectorStyle;
  captions?: {
    start?: string;
    middle?: string;
    end?: string;
  };
}

interface ConnectorResponse {
  id: string;
  type: 'connector';
  startItem: ConnectorEndpoint;
  endItem: ConnectorEndpoint;
  style: ConnectorStyle;
  captions?: {
    start?: string;
    middle?: string;
    end?: string;
  };
}

interface ConnectorsResponse {
  data: ConnectorResponse[];
  cursor?: string;
}

interface CreateBoardRequest {
  name: string;
  description?: string;
  teamId?: string;
  projectId?: string;
  policy?: {
    permissionsPolicy?: {
      collaborationToolsStartAccess?: 'all_editors' | 'owner_and_coowners';
      copyAccess?: 'anyone' | 'team_members' | 'owner_and_coowners' | 'none';
      sharingAccess?: 'anyone' | 'team_members' | 'owner_and_coowners' | 'none';
    };
    sharingPolicy?: {
      access?: 'private' | 'view' | 'comment' | 'edit';
      teamAccess?: 'private' | 'view' | 'comment' | 'edit';
    };
  };
}

interface UpdateBoardRequest {
  name?: string;
  description?: string;
  policy?: {
    permissionsPolicy?: {
      collaborationToolsStartAccess?: 'all_editors' | 'owner_and_coowners';
      copyAccess?: 'anyone' | 'team_members' | 'owner_and_coowners' | 'none';
      sharingAccess?: 'anyone' | 'team_members' | 'owner_and_coowners' | 'none';
    };
    sharingPolicy?: {
      access?: 'private' | 'view' | 'comment' | 'edit';
      teamAccess?: 'private' | 'view' | 'comment' | 'edit';
    };
  };
}

// Common item interfaces
interface Position {
  x: number;
  y: number;
  origin?: 'center' | 'left_top';
}

interface Geometry {
  width: number;
  height: number;
  rotation?: number;
}

interface Style {
  fillColor?: string;
  fillOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  borderOpacity?: number;
  borderStyle?: 'normal' | 'dashed' | 'dotted';
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  textAlignVertical?: 'top' | 'middle' | 'bottom';
}

// Item type interfaces
interface AppCardItem {
  id?: string;
  type: 'app_card';
  data: {
    status: string;
    assignee?: {
      userId: string;
    };
    dueDate?: string;
    title: string;
    description?: string;
    fields?: Record<string, any>;
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

interface CardItem {
  id?: string;
  type: 'card';
  data: {
    title: string;
    description?: string;
    assignee?: {
      userId: string;
    };
    dueDate?: string;
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

interface DocumentItem {
  id?: string;
  type: 'document';
  data: {
    title: string;
    content?: string;
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

interface EmbedItem {
  id?: string;
  type: 'embed';
  data: {
    url: string;
    mode?: 'inline' | 'modal';
    previewUrl?: string;
  };
  position: Position;
  geometry: Geometry;
}

interface FrameItem {
  id?: string;
  type: 'frame';
  data: {
    title: string;
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

interface ImageItem {
  id?: string;
  type: 'image';
  data: {
    url: string;
    title?: string;
  };
  position: Position;
  geometry: Geometry;
}

interface ShapeItem {
  id?: string;
  type: 'shape';
  data: {
    content?: string;
    shape: string;
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

interface StickyNoteItem {
  id?: string;
  type: 'sticky_note';
  data: {
    content?: string;
    shape?: 'square' | 'rectangle';
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

interface TextItem {
  id?: string;
  type: 'text';
  data: {
    content: string;
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

type MiroItem = AppCardItem | CardItem | DocumentItem | EmbedItem | FrameItem | ImageItem | ShapeItem | StickyNoteItem | TextItem;

interface BoardMember {
  id: string;
  name: string;
  role: 'owner' | 'coowner' | 'editor' | 'commenter' | 'viewer';
  email?: string;
  picture?: {
    url: string;
  };
}

interface BoardMembersResponse {
  data: BoardMember[];
  total: number;
  size: number;
  offset: number;
}

interface InviteBoardMemberRequest {
  emails: string[];
  role: 'coowner' | 'editor' | 'commenter' | 'viewer';
  message?: string;
}

interface UpdateBoardMemberRequest {
  role: 'coowner' | 'editor' | 'commenter' | 'viewer';
}

// Group interfaces
interface Group {
  id: string;
  type: 'group';
  data: {
    title?: string;
  };
  style?: Style;
  position: Position;
  geometry: Geometry;
}

interface GroupsResponse {
  data: Group[];
  cursor?: string;
}

interface CreateGroupRequest {
  data?: {
    title?: string;
  };
  style?: Style;
  position?: Position;
  geometry?: Geometry;
  itemIds: string[];
}

// Tag interfaces
interface Tag {
  id: string;
  title: string;
  fillColor?: string;
}

interface TagsResponse {
  data: Tag[];
  total: number;
  size: number;
  offset: number;
}

interface CreateTagRequest {
  title: string;
  fillColor?: string;
}

interface UpdateTagRequest {
  title?: string;
  fillColor?: string;
}

interface BulkCreateItemsRequest {
  items: Array<{
    type: string;
    [key: string]: any;
  }>;
}

interface BulkCreateItemsResponse {
  data: MiroItem[];
}

export class MiroClient {
  constructor(private token: string) {}

  private async fetchApi(path: string, options: { method?: string; body?: any } = {}) {
    const url = `https://api.miro.com/v2${path}`;
    console.log(`Making API request to: ${url}`);
    console.log('Request headers:', {
      'Authorization': 'Bearer [REDACTED]',
      'Content-Type': 'application/json',
      ...(options.body ? { 'Content-Length': JSON.stringify(options.body).length } : {})
    });
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.log('Error response body:', errorBody);
      let errorText = '';
      try {
        const errorJson = JSON.parse(errorBody);
        errorText = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        errorText = errorBody;
      }
      
      throw new Error(`Miro API error: ${response.status} ${response.statusText}\nResponse: ${errorText}`);
    }

    const jsonResponse = await response.json();
    console.log('Success response:', JSON.stringify(jsonResponse, null, 2));
    return jsonResponse;
  }

  async getBoards(options: { teamId?: string; projectId?: string; query?: string; owner?: string; } = {}): Promise<MiroBoard[]> {
    try {
      console.log('Fetching boards...');
      const queryParams = new URLSearchParams();
      if (options.teamId) queryParams.append('team_id', options.teamId);
      if (options.projectId) queryParams.append('project_id', options.projectId);
      if (options.query) queryParams.append('query', options.query);
      if (options.owner) queryParams.append('owner', options.owner);
      
      const url = `/boards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.fetchApi(url) as MiroBoardsResponse;
      if (!response.data) {
        console.error('Unexpected response format from /boards endpoint:', response);
        return [];
      }
      console.log(`Found ${response.data.length} boards`);
      return response.data;
    } catch (error) {
      console.error('Error fetching boards:', error);
      throw error;
    }
  }

  async getBoard(boardId: string): Promise<MiroBoard> {
    return this.fetchApi(`/boards/${boardId}`) as Promise<MiroBoard>;
  }

  async createBoard(data: CreateBoardRequest): Promise<MiroBoard> {
    return this.fetchApi('/boards', {
      method: 'POST',
      body: data
    }) as Promise<MiroBoard>;
  }

  async updateBoard(boardId: string, data: UpdateBoardRequest): Promise<MiroBoard> {
    return this.fetchApi(`/boards/${boardId}`, {
      method: 'PATCH',
      body: data
    }) as Promise<MiroBoard>;
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.fetchApi(`/boards/${boardId}`, {
      method: 'DELETE'
    });
  }

  async copyBoard(boardId: string, data: { name: string; description?: string; projectId?: string; teamId?: string }): Promise<MiroBoard> {
    return this.fetchApi(`/boards/${boardId}/copy`, {
      method: 'POST',
      body: data
    }) as Promise<MiroBoard>;
  }

  async shareBoard(boardId: string, data: { access: 'private' | 'view' | 'comment' | 'edit'; teamAccess?: 'private' | 'view' | 'comment' | 'edit' }): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/share`, {
      method: 'PATCH',
      body: data
    });
  }

  async getBoardItems(boardId: string, options: { type?: string; limit?: number } = {}): Promise<MiroItem[]> {
    const queryParams = new URLSearchParams();
    if (options.type) queryParams.append('type', options.type);
    if (options.limit) queryParams.append('limit', options.limit.toString());
    
    const response = await this.fetchApi(`/boards/${boardId}/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`) as MiroItemsResponse;
    return response.data;
  }

  async getBoardItem(boardId: string, itemId: string): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/items/${itemId}`) as Promise<MiroItem>;
  }

  async updateBoardItem(boardId: string, itemId: string, data: Partial<MiroItem>): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/items/${itemId}`, {
      method: 'PATCH',
      body: data
    }) as Promise<MiroItem>;
  }

  async deleteBoardItem(boardId: string, itemId: string): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/items/${itemId}`, {
      method: 'DELETE'
    });
  }

  async createAppCard(boardId: string, data: Omit<AppCardItem, 'type'>): Promise<AppCardItem> {
    return this.fetchApi(`/boards/${boardId}/app_cards`, {
      method: 'POST',
      body: data
    }) as Promise<AppCardItem>;
  }

  async createCard(boardId: string, data: Omit<CardItem, 'type'>): Promise<CardItem> {
    return this.fetchApi(`/boards/${boardId}/cards`, {
      method: 'POST',
      body: data
    }) as Promise<CardItem>;
  }

  async createDocument(boardId: string, data: Omit<DocumentItem, 'type'>): Promise<DocumentItem> {
    return this.fetchApi(`/boards/${boardId}/documents`, {
      method: 'POST',
      body: data
    }) as Promise<DocumentItem>;
  }

  async createEmbed(boardId: string, data: Omit<EmbedItem, 'type'>): Promise<EmbedItem> {
    return this.fetchApi(`/boards/${boardId}/embeds`, {
      method: 'POST',
      body: data
    }) as Promise<EmbedItem>;
  }

  async createFrame(boardId: string, data: Omit<FrameItem, 'type'>): Promise<FrameItem> {
    return this.fetchApi(`/boards/${boardId}/frames`, {
      method: 'POST',
      body: data
    }) as Promise<FrameItem>;
  }

  async createImage(boardId: string, data: Omit<ImageItem, 'type'>): Promise<ImageItem> {
    return this.fetchApi(`/boards/${boardId}/images`, {
      method: 'POST',
      body: data
    }) as Promise<ImageItem>;
  }

  async createShape(boardId: string, data: Omit<ShapeItem, 'type'>): Promise<ShapeItem> {
    return this.fetchApi(`/boards/${boardId}/shapes`, {
      method: 'POST',
      body: data
    }) as Promise<ShapeItem>;
  }

  async createStickyNote(boardId: string, data: Omit<StickyNoteItem, 'type'>): Promise<StickyNoteItem> {
    return this.fetchApi(`/boards/${boardId}/sticky_notes`, {
      method: 'POST',
      body: data
    }) as Promise<StickyNoteItem>;
  }

  async createText(boardId: string, data: Omit<TextItem, 'type'>): Promise<TextItem> {
    return this.fetchApi(`/boards/${boardId}/texts`, {
      method: 'POST',
      body: data
    }) as Promise<TextItem>;
  }

  async createConnector(boardId: string, data: ConnectorCreateRequest): Promise<ConnectorResponse> {
    return this.fetchApi(`/boards/${boardId}/connectors`, {
      method: 'POST',
      body: data
    }) as Promise<ConnectorResponse>;
  }

  async getConnectors(boardId: string, cursor?: string): Promise<ConnectorsResponse> {
    const queryParams = cursor ? `?cursor=${cursor}` : '';
    return this.fetchApi(`/boards/${boardId}/connectors${queryParams}`) as Promise<ConnectorsResponse>;
  }

  async getConnector(boardId: string, connectorId: string): Promise<ConnectorResponse> {
    return this.fetchApi(`/boards/${boardId}/connectors/${connectorId}`) as Promise<ConnectorResponse>;
  }

  async updateConnector(boardId: string, connectorId: string, data: Partial<ConnectorCreateRequest>): Promise<ConnectorResponse> {
    return this.fetchApi(`/boards/${boardId}/connectors/${connectorId}`, {
      method: 'PATCH',
      body: data
    }) as Promise<ConnectorResponse>;
  }

  async deleteConnector(boardId: string, connectorId: string): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/connectors/${connectorId}`, {
      method: 'DELETE'
    });
  }

  // Board Members API
  async getBoardMembers(boardId: string): Promise<BoardMember[]> {
    const response = await this.fetchApi(`/boards/${boardId}/members`) as BoardMembersResponse;
    return response.data;
  }

  async getBoardMember(boardId: string, userId: string): Promise<BoardMember> {
    return this.fetchApi(`/boards/${boardId}/members/${userId}`) as Promise<BoardMember>;
  }

  async inviteBoardMembers(boardId: string, data: InviteBoardMemberRequest): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/members`, {
      method: 'POST',
      body: data
    });
  }

  async updateBoardMember(boardId: string, userId: string, data: UpdateBoardMemberRequest): Promise<BoardMember> {
    return this.fetchApi(`/boards/${boardId}/members/${userId}`, {
      method: 'PATCH',
      body: data
    }) as Promise<BoardMember>;
  }

  async removeBoardMember(boardId: string, userId: string): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  // Groups API
  async getGroups(boardId: string, cursor?: string): Promise<GroupsResponse> {
    const queryParams = cursor ? `?cursor=${cursor}` : '';
    return this.fetchApi(`/boards/${boardId}/groups${queryParams}`) as Promise<GroupsResponse>;
  }

  async getGroup(boardId: string, groupId: string): Promise<Group> {
    return this.fetchApi(`/boards/${boardId}/groups/${groupId}`) as Promise<Group>;
  }

  async createGroup(boardId: string, data: CreateGroupRequest): Promise<Group> {
    return this.fetchApi(`/boards/${boardId}/groups`, {
      method: 'POST',
      body: data
    }) as Promise<Group>;
  }

  async updateGroup(boardId: string, groupId: string, data: Partial<CreateGroupRequest>): Promise<Group> {
    return this.fetchApi(`/boards/${boardId}/groups/${groupId}`, {
      method: 'PATCH',
      body: data
    }) as Promise<Group>;
  }

  async deleteGroup(boardId: string, groupId: string): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/groups/${groupId}`, {
      method: 'DELETE'
    });
  }

  async getGroupItems(boardId: string, groupId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/groups/${groupId}/items`) as MiroItemsResponse;
    return response.data;
  }

  async addItemsToGroup(boardId: string, groupId: string, itemIds: string[]): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/groups/${groupId}/items`, {
      method: 'POST',
      body: { itemIds }
    });
  }

  async removeItemsFromGroup(boardId: string, groupId: string, itemIds: string[]): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/groups/${groupId}/items`, {
      method: 'DELETE',
      body: { itemIds }
    });
  }

  // Tags API
  async getTags(boardId: string): Promise<Tag[]> {
    const response = await this.fetchApi(`/boards/${boardId}/tags`) as TagsResponse;
    return response.data;
  }

  async getTag(boardId: string, tagId: string): Promise<Tag> {
    return this.fetchApi(`/boards/${boardId}/tags/${tagId}`) as Promise<Tag>;
  }

  async createTag(boardId: string, data: CreateTagRequest): Promise<Tag> {
    return this.fetchApi(`/boards/${boardId}/tags`, {
      method: 'POST',
      body: data
    }) as Promise<Tag>;
  }

  async updateTag(boardId: string, tagId: string, data: UpdateTagRequest): Promise<Tag> {
    return this.fetchApi(`/boards/${boardId}/tags/${tagId}`, {
      method: 'PATCH',
      body: data
    }) as Promise<Tag>;
  }

  async deleteTag(boardId: string, tagId: string): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/tags/${tagId}`, {
      method: 'DELETE'
    });
  }

  async getItemsWithTag(boardId: string, tagId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/tags/${tagId}/items`) as MiroItemsResponse;
    return response.data;
  }

  async addTagToItems(boardId: string, tagId: string, itemIds: string[]): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/tags/${tagId}/items`, {
      method: 'POST',
      body: { itemIds }
    });
  }

  async removeTagFromItems(boardId: string, tagId: string, itemIds: string[]): Promise<void> {
    await this.fetchApi(`/boards/${boardId}/tags/${tagId}/items`, {
      method: 'DELETE',
      body: { itemIds }
    });
  }

  // Bulk Create Items
  async bulkCreateItems(boardId: string, data: BulkCreateItemsRequest): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items`, {
      method: 'POST',
      body: data
    }) as BulkCreateItemsResponse;
    return response.data;
  }
}