module.exports = (req, res) => {
  res.json({
    service: 'JOJUWallet API',
    status: 'ok',
    message: 'API server is running on a dedicated host.',
  });
};
