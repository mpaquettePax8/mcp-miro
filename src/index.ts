#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { MiroClient } from "./MiroClient.js";
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Request,
} from "@modelcontextprotocol/sdk/types";
import fs from 'fs/promises';
import path from 'path';

// Parse command line arguments
const argv = await yargs(hideBin(process.argv))
  .option("token", {
    alias: "t",
    type: "string",
    description: "Miro OAuth token",
  })
  .help().argv;

// Get token with precedence: command line > environment variable
const oauthToken = (argv.token as string) || process.env.MIRO_OAUTH_TOKEN;

if (!oauthToken) {
  console.error(
    "Error: Miro OAuth token is required. Provide it via MIRO_OAUTH_TOKEN environment variable or --token argument"
  );
  process.exit(1);
}

const server = new Server(
  {
    name: "mcp-miro",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

const miroClient = new MiroClient(oauthToken);

server.setRequestHandler(ListResourcesRequestSchema, async (request: Request<typeof ListResourcesRequestSchema>) => {
  const boards = await miroClient.getBoards();

  return {
    resources: boards.map((board) => ({
      uri: `miro://board/${board.id}`,
      mimeType: "application/json",
      name: board.name,
      description: board.description || `Miro board: ${board.name}`,
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request: Request<typeof ReadResourceRequestSchema>) => {
  const url = new URL(request.params.uri);

  if (!request.params.uri.startsWith("miro://board/")) {
    throw new Error(
      "Invalid Miro resource URI - must start with miro://board/"
    );
  }

  const boardId = url.pathname.substring(1); // Remove leading slash from pathname
  const items = await miroClient.getBoardItems(boardId);

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(items, null, 2),
      },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Board Management
      {
        name: "list_boards",
        description: "List all available Miro boards and their IDs",
        inputSchema: {
          type: "object",
          properties: {
            team_id: {
              type: "string",
              description: "Optional team ID to filter boards by"
            },
            project_id: {
              type: "string",
              description: "Optional project ID to filter boards by"
            },
            query: {
              type: "string",
              description: "Optional search query to filter boards by name"
            },
            owner: {
              type: "string",
              description: "Optional owner ID to filter boards by"
            }
          }
        }
      },
      {
        name: "get_board",
        description: "Get a specific Miro board by ID",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to retrieve"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "create_board",
        description: "Create a new Miro board",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the board"
            },
            description: {
              type: "string",
              description: "Optional description of the board"
            },
            teamId: {
              type: "string",
              description: "Optional team ID to create the board in"
            },
            projectId: {
              type: "string",
              description: "Optional project ID to create the board in"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "update_board",
        description: "Update an existing Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to update"
            },
            name: {
              type: "string",
              description: "New name for the board"
            },
            description: {
              type: "string",
              description: "New description for the board"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "delete_board",
        description: "Delete a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to delete"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "copy_board",
        description: "Create a copy of a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to copy"
            },
            name: {
              type: "string",
              description: "Name for the new board copy"
            },
            description: {
              type: "string",
              description: "Optional description for the new board copy"
            },
            projectId: {
              type: "string",
              description: "Optional project ID to create the copy in"
            },
            teamId: {
              type: "string",
              description: "Optional team ID to create the copy in"
            }
          },
          required: ["boardId", "name"]
        }
      },
      {
        name: "share_board",
        description: "Update sharing settings for a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to share"
            },
            access: {
              type: "string",
              description: "Access level for the board",
              enum: ["private", "view", "comment", "edit"]
            },
            teamAccess: {
              type: "string",
              description: "Access level for team members",
              enum: ["private", "view", "comment", "edit"]
            }
          },
          required: ["boardId", "access"]
        }
      },

      // Board Members
      {
        name: "list_board_members",
        description: "List all members of a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to list members from"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "get_board_member",
        description: "Get a specific member of a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            userId: {
              type: "string",
              description: "ID of the user to get"
            }
          },
          required: ["boardId", "userId"]
        }
      },
      {
        name: "invite_board_members",
        description: "Invite users to a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to invite to"
            },
            emails: {
              type: "array",
              items: {
                type: "string"
              },
              description: "List of email addresses to invite"
            },
            role: {
              type: "string",
              description: "Role to assign to invited users",
              enum: ["coowner", "editor", "commenter", "viewer"]
            },
            message: {
              type: "string",
              description: "Optional message to include in the invitation"
            }
          },
          required: ["boardId", "emails", "role"]
        }
      },
      {
        name: "update_board_member",
        description: "Update a board member's role",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            userId: {
              type: "string",
              description: "ID of the user to update"
            },
            role: {
              type: "string",
              description: "New role for the user",
              enum: ["coowner", "editor", "commenter", "viewer"]
            }
          },
          required: ["boardId", "userId", "role"]
        }
      },
      {
        name: "remove_board_member",
        description: "Remove a member from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            userId: {
              type: "string",
              description: "ID of the user to remove"
            }
          },
          required: ["boardId", "userId"]
        }
      },

      // Items - Generic Operations
      {
        name: "get_board_items",
        description: "Get all items on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to get items from"
            },
            type: {
              type: "string",
              description: "Optional filter by item type",
              enum: ["app_card", "card", "document", "embed", "frame", "image", "shape", "sticky_note", "text"]
            },
            limit: {
              type: "number",
              description: "Maximum number of items to return"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "get_board_item",
        description: "Get a specific item from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            itemId: {
              type: "string",
              description: "ID of the item to get"
            }
          },
          required: ["boardId", "itemId"]
        }
      },
      {
        name: "update_board_item",
        description: "Update an item on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            itemId: {
              type: "string",
              description: "ID of the item to update"
            },
            data: {
              type: "object",
              description: "Update data for the item"
            }
          },
          required: ["boardId", "itemId", "data"]
        }
      },
      {
        name: "delete_board_item",
        description: "Delete an item from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            itemId: {
              type: "string",
              description: "ID of the item to delete"
            }
          },
          required: ["boardId", "itemId"]
        }
      },

      // Items - Specific Types
      {
        name: "create_app_card",
        description: "Create an app card on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the app card on"
            },
            data: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description: "Status of the app card"
                },
                title: {
                  type: "string",
                  description: "Title of the app card"
                },
                description: {
                  type: "string",
                  description: "Description of the app card"
                },
                assignee: {
                  type: "object",
                  properties: {
                    userId: {
                      type: "string",
                      description: "User ID of the assignee"
                    }
                  }
                },
                dueDate: {
                  type: "string",
                  description: "Due date for the app card"
                }
              },
              required: ["status", "title"]
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          },
          required: ["boardId", "data"]
        }
      },
      {
        name: "create_card",
        description: "Create a card on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the card on"
            },
            data: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Title of the card"
                },
                description: {
                  type: "string",
                  description: "Description of the card"
                },
                assignee: {
                  type: "object",
                  properties: {
                    userId: {
                      type: "string",
                      description: "User ID of the assignee"
                    }
                  }
                },
                dueDate: {
                  type: "string",
                  description: "Due date for the card"
                }
              },
              required: ["title"]
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          },
          required: ["boardId", "data"]
        }
      },
      {
        name: "create_document",
        description: "Create a document on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the document on"
            },
            data: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Title of the document"
                },
                content: {
                  type: "string",
                  description: "Content of the document"
                }
              },
              required: ["title"]
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          },
          required: ["boardId", "data"]
        }
      },
      {
        name: "create_embed",
        description: "Create an embedded content item on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the embed on"
            },
            data: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "URL of the content to embed"
                },
                mode: {
                  type: "string",
                  enum: ["inline", "modal"],
                  description: "Display mode for the embedded content"
                },
                previewUrl: {
                  type: "string",
                  description: "Optional preview image URL"
                }
              },
              required: ["url"]
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          },
          required: ["boardId", "data"]
        }
      },
      {
        name: "create_frame",
        description: "Create a frame on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the frame on"
            },
            data: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Title of the frame"
                }
              },
              required: ["title"]
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          },
          required: ["boardId", "data"]
        }
      },
      {
        name: "create_image",
        description: "Create an image on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the image on"
            },
            data: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "URL of the image"
                },
                title: {
                  type: "string",
                  description: "Optional title for the image"
                }
              },
              required: ["url"]
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          },
          required: ["boardId", "data"]
        }
      },
      {
        name: "create_shape",
        description: "Create a shape on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the shape on"
            },
            shape: {
              type: "string",
              description: "Type of shape to create",
              enum: [
                "rectangle", "circle", "triangle", "rhombus",
                "parallelogram", "trapezoid", "pentagon", "hexagon",
                "octagon", "star", "flow_chart_predefined_process"
              ],
              default: "rectangle",
            },
            content: {
              type: "string",
              description: "Text content inside the shape"
            },
            style: {
              type: "object",
              description: "Style properties for the shape",
              properties: {
                fillColor: { type: "string" },
                borderColor: { type: "string" },
                borderWidth: { type: "number", minimum: 1, maximum: 24 }
              }
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number", default: 0 },
                y: { type: "number", default: 0 }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number", default: 200 },
                height: { type: "number", default: 200 },
                rotation: { type: "number", default: 0 }
              }
            }
          },
          required: ["boardId", "shape"]
        }
      },
      {
        name: "create_sticky_note",
        description: "Create a sticky note on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the sticky note on"
            },
            content: {
              type: "string",
              description: "Text content of the sticky note"
            },
            shape: {
              type: "string",
              description: "Shape of the sticky note",
              enum: ["square", "rectangle"],
              default: "square"
            },
            color: {
              type: "string",
              description: "Color of the sticky note",
              enum: [
                "gray", "light_yellow", "yellow", "orange", "light_green",
                "green", "dark_green", "cyan", "light_pink", "pink", "violet",
                "red", "light_blue", "blue", "dark_blue", "black"
              ],
              default: "yellow"
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number", default: 0 },
                y: { type: "number", default: 0 }
              }
            }
          },
          required: ["boardId", "content"]
        }
      },
      {
        name: "create_text",
        description: "Create a text item on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the text on"
            },
            data: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "Text content"
                }
              },
              required: ["content"]
            },
            style: {
              type: "object",
              properties: {
                color: { type: "string" },
                fontSize: { type: "number" },
                textAlign: {
                  type: "string",
                  enum: ["left", "center", "right"]
                }
              }
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            }
          },
          required: ["boardId", "data"]
        }
      },
      {
        name: "create_connector",
        description: "Create a connector between two items on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the connector on"
            },
            startItem: {
              type: "object",
              description: "Start item connection details",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the start item"
                },
                snapTo: {
                  type: "string",
                  description: "Which side to connect to",
                  enum: ["top", "bottom", "left", "right", "auto"],
                  default: "auto"
                }
              },
              required: ["id"]
            },
            endItem: {
              type: "object",
              description: "End item connection details",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the end item"
                },
                snapTo: {
                  type: "string",
                  description: "Which side to connect to",
                  enum: ["top", "bottom", "left", "right", "auto"],
                  default: "auto"
                }
              },
              required: ["id"]
            },
            style: {
              type: "object",
              description: "Style properties for the connector",
              properties: {
                strokeColor: {
                  type: "string",
                  description: "Color of the connector line"
                },
                strokeWidth: {
                  type: "number",
                  description: "Width of the connector line",
                  default: 1
                },
                strokeStyle: {
                  type: "string",
                  description: "Style of the line",
                  enum: ["normal", "dashed"],
                  default: "normal"
                },
                startStrokeCap: {
                  type: "string",
                  description: "Style of the start of the connector",
                  enum: ["none", "arrow", "triangle", "circle"],
                  default: "none"
                },
                endStrokeCap: {
                  type: "string",
                  description: "Style of the end of the connector",
                  enum: ["none", "arrow", "triangle", "circle"],
                  default: "arrow"
                }
              },
              required: ["strokeColor"]
            }
          },
          required: ["boardId", "startItem", "endItem"]
        }
      },

      // Groups
      {
        name: "get_groups",
        description: "Get all groups on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to get groups from"
            },
            cursor: {
              type: "string",
              description: "Optional cursor for pagination"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "get_group",
        description: "Get a specific group from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            groupId: {
              type: "string",
              description: "ID of the group to get"
            }
          },
          required: ["boardId", "groupId"]
        }
      },
      {
        name: "create_group",
        description: "Create a group on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the group on"
            },
            data: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Title of the group"
                }
              }
            },
            style: {
              type: "object",
              properties: {
                fillColor: { type: "string" },
                borderColor: { type: "string" },
                borderWidth: { type: "number" }
              }
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            },
            itemIds: {
              type: "array",
              items: {
                type: "string"
              },
              description: "IDs of items to include in the group"
            }
          },
          required: ["boardId", "itemIds"]
        }
      },
      {
        name: "update_group",
        description: "Update a group on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            groupId: {
              type: "string",
              description: "ID of the group to update"
            },
            data: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "New title for the group"
                }
              }
            },
            style: {
              type: "object",
              properties: {
                fillColor: { type: "string" },
                borderColor: { type: "string" },
                borderWidth: { type: "number" }
              }
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" }
              }
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" }
              }
            }
          },
          required: ["boardId", "groupId"]
        }
      },
      {
        name: "delete_group",
        description: "Delete a group from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            groupId: {
              type: "string",
              description: "ID of the group to delete"
            }
          },
          required: ["boardId", "groupId"]
        }
      },
      {
        name: "get_group_items",
        description: "Get all items in a group",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            groupId: {
              type: "string",
              description: "ID of the group"
            }
          },
          required: ["boardId", "groupId"]
        }
      },
      {
        name: "add_items_to_group",
        description: "Add items to a group",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            groupId: {
              type: "string",
              description: "ID of the group"
            },
            itemIds: {
              type: "array",
              items: {
                type: "string"
              },
              description: "IDs of items to add to the group"
            }
          },
          required: ["boardId", "groupId", "itemIds"]
        }
      },
      {
        name: "remove_items_from_group",
        description: "Remove items from a group",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            groupId: {
              type: "string",
              description: "ID of the group"
            },
            itemIds: {
              type: "array",
              items: {
                type: "string"
              },
              description: "IDs of items to remove from the group"
            }
          },
          required: ["boardId", "groupId", "itemIds"]
        }
      },

      // Tags
      {
        name: "get_tags",
        description: "Get all tags on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to get tags from"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "get_tag",
        description: "Get a specific tag from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            tagId: {
              type: "string",
              description: "ID of the tag to get"
            }
          },
          required: ["boardId", "tagId"]
        }
      },
      {
        name: "create_tag",
        description: "Create a tag on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            title: {
              type: "string",
              description: "Title of the tag"
            },
            fillColor: {
              type: "string",
              description: "Color of the tag"
            }
          },
          required: ["boardId", "title"]
        }
      },
      {
        name: "update_tag",
        description: "Update a tag on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            tagId: {
              type: "string",
              description: "ID of the tag to update"
            },
            title: {
              type: "string",
              description: "New title for the tag"
            },
            fillColor: {
              type: "string",
              description: "New color for the tag"
            }
          },
          required: ["boardId", "tagId"]
        }
      },
      {
        name: "delete_tag",
        description: "Delete a tag from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            tagId: {
              type: "string",
              description: "ID of the tag to delete"
            }
          },
          required: ["boardId", "tagId"]
        }
      },
      {
        name: "get_items_with_tag",
        description: "Get all items with a specific tag",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            tagId: {
              type: "string",
              description: "ID of the tag"
            }
          },
          required: ["boardId", "tagId"]
        }
      },
      {
        name: "add_tag_to_items",
        description: "Add a tag to multiple items",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            tagId: {
              type: "string",
              description: "ID of the tag"
            },
            itemIds: {
              type: "array",
              items: {
                type: "string"
              },
              description: "IDs of items to tag"
            }
          },
          required: ["boardId", "tagId", "itemIds"]
        }
      },
      {
        name: "remove_tag_from_items",
        description: "Remove a tag from multiple items",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            tagId: {
              type: "string",
              description: "ID of the tag"
            },
            itemIds: {
              type: "array",
              items: {
                type: "string"
              },
              description: "IDs of items to untag"
            }
          },
          required: ["boardId", "tagId", "itemIds"]
        }
      },

      // Bulk Create Items
      {
        name: "bulk_create_items",
        description: "Create multiple items on a Miro board in a single request",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create items on"
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["app_card", "card", "document", "embed", "frame", "image", "shape", "sticky_note", "text"],
                    description: "Type of item to create"
                  },
                  data: {
                    type: "object",
                    description: "Item-specific data"
                  },
                  style: {
                    type: "object",
                    description: "Item style properties"
                  },
                  position: {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" }
                    }
                  },
                  geometry: {
                    type: "object",
                    properties: {
                      width: { type: "number" },
                      height: { type: "number" }
                    }
                  }
                },
                required: ["type"]
              },
              maxItems: 20,
              description: "Array of items to create (max 20 items)"
            }
          },
          required: ["boardId", "items"]
        }
      },

      // Connectors
      {
        name: "get_connectors",
        description: "Get all connectors on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to get connectors from"
            },
            cursor: {
              type: "string",
              description: "Optional cursor for pagination"
            }
          },
          required: ["boardId"]
        }
      },
      {
        name: "get_connector",
        description: "Get a specific connector from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            connectorId: {
              type: "string",
              description: "ID of the connector to get"
            }
          },
          required: ["boardId", "connectorId"]
        }
      },
      {
        name: "update_connector",
        description: "Update a connector on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            connectorId: {
              type: "string",
              description: "ID of the connector to update"
            },
            startItem: {
              type: "object",
              description: "Start item connection details",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the start item"
                },
                snapTo: {
                  type: "string",
                  description: "Which side to connect to",
                  enum: ["top", "bottom", "left", "right", "auto"]
                }
              }
            },
            endItem: {
              type: "object",
              description: "End item connection details",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the end item"
                },
                snapTo: {
                  type: "string",
                  description: "Which side to connect to",
                  enum: ["top", "bottom", "left", "right", "auto"]
                }
              }
            },
            style: {
              type: "object",
              description: "Style properties for the connector",
              properties: {
                strokeColor: {
                  type: "string",
                  description: "Color of the connector line"
                },
                strokeWidth: {
                  type: "number",
                  description: "Width of the connector line"
                },
                strokeStyle: {
                  type: "string",
                  description: "Style of the line",
                  enum: ["normal", "dashed"]
                },
                startStrokeCap: {
                  type: "string",
                  description: "Style of the start of the connector",
                  enum: ["none", "arrow", "triangle", "circle"]
                },
                endStrokeCap: {
                  type: "string",
                  description: "Style of the end of the connector",
                  enum: ["none", "arrow", "triangle", "circle"]
                }
              }
            }
          },
          required: ["boardId", "connectorId"]
        }
      },
      {
        name: "delete_connector",
        description: "Delete a connector from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board"
            },
            connectorId: {
              type: "string",
              description: "ID of the connector to delete"
            }
          },
          required: ["boardId", "connectorId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: Request<typeof CallToolRequestSchema>) => {
  switch (request.params.name) {
    // Board Management
    case "list_boards": {
      const { team_id, project_id, query, owner } = request.params.arguments as any;
      const boards = await miroClient.getBoards({ teamId: team_id, projectId: project_id, query, owner });
      return {
        content: [
          {
            type: "text",
            text: "Here are the available Miro boards:",
          },
          ...boards.map((b) => ({
            type: "text",
            text: `Board ID: ${b.id}, Name: ${b.name}`,
          })),
        ],
      };
    }

    case "get_board": {
      const { boardId } = request.params.arguments as any;
      const board = await miroClient.getBoard(boardId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(board, null, 2),
          },
        ],
      };
    }

    case "create_board": {
      const { name, description, teamId, projectId } = request.params.arguments as any;
      const board = await miroClient.createBoard({ name, description, teamId, projectId });
      return {
        content: [
          {
            type: "text",
            text: `Created board ${board.id} with name "${board.name}"`,
          },
        ],
      };
    }

    case "update_board": {
      const { boardId, name, description } = request.params.arguments as any;
      const board = await miroClient.updateBoard(boardId, { name, description });
      return {
        content: [
          {
            type: "text",
            text: `Updated board ${board.id}`,
          },
        ],
      };
    }

    case "delete_board": {
      const { boardId } = request.params.arguments as any;
      await miroClient.deleteBoard(boardId);
      return {
        content: [
          {
            type: "text",
            text: `Deleted board ${boardId}`,
          },
        ],
      };
    }

    case "copy_board": {
      const { boardId, name, description, projectId, teamId } = request.params.arguments as any;
      const board = await miroClient.copyBoard(boardId, { name, description, projectId, teamId });
      return {
        content: [
          {
            type: "text",
            text: `Created board copy ${board.id} with name "${board.name}"`,
          },
        ],
      };
    }

    case "share_board": {
      const { boardId, access, teamAccess } = request.params.arguments as any;
      await miroClient.shareBoard(boardId, { access, teamAccess });
      return {
        content: [
          {
            type: "text",
            text: `Updated sharing settings for board ${boardId}`,
          },
        ],
      };
    }

    // Board Members
    case "list_board_members": {
      const { boardId } = request.params.arguments as any;
      const members = await miroClient.getBoardMembers(boardId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(members, null, 2),
          },
        ],
      };
    }

    case "get_board_member": {
      const { boardId, userId } = request.params.arguments as any;
      const member = await miroClient.getBoardMember(boardId, userId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(member, null, 2),
          },
        ],
      };
    }

    case "invite_board_members": {
      const { boardId, emails, role, message } = request.params.arguments as any;
      await miroClient.inviteBoardMembers(boardId, { emails, role, message });
      return {
        content: [
          {
            type: "text",
            text: `Invited ${emails.length} members to board ${boardId} with role "${role}"`,
          },
        ],
      };
    }

    case "update_board_member": {
      const { boardId, userId, role } = request.params.arguments as any;
      const member = await miroClient.updateBoardMember(boardId, userId, { role });
      return {
        content: [
          {
            type: "text",
            text: `Updated member ${member.id} role to "${role}" on board ${boardId}`,
          },
        ],
      };
    }

    case "remove_board_member": {
      const { boardId, userId } = request.params.arguments as any;
      await miroClient.removeBoardMember(boardId, userId);
      return {
        content: [
          {
            type: "text",
            text: `Removed member ${userId} from board ${boardId}`,
          },
        ],
      };
    }

    // Items - Generic Operations
    case "get_board_items": {
      const { boardId, type, limit } = request.params.arguments as any;
      const items = await miroClient.getBoardItems(boardId, { type, limit });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }

    case "get_board_item": {
      const { boardId, itemId } = request.params.arguments as any;
      const item = await miroClient.getBoardItem(boardId, itemId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(item, null, 2),
          },
        ],
      };
    }

    case "update_board_item": {
      const { boardId, itemId, data } = request.params.arguments as any;
      const item = await miroClient.updateBoardItem(boardId, itemId, data);
      return {
        content: [
          {
            type: "text",
            text: `Updated item ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "delete_board_item": {
      const { boardId, itemId } = request.params.arguments as any;
      await miroClient.deleteBoardItem(boardId, itemId);
      return {
        content: [
          {
            type: "text",
            text: `Deleted item ${itemId} from board ${boardId}`,
          },
        ],
      };
    }

    // Items - Specific Types
    case "create_app_card": {
      const { boardId, data, position, geometry } = request.params.arguments as any;
      const item = await miroClient.createAppCard(boardId, { data, position, geometry });
      return {
        content: [
          {
            type: "text",
            text: `Created app card ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_card": {
      const { boardId, data, position, geometry } = request.params.arguments as any;
      const item = await miroClient.createCard(boardId, { data, position, geometry });
      return {
        content: [
          {
            type: "text",
            text: `Created card ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_document": {
      const { boardId, data, position, geometry } = request.params.arguments as any;
      const item = await miroClient.createDocument(boardId, { data, position, geometry });
      return {
        content: [
          {
            type: "text",
            text: `Created document ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_embed": {
      const { boardId, data, position, geometry } = request.params.arguments as any;
      const item = await miroClient.createEmbed(boardId, { data, position, geometry });
      return {
        content: [
          {
            type: "text",
            text: `Created embed ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_frame": {
      const { boardId, data, position, geometry } = request.params.arguments as any;
      const item = await miroClient.createFrame(boardId, { data, position, geometry });
      return {
        content: [
          {
            type: "text",
            text: `Created frame ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_image": {
      const { boardId, data, position, geometry } = request.params.arguments as any;
      const item = await miroClient.createImage(boardId, { data, position, geometry });
      return {
        content: [
          {
            type: "text",
            text: `Created image ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_shape": {
      const { boardId, shape, content, style, position, geometry } = request.params.arguments as any;
      const item = await miroClient.createShape(boardId, {
        data: {
          shape,
          content,
        },
        style: style || {},
        position: position || { x: 0, y: 0 },
        geometry: geometry || { width: 200, height: 200, rotation: 0 },
      });
      return {
        content: [
          {
            type: "text",
            text: `Created ${shape} shape with ID ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_sticky_note": {
      const { boardId, content, shape, color, position } = request.params.arguments as any;
      const item = await miroClient.createStickyNote(boardId, {
        data: {
          content,
          shape: shape || 'square'
        },
        style: {
          fillColor: color || 'yellow'
        },
        position: position || { x: 0, y: 0 },
        geometry: { width: 199, height: 228, rotation: 0 }
      });
      return {
        content: [
          {
            type: "text",
            text: `Created sticky note ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_text": {
      const { boardId, data, style, position } = request.params.arguments as any;
      const item = await miroClient.createText(boardId, {
        data,
        style: style || {},
        position: position || { x: 0, y: 0 },
        geometry: { width: 200, height: 100, rotation: 0 }
      });
      return {
        content: [
          {
            type: "text",
            text: `Created text item ${item.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_connector": {
      const { boardId, startItem, endItem, style } = request.params.arguments as any;
      const connector = await miroClient.createConnector(boardId, {
        startItem: {
          item: startItem.id,
          snapTo: startItem.snapTo || 'auto'
        },
        endItem: {
          item: endItem.id,
          snapTo: endItem.snapTo || 'auto'
        },
        style: {
          strokeColor: style.strokeColor,
          strokeWidth: style.strokeWidth || 1,
          strokeStyle: style.strokeStyle || 'normal',
          startStrokeCap: style.startStrokeCap || 'none',
          endStrokeCap: style.endStrokeCap || 'arrow'
        }
      });
      return {
        content: [
          {
            type: "text",
            text: `Created connector ${connector.id} between items ${startItem.id} and ${endItem.id} on board ${boardId}`,
          },
        ],
      };
    }

    // Groups
    case "get_groups": {
      const { boardId, cursor } = request.params.arguments as any;
      const groups = await miroClient.getGroups(boardId, cursor);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(groups, null, 2),
          },
        ],
      };
    }

    case "get_group": {
      const { boardId, groupId } = request.params.arguments as any;
      const group = await miroClient.getGroup(boardId, groupId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(group, null, 2),
          },
        ],
      };
    }

    case "create_group": {
      const { boardId, data, style, position, geometry, itemIds } = request.params.arguments as any;
      const group = await miroClient.createGroup(boardId, {
        data,
        style,
        position,
        geometry,
        itemIds
      });
      return {
        content: [
          {
            type: "text",
            text: `Created group ${group.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "update_group": {
      const { boardId, groupId, data, style, position, geometry } = request.params.arguments as any;
      const group = await miroClient.updateGroup(boardId, groupId, {
        data,
        style,
        position,
        geometry
      });
      return {
        content: [
          {
            type: "text",
            text: `Updated group ${group.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "delete_group": {
      const { boardId, groupId } = request.params.arguments as any;
      await miroClient.deleteGroup(boardId, groupId);
      return {
        content: [
          {
            type: "text",
            text: `Deleted group ${groupId} from board ${boardId}`,
          },
        ],
      };
    }

    case "get_group_items": {
      const { boardId, groupId } = request.params.arguments as any;
      const items = await miroClient.getGroupItems(boardId, groupId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }

    case "add_items_to_group": {
      const { boardId, groupId, itemIds } = request.params.arguments as any;
      await miroClient.addItemsToGroup(boardId, groupId, itemIds);
      return {
        content: [
          {
            type: "text",
            text: `Added ${itemIds.length} items to group ${groupId} on board ${boardId}`,
          },
        ],
      };
    }

    case "remove_items_from_group": {
      const { boardId, groupId, itemIds } = request.params.arguments as any;
      await miroClient.removeItemsFromGroup(boardId, groupId, itemIds);
      return {
        content: [
          {
            type: "text",
            text: `Removed ${itemIds.length} items from group ${groupId} on board ${boardId}`,
          },
        ],
      };
    }

    // Tags
    case "get_tags": {
      const { boardId } = request.params.arguments as any;
      const tags = await miroClient.getTags(boardId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tags, null, 2),
          },
        ],
      };
    }

    case "get_tag": {
      const { boardId, tagId } = request.params.arguments as any;
      const tag = await miroClient.getTag(boardId, tagId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tag, null, 2),
          },
        ],
      };
    }

    case "create_tag": {
      const { boardId, title, fillColor } = request.params.arguments as any;
      const tag = await miroClient.createTag(boardId, { title, fillColor });
      return {
        content: [
          {
            type: "text",
            text: `Created tag ${tag.id} with title "${tag.title}" on board ${boardId}`,
          },
        ],
      };
    }

    case "update_tag": {
      const { boardId, tagId, title, fillColor } = request.params.arguments as any;
      const tag = await miroClient.updateTag(boardId, tagId, { title, fillColor });
      return {
        content: [
          {
            type: "text",
            text: `Updated tag ${tag.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "delete_tag": {
      const { boardId, tagId } = request.params.arguments as any;
      await miroClient.deleteTag(boardId, tagId);
      return {
        content: [
          {
            type: "text",
            text: `Deleted tag ${tagId} from board ${boardId}`,
          },
        ],
      };
    }

    case "get_items_with_tag": {
      const { boardId, tagId } = request.params.arguments as any;
      const items = await miroClient.getItemsWithTag(boardId, tagId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }

    case "add_tag_to_items": {
      const { boardId, tagId, itemIds } = request.params.arguments as any;
      await miroClient.addTagToItems(boardId, tagId, itemIds);
      return {
        content: [
          {
            type: "text",
            text: `Added tag ${tagId} to ${itemIds.length} items on board ${boardId}`,
          },
        ],
      };
    }

    case "remove_tag_from_items": {
      const { boardId, tagId, itemIds } = request.params.arguments as any;
      await miroClient.removeTagFromItems(boardId, tagId, itemIds);
      return {
        content: [
          {
            type: "text",
            text: `Removed tag ${tagId} from ${itemIds.length} items on board ${boardId}`,
          },
        ],
      };
    }

    // Bulk Create Items
    case "bulk_create_items": {
      const { boardId, items } = request.params.arguments as any;
      const createdItems = await miroClient.bulkCreateItems(boardId, { items });
      return {
        content: [
          {
            type: "text",
            text: `Created ${createdItems.length} items on board ${boardId}`,
          },
        ],
      };
    }

    // Connectors
    case "get_connectors": {
      const { boardId, cursor } = request.params.arguments as any;
      const connectors = await miroClient.getConnectors(boardId, cursor);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(connectors, null, 2),
          },
        ],
      };
    }

    case "get_connector": {
      const { boardId, connectorId } = request.params.arguments as any;
      const connector = await miroClient.getConnector(boardId, connectorId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(connector, null, 2),
          },
        ],
      };
    }

    case "update_connector": {
      const { boardId, connectorId, startItem, endItem, style } = request.params.arguments as any;
      const connector = await miroClient.updateConnector(boardId, connectorId, {
        startItem,
        endItem,
        style
      });
      return {
        content: [
          {
            type: "text",
            text: `Updated connector ${connector.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "delete_connector": {
      const { boardId, connectorId } = request.params.arguments as any;
      await miroClient.deleteConnector(boardId, connectorId);
      return {
        content: [
          {
            type: "text",
            text: `Deleted connector ${connectorId} from board ${boardId}`,
          },
        ],
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async (request: Request<typeof ListPromptsRequestSchema>) => {
  return {
    prompts: [
      {
        name: "Working with MIRO",
        description: "Basic prompt for working with MIRO boards",
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request: Request<typeof GetPromptRequestSchema>) => {
  if (request.params.name === "Working with MIRO") {
    const keyFactsPath = path.join(process.cwd(), 'resources', 'boards-key-facts.md');
    const keyFacts = await fs.readFile(keyFactsPath, 'utf-8');
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: keyFacts,
          },
        },
      ],
    };
  }
  throw new Error("Unknown prompt");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
