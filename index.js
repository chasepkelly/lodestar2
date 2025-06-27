import { createServer } from 'http';

const serverPort = process.env.PORT || 8080;

console.log(`🚀 Starting clean server...`);
console.log(`📍 PORT from env: ${process.env.PORT}`);
console.log(`📍 Using port: ${serverPort}`);

const server = createServer((req, res) => {
  console.log(`📥 ${req.method} ${req.url}`);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json'
  });
  
  const response = {
    status: 'SUCCESS!',
    message: 'Clean server is working',
    port: serverPort,
    env_port: process.env.PORT,
    url: req.url,
    timestamp: new Date().toISOString()
  };
  
  res.end(JSON.stringify(response, null, 2));
});

server.listen(serverPort, '0.0.0.0', () => {
  console.log(`✅ Clean server listening on 0.0.0.0:${serverPort}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down');
  server.close(() => process.exit(0));
});
