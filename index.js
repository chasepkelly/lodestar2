const http = require('http');

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
