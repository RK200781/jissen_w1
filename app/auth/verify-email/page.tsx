'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">確認メールを送信しました</CardTitle>
          <CardDescription>メールを確認してアカウントを有効にしてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            登録したメールアドレスに確認リンクを送信しました。メール内のリンクをクリックしてアカウントを有効にしてください。
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/auth/login">ログインへ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
