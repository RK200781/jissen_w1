import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // TODO: 認証システムが実装されたら、この機能を有効化する
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
