'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    console.log('[v0] Login attempt:', email)

    // テスト用アカウントでのみログイン可能
    if (email === 'test@gmail.com' && password === 'test') {
      console.log('[v0] Credentials matched, saving user to localStorage')
      localStorage.setItem('user', JSON.stringify({ email, id: 'test-user-001' }))
      console.log('[v0] Redirecting to dashboard')
      router.push('/dashboard')
    } else {
      console.log('[v0] Credentials do not match')
      setError('テストアカウント (test@gmail.com / test) でログインしてください')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>Locapにログインしてマップを管理</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">メールアドレス</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">パスワード</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            {error && <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">{error}</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は{' '}
            <Link href="/auth/signup" className="text-primary underline">
              サインアップ
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
