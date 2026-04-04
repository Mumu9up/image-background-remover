import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }

  try {
    const { payload } = await jwtVerify(session, new TextEncoder().encode(secret));

    return NextResponse.json({
      authenticated: true,
      user: {
        sub: typeof payload.sub === 'string' ? payload.sub : '',
        email: typeof payload.email === 'string' ? payload.email : '',
        name: typeof payload.name === 'string' ? payload.name : '',
        picture: typeof payload.picture === 'string' ? payload.picture : '',
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
