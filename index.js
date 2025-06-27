import { createServer } from 'http';

const port = process.env.PORT || 8080;

console.log(`🚀 Starting server...`);
console.log(`📍 PORT from env: ${process.env.PORT}`);
console.log(`📍 Using port: ${port}`);
console.log(`📍 Node version: ${process.version}`);

const server = createServer((req, res) => {
  console.log(`📥 ${req.method} ${req.url}`);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json'
  });
  
  res.end(JSON.stringify({
    status: 'WORKING!',
    message: 'Railway connection successful',
    port: port,
    env_port: process.env.PORT,
    url: req.url,
    timestamp: new Date().toISOString()
  }, null, 2));
});

server.on('listening', () => {
  console.log(`✅ Server successfully listening on 0.0.0.0:${port}`);
  console.log(`🌐 Railway should connect now!`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

server.listen(port, '0.0.0.0');

// Keep alive
setInterval(() => {
  console.log(`💓 Server heartbeat - still running on port ${port}`);
}, 30000);

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => process.exit(0));
});const http = require('http');

const port = process.env.PORT || 8080;

console.log(`🚀 Starting server...`);
console.log(`📍 PORT from env: ${process.env.PORT}`);
console.log(`📍 Using port: ${port}`);
console.log(`📍 Node version: ${process.version}`);

const server = http.createServer((req, res) => {
  console.log(`📥 ${req.method} ${req.url} from ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json'
  });
  
  res.end(JSON.stringify({
    status: 'WORKING!',
    message: 'Railway connection successful',
    port: port,
    env_port: process.env.PORT,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  }, null, 2));
});

server.on('listening', () => {
  console.log(`✅ Server successfully listening on 0.0.0.0:${port}`);
  console.log(`🌐 Railway should connect now!`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

server.listen(port, '0.0.0.0');

// Keep alive
setInterval(() => {
  console.log(`💓 Server heartbeat - still running on port ${port}`);
}, 30000);

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => process.exit(0));
});const http = require('http');

const port = process.env.PORT || 3000;

console.log(`Starting server on port ${port}`);
console.log(`PORT env variable: ${process.env.PORT}`);

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  res.end(JSON.stringify({
    status: 'success',
    message: 'Server is working!',
    port: port,
    url: req.url,
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server listening on 0.0.0.0:${port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
