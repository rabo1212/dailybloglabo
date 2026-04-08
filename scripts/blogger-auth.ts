#!/usr/bin/env tsx
/**
 * Blogger OAuth 토큰 발급 스크립트
 *
 * 1회만 실행하면 됨. refresh_token을 .env.local에 저장.
 * 사용법: npx tsx scripts/blogger-auth.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import http from 'http';

const CLIENT_ID = process.env.BLOGGER_CLIENT_ID;
const CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3009/callback';
const SCOPES = 'https://www.googleapis.com/auth/blogger';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET을 .env.local에 설정하세요.');
  process.exit(1);
}

// Step 1: OAuth URL 생성
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n=== Blogger OAuth 인증 ===\n');
console.log('아래 URL을 브라우저에서 열어주세요:\n');
console.log(authUrl);
console.log('\n인증 후 리디렉션을 기다리는 중...\n');

// Step 2: 콜백 서버
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://localhost:3009`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('No code received');
    return;
  }

  // Step 3: code → token 교환
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      res.writeHead(400);
      res.end(`Error: ${tokenData.error_description}`);
      console.error('토큰 교환 실패:', tokenData);
      server.close();
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>인증 완료! 터미널을 확인하세요.</h1>');

    console.log('=== 토큰 발급 성공 ===\n');
    console.log('.env.local에 아래 값을 추가하세요:\n');
    console.log(`BLOGGER_REFRESH_TOKEN=${tokenData.refresh_token}`);
    console.log(`\naccess_token (참고용, 자동 갱신됨): ${tokenData.access_token?.slice(0, 30)}...`);

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end('Token exchange failed');
    console.error('에러:', err);
    server.close();
  }
});

server.listen(3009, () => {
  // 브라우저 자동 열기
  import('child_process').then(({ exec }) => {
    exec(`open "${authUrl}"`);
  });
});
