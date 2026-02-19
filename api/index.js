export default function handler(req, res) {
  res.status(200).json({
    service: 'JOJUWallet API',
    status: 'ok',
    message: 'API server is running on a dedicated host.',
  });
}
