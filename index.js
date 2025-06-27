#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

class LodeStarClient {
  constructor(config) {
    this.config = config;
    const baseUrl = config.baseUrl || `https://www.lodestarss.com/Live/${config.clientName || 'LodeStar_Demo'}/`;
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data?.status === 0) {
          throw new Error(error.response.data.message || error.response.data.error || 'API request failed');
        }
        throw error;
      }
    );
  }

  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username || this.config.username || '');
    formData.append('password', password || this.config.password || '');

    if (!formData.get('username') || !formData.get('password')) {
      throw new Error('Username and password are required for login');
    }

    try {
      const response = await this.client.post('/Login/login.php', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      const result = response.data;
      if (result.status === 1 && result.session_id) {
        this.sessionId = result.session_id;
      }
      
      return result;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async closingCostCalculations(request) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    const requestData = {
      ...request,
      session_id: this.sessionId,
    };

    try {
      const response = await this.client.post('/closing_cost_calculations.php', requestData);
      return response.data;
    } catch (error) {
      throw new Error(`Closing cost calculation failed: ${error.message}`);
    }
  }

  async getPropertyTax(params) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await this.client.get('/property_tax.php', {
        params: {
          ...params,
          session_id: this.sessionId,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Property tax request failed: ${error.message}`);
    }
  }

  async getEndorsements(params) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await this.client.get('/endorsements.php', {
        params: {
          ...params,
          session_id: this.sessionId,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Get endorsements failed: ${error.message}`);
    }
  }

  async getAppraisalModifiers(params) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    const queryParams = {
      state: params.state,
      county: params.county,
      purpose: params.purpose,
      session_id: this.sessionId,
    };

    // Add loan_info parameters if provided
    if (params.loan_info) {
      Object.entries(params.loan_info).forEach(([key, value]) => {
        queryParams[`loan_info[${key}]`] = value;
      });
    }

    try {
      const response = await this.client.get('/appraisal_modifiers.php', {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Get appraisal modifiers failed: ${error.message}`);
    }
  }

  async getSubAgents(params) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await this.client.get('/sub_agents.php', {
        params: {
          ...params,
          session_id: this.sessionId,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Get sub agents failed: ${error.message}`);
    }
  }

  async getCounties(state) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await this.client.get('/counties.php', {
        params: {
          state,
          session_id: this.sessionId,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Get counties failed: ${error.message}`);
    }
  }

  async getTownships(params) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await this.client.get('/townships.php', {
        params: {
          ...params,
          session_id: this.sessionId,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Get townships failed: ${error.message}`);
    }
  }

  async getQuestions(request) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    const requestData = {
      ...request,
      session_id: this.sessionId,
    };

    try {
      const response = await this.client.post('/questions.php', requestData);
      return response.data;
    } catch (error) {
      throw new Error(`Get questions failed: ${error.message}`);
    }
  }

  async geocode(params) {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await this.client.get('/geocode.php', {
        params: {
          ...params,
          session_id: this.sessionId,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Geocode failed: ${error.message}`);
    }
  }

  getSessionId() {
    return this.sessionId;
  }

  isAuthenticated() {
    return !!this.sessionId;
  }
}

class LodeStarMCPServer {
  constructor(config) {
    this.server = new Server({
      name: 'lodestar-apollo3-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.lodeStarClient = new LodeStarClient(config);
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'lodestar_login',
            description: 'Login to LodeStar API system with username and password',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Username for authentication (optional if set in config)',
                },
                password: {
                  type: 'string',
                  description: 'Password for authentication (optional if set in config)',
                },
              },
            },
          },
          {
            name: 'lodestar_closing_cost_calculations',
            description: 'Calculate title agent fees, title premiums, recording fees, and transfer taxes',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation (e.g., "NJ")' },
                county: { type: 'string', description: 'County name without "County" word (e.g., "Hudson")' },
                city: { type: 'string', description: 'City name (e.g., "Hoboken")' },
                address: { type: 'string', description: 'Property address (e.g., "110 Jefferson St. Apt 2")' },
                purchase_price: { type: 'number', description: 'Purchase price (e.g., 230000)' },
                close_date: { type: 'string', description: 'Closing date (YYYY-MM-DD format)' },
                file_name: { type: 'string', description: 'File name for the transaction' },
                purpose: { 
                  type: 'string', 
                  enum: ['00', '04', '11'],
                  description: 'Transaction purpose: 00=Refinance, 04=Refinance Reissue, 11=Purchase' 
                },
                loan_amount: { type: 'number', description: 'Loan amount' },
                sub_agent_id: { type: 'integer', description: 'Sub agent ID from sub_agents endpoint' },
                endorsements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      endo_id: { type: 'number' },
                      endo_amount: { type: 'number' }
                    },
                    required: ['endo_id']
                  },
                  description: 'Array of endorsement objects'
                },
                loan_info: {
                  type: 'object',
                  properties: {
                    prop_type: { type: 'integer', minimum: 1, maximum: 7 },
                    amort_type: { type: 'integer', minimum: 1, maximum: 2 },
                    loan_type: { type: 'integer', minimum: 1, maximum: 4 },
                    prop_purpose: { type: 'integer', minimum: 1, maximum: 3 },
                    prop_usage: { type: 'integer', minimum: 1, maximum: 3 },
                    number_of_families: { type: 'integer' },
                    is_first_time_home_buyer: { type: 'integer', minimum: 0, maximum: 1 },
                    is_federal_credit_union: { type: 'integer', minimum: 0, maximum: 1 },
                    is_same_lender_as_previous: { type: 'integer', minimum: 0, maximum: 1 },
                    is_same_borrwers_as_previous: { type: 'integer', minimum: 0, maximum: 1 },
                  },
                  description: 'Loan information object'
                },
                include_pdf: { type: 'boolean', description: 'Include base64 encoded PDF in response' },
                include_hud: { type: 'boolean', description: 'Include base64 encoded HUD in response' },
                include_cfpb: { type: 'boolean', description: 'Include base64 encoded CFPB in response' },
                include_breakdown: { type: 'boolean', description: 'Include fee breakdown in response' },
                include_documents: { type: 'boolean', description: 'Include document list in response' },
                include_questions: { type: 'boolean', description: 'Include questions list in response' },
              },
              required: ['state', 'county', 'city', 'address', 'purchase_price'],
            },
          },
          {
            name: 'lodestar_property_tax',
            description: 'Get property tax information (estimate)',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
                county: { type: 'string', description: 'County name' },
                city: { type: 'string', description: 'City name' },
                address: { type: 'string', description: 'Property address' },
                close_date: { type: 'string', description: 'Closing date (YYYY-MM-DD)' },
                file_name: { type: 'string', description: 'File name' },
                purchase_price: { type: 'number', description: 'Purchase price for tax calculation' },
              },
              required: ['state', 'county', 'city', 'address', 'close_date', 'file_name', 'purchase_price'],
            },
          },
          {
            name: 'lodestar_get_endorsements',
            description: 'Get available endorsements for a location and transaction purpose',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
                county: { type: 'string', description: 'County name' },
                purpose: { type: 'string', description: 'Transaction purpose (e.g., "11")' },
              },
              required: ['state', 'county', 'purpose'],
            },
          },
          {
            name: 'lodestar_get_appraisal_modifiers',
            description: 'Get available appraisal modifiers (required for appraisal fee calculations)',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
                county: { type: 'string', description: 'County name' },
                purpose: { type: 'string', description: 'Transaction purpose' },
                loan_info: {
                  type: 'object',
                  properties: {
                    prop_type: { type: 'integer', minimum: 1, maximum: 7 },
                    amort_type: { type: 'integer', minimum: 1, maximum: 2 },
                    loan_type: { type: 'integer', minimum: 1, maximum: 6 },
                  },
                  description: 'Optional loan information for filtering modifiers'
                },
              },
              required: ['state', 'county', 'purpose'],
            },
          },
          {
            name: 'lodestar_get_sub_agents',
            description: 'Get available sub agents (title companies) for a location',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
                county: { type: 'string', description: 'County name' },
              },
              required: ['state', 'county'],
            },
          },
          {
            name: 'lodestar_get_counties',
            description: 'Get all available counties for a state',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
              },
              required: ['state'],
            },
          },
          {
            name: 'lodestar_get_townships',
            description: 'Get all available townships for a county',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
                county: { type: 'string', description: 'County name' },
              },
              required: ['state', 'county'],
            },
          },
          {
            name: 'lodestar_get_questions',
            description: 'Get county-specific questions for a transaction',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
                county: { type: 'string', description: 'County name' },
                city: { type: 'string', description: 'City name' },
                address: { type: 'string', description: 'Property address' },
                purchase_price: { type: 'number', description: 'Purchase price' },
                close_date: { type: 'string', description: 'Closing date (YYYY-MM-DD)' },
                file_name: { type: 'string', description: 'File name' },
                purpose: { type: 'string', description: 'Transaction purpose' },
                loan_amount: { type: 'number', description: 'Loan amount' },
                sub_agent_id: { type: 'integer', description: 'Sub agent ID' },
                loan_info: {
                  type: 'object',
                  description: 'Loan information object'
                },
              },
              required: ['state', 'county', 'city', 'address', 'purchase_price'],
            },
          },
          {
            name: 'lodestar_geocode',
            description: 'Check if address is in a township and has additional fees',
            inputSchema: {
              type: 'object',
              properties: {
                state: { type: 'string', description: '2 letter state abbreviation' },
                county: { type: 'string', description: 'County name' },
                city: { type: 'string', description: 'City name' },
                address: { type: 'string', description: 'Property address' },
              },
              required: ['state', 'county', 'city', 'address'],
            },
          },
          {
            name: 'lodestar_get_session_status',
            description: 'Check if currently authenticated and get session info',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'lodestar_login': {
            const result = await this.lodeStarClient.login(args.username, args.password);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_closing_cost_calculations': {
            const result = await this.lodeStarClient.closingCostCalculations(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_property_tax': {
            const result = await this.lodeStarClient.getPropertyTax(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_get_endorsements': {
            const result = await this.lodeStarClient.getEndorsements(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_get_appraisal_modifiers': {
            const result = await this.lodeStarClient.getAppraisalModifiers(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_get_sub_agents': {
            const result = await this.lodeStarClient.getSubAgents(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_get_counties': {
            const result = await this.lodeStarClient.getCounties(args.state);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_get_townships': {
            const result = await this.lodeStarClient.getTownships(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_get_questions': {
            const result = await this.lodeStarClient.getQuestions(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_geocode': {
            const result = await this.lodeStarClient.geocode(args);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
              }],
            };
          }

          case 'lodestar_get_session_status': {
            const sessionId = this.lodeStarClient.getSessionId();
            const isAuthenticated = this.lodeStarClient.isAuthenticated();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  authenticated: isAuthenticated,
                  session_id: sessionId ? `${sessionId.substring(0, 8)}...` : null,
                  status: isAuthenticated ? 'Ready for API calls' : 'Not authenticated - please login first'
                }, null, 2),
              }],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LodeStar Apollo3 MCP server running on stdio');
  }
}

// Main execution
async function main() {
  const config = {
    clientName: process.env.LODESTAR_CLIENT_NAME || 'LodeStar_Demo',
    baseUrl: process.env.LODESTAR_BASE_URL,
    username: process.env.LODESTAR_USERNAME,
    password: process.env.LODESTAR_PASSWORD,
  };

  const server = new LodeStarMCPServer(config);
  await server.run();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down LodeStar Apollo3 MCP server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down LodeStar Apollo3 MCP server...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}
