// Ultra-minimal: ZERO requires, just echo back
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    alive: true,
    url: req.url,
    method: req.method,
    nodeVersion: process.version,
    dirname: __dirname,
    env: {
      VERCEL: process.env.VERCEL || 'not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    },
  }));
};
