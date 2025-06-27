import express from 'express';
import axios from 'axios';

// LodeStar client for ES modules
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

// Express app setup
const app = express();
const port = process.env.PORT || 3000;

console.log(`🚀 Starting LodeStar Apollo3 server...`);
console.log(`📍 PORT: ${port}`);

app.use(express.json());

// Initialize LodeStar client
const config = {
  clientName: process.env.LODESTAR_CLIENT_NAME || 'LodeStar_Demo',
  username: process.env.LODESTAR_USERNAME || 'demo',
  password: process.env.LODESTAR_PASSWORD || 'demo',
};

const lodeStarClient = new LodeStarClient(config);

// Routes
app.get('/', (req, res) => {
  console.log(`📥 GET / from ${req.ip}`);
  res.json({
    name: 'LodeStar Apollo3 Server',
    version: '1.0.0',
    status: 'running',
    description: 'HTTP API for LodeStar Apollo3 - title insurance and closing cost calculations',
    port: port,
    endpoints: {
      health: 'GET /health',
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
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: port,
    uptime: process.uptime()
  });
});

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.get('/api/info', (req, res) => {
  res.json({
    server: 'LodeStar Apollo3 Server',
    api_version: '2.4.1',
    provider: 'LodeStarSS',
    authenticated: lodeStarClient.isAuthenticated(),
    session_id: lodeStarClient.getSessionId() ? 'active' : 'none',
    config: {
      client_name: config.clientName,
      has_username: !!config.username,
      has_password: !!config.password
    }
  });
});

app.post('/api/login', async (req, res) => {
  try {
    console.log(`📥 POST /api/login`);
    const { username, password } = req.body;
    const result = await lodeStarClient.login(username, password);
    console.log(`✅ Login ${result.status === 1 ? 'successful' : 'failed'}`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Login error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/calculate', async (req, res) => {
  try {
    console.log(`📥 POST /api/calculate`);
    const result = await lodeStarClient.closingCostCalculations(req.body);
    console.log(`✅ Calculation completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Calculation error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/property-tax', async (req, res) => {
  try {
    console.log(`📥 POST /api/property-tax`);
    const result = await lodeStarClient.getPropertyTax(req.body);
    console.log(`✅ Property tax completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Property tax error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/endorsements', async (req, res) => {
  try {
    console.log(`📥 POST /api/endorsements`);
    const result = await lodeStarClient.getEndorsements(req.body);
    console.log(`✅ Endorsements completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Endorsements error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sub-agents', async (req, res) => {
  try {
    console.log(`📥 POST /api/sub-agents`);
    const result = await lodeStarClient.getSubAgents(req.body);
    console.log(`✅ Sub agents completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Sub agents error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/counties', async (req, res) => {
  try {
    console.log(`📥 POST /api/counties`);
    const { state } = req.body;
    const result = await lodeStarClient.getCounties(state);
    console.log(`✅ Counties completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Counties error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/townships', async (req, res) => {
  try {
    console.log(`📥 POST /api/townships`);
    const result = await lodeStarClient.getTownships(req.body);
    console.log(`✅ Townships completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Townships error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    console.log(`📥 POST /api/questions`);
    const result = await lodeStarClient.getQuestions(req.body);
    console.log(`✅ Questions completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Questions error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/geocode', async (req, res) => {
  try {
    console.log(`📥 POST /api/geocode`);
    const result = await lodeStarClient.geocode(req.body);
    console.log(`✅ Geocode completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Geocode error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', url: req.url });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ LodeStar Apollo3 server listening on 0.0.0.0:${port}`);
  console.log(`🌐 Server ready for LodeStar API calls!`);
});

server.on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});import express from 'express';
import axios from 'axios';

// LodeStar client for ES modules
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

  getSessionId() {
    return this.sessionId;
  }

  isAuthenticated() {
    return !!this.sessionId;
  }
}

// Express app setup
const app = express();
const port = process.env.PORT || 8080;

console.log(`🚀 Starting LodeStar server...`);
console.log(`📍 PORT from env: ${process.env.PORT}`);
console.log(`📍 Using port: ${port}`);

app.use(express.json());

// Initialize LodeStar client
const config = {
  clientName: process.env.LODESTAR_CLIENT_NAME || 'LodeStar_Demo',
  username: process.env.LODESTAR_USERNAME || 'demo',
  password: process.env.LODESTAR_PASSWORD || 'demo',
};

const lodeStarClient = new LodeStarClient(config);

// Routes
app.get('/', (req, res) => {
  console.log(`📥 GET / from ${req.ip}`);
  res.json({
    name: 'LodeStar Apollo3 Server',
    version: '1.0.0',
    status: 'running',
    description: 'HTTP API for LodeStar Apollo3 - title insurance and closing cost calculations',
    port: port,
    endpoints: {
      health: 'GET /health',
      login: 'POST /api/login',
      calculate: 'POST /api/calculate',
      property_tax: 'POST /api/property-tax',
      info: 'GET /api/info'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log(`📥 GET /health from ${req.ip}`);
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: port,
    uptime: process.uptime()
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    server: 'LodeStar Apollo3 Server',
    api_version: '2.4.1',
    provider: 'LodeStarSS',
    authenticated: lodeStarClient.isAuthenticated(),
    session_id: lodeStarClient.getSessionId() ? 'active' : 'none',
    config: {
      client_name: config.clientName,
      has_username: !!config.username,
      has_password: !!config.password
    }
  });
});

app.post('/api/login', async (req, res) => {
  try {
    console.log(`📥 POST /api/login`);
    const { username, password } = req.body;
    const result = await lodeStarClient.login(username, password);
    console.log(`✅ Login ${result.status === 1 ? 'successful' : 'failed'}`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Login error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/calculate', async (req, res) => {
  try {
    console.log(`📥 POST /api/calculate`);
    const result = await lodeStarClient.closingCostCalculations(req.body);
    console.log(`✅ Calculation completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Calculation error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/property-tax', async (req, res) => {
  try {
    console.log(`📥 POST /api/property-tax`);
    const result = await lodeStarClient.getPropertyTax(req.body);
    console.log(`✅ Property tax completed`);
    res.json(result);
  } catch (error) {
    console.error(`❌ Property tax error:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', url: req.url });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ LodeStar server listening on 0.0.0.0:${port}`);
  console.log(`🌐 Server should be accessible via Railway!`);
});

server.on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Keep alive heartbeat
setInterval(() => {
  console.log(`💓 Server heartbeat - uptime: ${Math.floor(process.uptime())}s`);
}, 60000);
