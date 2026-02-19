export default function handler(req, res) {
  const url = req.url || '/';

  // Swagger JSON spec
  if (url.startsWith('/v1/docs-json') || url.startsWith('/api/v1/docs-json')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(swaggerSpec);
  }

  // Swagger UI page
  if (url === '/' || url.startsWith('/docs') || url.startsWith('/v1/docs') || url.startsWith('/api/docs')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(swaggerHtml);
  }

  // Default: API info
  res.status(200).json({
    service: 'JOJUWallet API',
    status: 'ok',
    version: '1.0',
    docs: '/docs',
  });
}

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'JOJUWallet API',
    description: 'TRON TRC-20 Custodial Wallet API — JOJU Coin',
    version: '1.0',
  },
  servers: [
    { url: '/v1', description: 'Production' },
    { url: 'http://localhost:4000/api/v1', description: 'Local Development' },
  ],
  components: {
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  tags: [
    { name: 'Auth', description: '회원 인증' },
    { name: 'Users', description: '사용자 정보' },
    { name: 'Wallet', description: '지갑 조회' },
    { name: 'Transactions', description: '거래 (내부 전송)' },
    { name: 'Withdrawals', description: '출금 요청' },
    { name: 'Notifications', description: '알림' },
    { name: 'Admin - Auth', description: '관리자 인증' },
    { name: 'Admin - Dashboard', description: '관리자 대시보드' },
    { name: 'Admin - Users', description: '관리자 회원 관리' },
    { name: 'Admin - Wallets', description: '관리자 지갑 관리' },
    { name: 'Admin - Withdrawals', description: '관리자 출금 관리' },
    { name: 'Admin - Transactions', description: '관리자 거래 내역' },
    { name: 'Admin - Tokens', description: '관리자 토큰 관리' },
    { name: 'Admin - Audit', description: '관리자 감사 로그' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: '회원가입', operationId: 'register',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'name'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' } } } } } },
        responses: { 201: { description: '가입 성공, 이메일 인증 필요' } },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'], summary: '이메일 인증', operationId: 'verifyEmail',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'code'], properties: { email: { type: 'string' }, code: { type: 'string' } } } } } },
        responses: { 200: { description: '인증 완료' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: '로그인', operationId: 'login',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: 'JWT 토큰 반환 (accessToken, refreshToken)' } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: '토큰 갱신', operationId: 'refresh',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: '새 토큰 반환' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'], summary: '로그아웃', operationId: 'logout', security: [{ bearer: [] }],
        responses: { 200: { description: '로그아웃 완료' } },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'], summary: '내 정보 조회', operationId: 'getMe', security: [{ bearer: [] }],
        responses: { 200: { description: '사용자 정보' } },
      },
      patch: {
        tags: ['Users'], summary: '내 정보 수정', operationId: 'updateMe', security: [{ bearer: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } },
        responses: { 200: { description: '수정 완료' } },
      },
    },
    '/wallet': {
      get: {
        tags: ['Wallet'], summary: '내 지갑 조회', operationId: 'getWallet', security: [{ bearer: [] }],
        responses: { 200: { description: '지갑 정보 (주소, 잠금상태)' } },
      },
    },
    '/wallet/balance': {
      get: {
        tags: ['Wallet'], summary: '잔액 조회', operationId: 'getBalance', security: [{ bearer: [] }],
        responses: { 200: { description: '토큰별 잔액 + 대기 출금' } },
      },
    },
    '/transactions': {
      get: {
        tags: ['Transactions'], summary: '거래 내역 조회', operationId: 'getTransactions', security: [{ bearer: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['INTERNAL', 'EXTERNAL_SEND', 'EXTERNAL_RECEIVE', 'DEPOSIT'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED'] } },
        ],
        responses: { 200: { description: '거래 내역 목록' } },
      },
    },
    '/transactions/internal-transfer': {
      post: {
        tags: ['Transactions'], summary: '내부 전송', operationId: 'internalTransfer', security: [{ bearer: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['toEmail', 'amount', 'tokenSymbol'], properties: { toEmail: { type: 'string' }, amount: { type: 'number' }, tokenSymbol: { type: 'string', default: 'JOJU' } } } } } },
        responses: { 201: { description: '전송 완료' } },
      },
    },
    '/withdrawals': {
      post: {
        tags: ['Withdrawals'], summary: '출금 요청', operationId: 'createWithdrawal', security: [{ bearer: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['toAddress', 'amount', 'tokenSymbol'], properties: { toAddress: { type: 'string' }, amount: { type: 'number' }, tokenSymbol: { type: 'string', default: 'JOJU' } } } } } },
        responses: { 201: { description: '출금 요청 생성 (24시간 대기)' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'], summary: '알림 목록', operationId: 'getNotifications', security: [{ bearer: [] }],
        responses: { 200: { description: '알림 목록' } },
      },
    },
    '/notifications/unread-count': {
      get: {
        tags: ['Notifications'], summary: '읽지 않은 알림 수', operationId: 'getUnreadCount', security: [{ bearer: [] }],
        responses: { 200: { description: '미읽은 알림 수' } },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'], summary: '알림 읽음 처리', operationId: 'markAsRead', security: [{ bearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '읽음 처리 완료' } },
      },
    },
    '/admin/auth/login': {
      post: {
        tags: ['Admin - Auth'], summary: '관리자 로그인', operationId: 'adminLogin',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: '관리자 JWT 토큰 반환' } },
      },
    },
    '/admin/dashboard/stats': {
      get: {
        tags: ['Admin - Dashboard'], summary: '대시보드 통계', operationId: 'getDashboardStats', security: [{ bearer: [] }],
        responses: { 200: { description: '전체 통계 (유저수, 지갑수, 거래수 등)' } },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin - Users'], summary: '회원 목록', operationId: 'adminListUsers', security: [{ bearer: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '회원 목록' } },
      },
    },
    '/admin/wallets': {
      get: {
        tags: ['Admin - Wallets'], summary: '지갑 목록', operationId: 'adminListWallets', security: [{ bearer: [] }],
        responses: { 200: { description: '지갑 목록 (잔액 포함)' } },
      },
    },
    '/admin/wallets/transfer': {
      post: {
        tags: ['Admin - Wallets'], summary: '관리자 온체인 송금', operationId: 'adminTransfer', security: [{ bearer: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fromWalletId', 'toAddress', 'amount'], properties: { fromWalletId: { type: 'string' }, toAddress: { type: 'string' }, amount: { type: 'number' }, tokenSymbol: { type: 'string', default: 'JOJU' } } } } } },
        responses: { 200: { description: '송금 완료' } },
      },
    },
    '/admin/wallets/reconcile': {
      post: {
        tags: ['Admin - Wallets'], summary: '잔액 동기화 (온체인↔오프체인)', operationId: 'reconcile', security: [{ bearer: [] }],
        responses: { 200: { description: '동기화 결과' } },
      },
    },
    '/admin/wallets/{id}/sweep': {
      post: {
        tags: ['Admin - Wallets'], summary: 'Sweep (Hot Wallet로 이동)', operationId: 'sweepWallet', security: [{ bearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sweep 완료' } },
      },
    },
    '/admin/wallets/{id}/lock': {
      post: {
        tags: ['Admin - Wallets'], summary: '지갑 잠금', operationId: 'lockWallet', security: [{ bearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '잠금 완료' } },
      },
    },
    '/admin/wallets/{id}/unlock': {
      post: {
        tags: ['Admin - Wallets'], summary: '지갑 잠금 해제', operationId: 'unlockWallet', security: [{ bearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '잠금 해제 완료' } },
      },
    },
    '/admin/withdrawals': {
      get: {
        tags: ['Admin - Withdrawals'], summary: '출금 요청 목록', operationId: 'adminListWithdrawals', security: [{ bearer: [] }],
        responses: { 200: { description: '출금 요청 목록' } },
      },
    },
    '/admin/withdrawals/{id}/review': {
      post: {
        tags: ['Admin - Withdrawals'], summary: '출금 승인/거부', operationId: 'reviewWithdrawal', security: [{ bearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['APPROVE', 'REJECT'] }, note: { type: 'string' } } } } } },
        responses: { 200: { description: '처리 완료' } },
      },
    },
    '/admin/transactions': {
      get: {
        tags: ['Admin - Transactions'], summary: '전체 거래 내역', operationId: 'adminListTransactions', security: [{ bearer: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['INTERNAL', 'EXTERNAL_SEND', 'EXTERNAL_RECEIVE', 'DEPOSIT', 'SWEEP'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '거래 내역' } },
      },
    },
    '/admin/tokens': {
      get: {
        tags: ['Admin - Tokens'], summary: '지원 토큰 목록', operationId: 'listTokens', security: [{ bearer: [] }],
        responses: { 200: { description: '토큰 목록' } },
      },
      post: {
        tags: ['Admin - Tokens'], summary: '토큰 추가', operationId: 'createToken', security: [{ bearer: [] }],
        responses: { 201: { description: '토큰 추가 완료' } },
      },
    },
    '/admin/audit-logs': {
      get: {
        tags: ['Admin - Audit'], summary: '감사 로그 조회', operationId: 'getAuditLogs', security: [{ bearer: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: '감사 로그 목록' } },
      },
    },
  },
};

const swaggerHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JOJUWallet API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #1a1a2e; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/v1/docs-json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
