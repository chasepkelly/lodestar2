#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

// Type definitions based on the API documentation
interface LodeStarConfig {
  baseUrl?: string;
  clientName?: string;
  username?: string;
  password?: string;
}

interface LoginResponse {
  status: number;
  session_id?: string;
  message?: string;
}

interface LoanInfo {
  prop_type?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Single Family, Multi Family, Condo, Coop, PUD, Manufactured, Land
  amort_type?: 1 | 2; // Fixed Rate, Adjustable Rate
  loan_type?: 1 | 2 | 3 | 4; // Conventional, FHA, VA, USDA
  prop_purpose?: 1 | 2 | 3; // Primary, Secondary, Investment
  prop_usage?: 1 | 2 | 3; // Residential, Commercial, Mixed-use
  number_of_families?: number;
  is_first_time_home_buyer?: 0 | 1;
  is_federal_credit_union?: 0 | 1;
  is_same_lender_as_previous?: 0 | 1;
  is_same_borrwers_as_previous?: 0 | 1;
}

interface Endorsement {
  endo_id: number;
  endo_amount?: number;
}

interface AppraisalModifier {
  id: number;
}

interface ClosingCostRequest {
  state: string;
  county: string;
  city: string;
  address: string;
  purchase_price: number;
  session_id: string;
  close_date?: string;
  file_name?: string;
  purpose?: '00' | '04' | '11'; // Refinance, Refinance Reissue, Purchase
  loan_amount?: number;
  sub_agent_id?: number;
  endorsements?: Endorsement[];
  appraisal_modifiers?: AppraisalModifier[];
  loan_info?: LoanInfo;
  include_pdf?: boolean;
  include_hud?: boolean;
  include_cfpb?: boolean;
  include_breakdown?: boolean;
  include_documents?: boolean;
  include_questions?: boolean;
  include_line_1101_breakdown?: boolean;
  include_line_1201_breakdown?: boolean;
  include_line_1203_breakdown?: boolean;
}

interface Question {
  name: string;
  label: string;
  input_type: 'checkbox' | 'number' | 'text';
  value_type: 'boolean' | 'number' | 'percent' | 'date';
  default_value: any;
  related_doc: 'deed' | 'mort' | 'release' | 'att' | 'assign' | 'sub' | 'mod';
  categories: string[];
  field_values?: {
    options?: Array<{
      value: string;
      label: string;
    }>;
  };
}

class LodeStarClient {
  private client: AxiosInstance;
  private config: LodeStarConfig;
  private sessionId?: string;

  constructor(config: LodeStarConfig) {
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

  async login(username?: string, password?: string): Promise<LoginResponse> {
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
      
      const result = response.data as LoginResponse;
      if (result.status === 1 && result.session_id) {
        this.sessionId = result.session_id;
      }
      
      return result;
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async closingCostCalculations(request: ClosingCostRequest): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Closing cost calculation failed: ${error.message}`);
    }
  }

  async getPropertyTax(params: {
    state: string;
    county: string;
    city: string;
    address: string;
    close_date: string;
    file_name: string;
    purchase_price: number;
  }): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Property tax request failed: ${error.message}`);
    }
  }

  async getEndorsements(params: {
    state: string;
    county: string;
    purpose: string;
  }): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Get endorsements failed: ${error.message}`);
    }
  }

  async getAppraisalModifiers(params: {
    state: string;
    county: string;
    purpose: string;
    loan_info?: Partial<LoanInfo>;
  }): Promise<any> {
    if (!this.sessionId) {
      throw new Error('Not authenticated. Please login first.');
    }

    const queryParams: any = {
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
    } catch (error: any) {
      throw new Error(`Get appraisal modifiers failed: ${error.message}`);
    }
  }

  async getSubAgents(params: {
    state: string;
    county: string;
  }): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Get sub agents failed: ${error.message}`);
    }
  }

  async getCounties(state: string): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Get counties failed: ${error.message}`);
    }
  }

  async getTownships(params: {
    state: string;
    county: string;
  }): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Get townships failed: ${error.message}`);
    }
  }

  async getQuestions(request: ClosingCostRequest): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Get questions failed: ${error.message}`);
    }
  }

  async geocode(params: {
    state: string;
    county: string;
    city: string;
    address: string;
  }): Promise<any> {
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
    } catch (error: any) {
      throw new Error(`Geocode failed: ${error.message}`);
    }
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  isAuthenticated(): boolean {
    return !!this.sessionId;
  }
}

class LodeStarMCPServer {
  private server: Server;
  private lodeStarClient: LodeStarClient;

  constructor(config: LodeStarConfig) {
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

  private setupToolHandlers() {
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
            const result = await this.lodeStarClient.closingCostCalculations(args as ClosingCostRequest);
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
            const result = await this.lodeStarClient.getQuestions(args as ClosingCostRequest);
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
      } catch (error: any) {
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
  const config: LodeStarConfig = {
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