import fetch, { Response } from 'node-fetch';

interface MiroBoard {
  id: string;
  name: string;
  description?: string;
}

interface MiroBoardsResponse {
  data: MiroBoard[];
  total: number;
  size: number;
  offset: number;
}

interface MiroItem {
  id: string;
  type: string;
  [key: string]: any;
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

  async getBoards(): Promise<MiroBoard[]> {
    try {
      console.log('Fetching boards...');
      const response = await this.fetchApi('/boards') as MiroBoardsResponse;
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

  async getBoardItems(boardId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async createStickyNote(boardId: string, data: any): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/sticky_notes`, {
      method: 'POST',
      body: data
    }) as Promise<MiroItem>;
  }

  async bulkCreateItems(boardId: string, items: any[]): Promise<MiroItem[]> {
    const response = await fetch(`https://api.miro.com/v2/boards/${boardId}/items/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(items)
    });
    
    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(`Miro API error: ${error.message || response.statusText}`);
    }

    const result = await response.json() as { data: MiroItem[] };
    return result.data || [];
  }

  async getFrames(boardId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?type=frame&limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async getItemsInFrame(boardId: string, frameId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?parent_item_id=${frameId}&limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async createShape(boardId: string, data: any): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/shapes`, {
      method: 'POST',
      body: data
    }) as Promise<MiroItem>;
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
}