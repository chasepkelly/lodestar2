import express from 'express';
import axios from 'axios';

// Simplified LodeStar client for HTTP-only deployment
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

// HTTP server for Railway deployment
async function main() {
  const config = {
    clientName: process.env.LODESTAR_CLIENT_NAME || 'LodeStar_Demo',
    baseUrl: process.env.LODESTAR_BASE_URL,
    username: process.env.LODESTAR_USERNAME,
    password: process.env.LODESTAR_PASSWORD,
  };

  const lodeStarClient = new LodeStarClient(config);
  const port = process.env.PORT || 3000;
  const app = express();
  
  app.use(express.json());
  
  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'LodeStar Apollo3 Server',
      version: '1.0.0',
      status: 'running',
      description: 'HTTP API for LodeStar Apollo3 - title insurance and closing cost calculations',
      endpoints: {
        health: 'GET /',
        login: 'POST /api/login',
        calculate: 'POST /api/calculate',
        property_tax: 'POST /api/property-tax',
        endorsements: 'POST /api/endorsements',
        sub_agents: 'POST /api/sub-agents',
        counties: 'POST /api/counties',
        townships: 'POST /api/townships',
        questions: 'POST /api/questions',
        geocode: 'POST /api/geocode',
        info: 'GET /api/info'
      }
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/info', (req, res) => {
    res.json({
      server: 'LodeStar Apollo3 Server',
      api_version: '2.4.1',
      provider: 'LodeStarSS',
      authenticated: lodeStarClient.isAuthenticated(),
      session_id: lodeStarClient.getSessionId() ? 'active' : 'none'
    });
  });

  // Login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await lodeStarClient.login(username, password);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Calculate closing costs
  app.post('/api/calculate', async (req, res) => {
    try {
      const result = await lodeStarClient.closingCostCalculations(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get property tax
  app.post('/api/property-tax', async (req, res) => {
    try {
      const result = await lodeStarClient.getPropertyTax(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get endorsements
  app.post('/api/endorsements', async (req, res) => {
    try {
      const result = await lodeStarClient.getEndorsements(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get sub agents
  app.post('/api/sub-agents', async (req, res) => {
    try {
      const result = await lodeStarClient.getSubAgents(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get counties
  app.post('/api/counties', async (req, res) => {
    try {
      const { state } = req.body;
      const result = await lodeStarClient.getCounties(state);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get townships
  app.post('/api/townships', async (req, res) => {
    try {
      const result = await lodeStarClient.getTownships(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get questions
  app.post('/api/questions', async (req, res) => {
    try {
      const result = await lodeStarClient.getQuestions(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Geocode
  app.post('/api/geocode', async (req, res) => {
    try {
      const result = await lodeStarClient.geocode(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Error handling
  app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`✅ LodeStar HTTP server running on port ${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/`);
    console.log(`📊 API info: http://localhost:${port}/api/info`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
