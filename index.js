import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting clean Express server...');
console.log(`📍 PORT: ${port}`);

app.use(express.json());

app.get('/', (req, res) => {
  console.log('📥 GET / request received');
  res.json({
    name: 'Clean Express Server',
    status: 'working perfectly',
    port: port,
    timestamp: new Date().toISOString(),
    message: 'No duplicate imports, clean syntax!'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    port: port,
    uptime: process.uptime()
  });
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server listening on 0.0.0.0:${port}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully');
  server.close(() => process.exit(0));
});
