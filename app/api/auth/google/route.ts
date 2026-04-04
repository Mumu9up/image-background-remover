import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json({ error: '缺少 credential' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'Google 登录未配置' }, { status: 500 });
    }

    const { payload } = await jwtVerify(credential, jwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });

    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const name = typeof payload.name === 'string' ? payload.name : '';
    const picture = typeof payload.picture === 'string' ? payload.picture : '';
    const emailVerified = payload.email_verified === true;

    if (!sub || !email || !emailVerified) {
      return NextResponse.json({ error: 'Google 用户信息无效' }, { status: 401 });
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 });
    }

    const session = await new SignJWT({ sub, email, name, picture })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(secret));

    const response = NextResponse.json({
      user: { sub, email, name, picture },
    });

    response.cookies.set('session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Google 登录校验失败' }, { status: 401 });
  }
}
