import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  // Pull values from .env
  const expectedUser = process.env.SITE_ADMIN_USER;
  const expectedPass = process.env.SITE_ADMIN_PASSWORD;

  if (!authHeader) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Diario do AMALIA"',
      },
    });
  }

  const auth = authHeader.split(' ')[1];
  const [user, pwd] = Buffer.from(auth, 'base64').toString().split(':');

  // Compare with .env values
  if (user === expectedUser && pwd === expectedPass) {
    return NextResponse.next();
  }

  return new NextResponse('Invalid Credentials', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Diario do AMALIA"',
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)'],
};
