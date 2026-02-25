'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, LogOut, Map } from 'lucide-react'
import { loadMaps, saveMaps, type LocalMapData } from '@/lib/local-maps'

export default function DashboardPage() {
  const [maps, setMaps] = useState<LocalMapData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMaps(loadMaps())
    setIsLoading(false)
  }, [])

  const handleLogout = async () => {
    router.push('/')
  }

  const handleDeleteMap = async (mapId: string) => {
    if (!confirm('このマップを削除しますか？')) return

    const next = maps.filter((m) => m.id !== mapId)
    setMaps(next)
    saveMaps(next)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Locap ダッシュボード</h1>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            ログアウト
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold">マイマップ</h2>
            <p className="text-muted-foreground">作成したマップを管理します</p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/dashboard/new-map">
              <Plus className="w-4 h-4" />
              新規マップ作成
            </Link>
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
        )}

        {isLoading ? (
          <div className="text-center py-12">読み込み中...</div>
        ) : maps.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <Map className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">マップがまだ作成されていません</h3>
              <p className="text-muted-foreground mb-4">最初のマップを作成して始めましょう</p>
              <Button asChild>
                <Link href="/dashboard/new-map">新規マップ作成</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((map) => (
              <Card key={map.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{map.name}</CardTitle>
                  <CardDescription>{map.description ?? '説明なし'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button asChild variant="default" size="sm" className="flex-1">
                      <Link href={`/dashboard/editor/${map.id}`}>編集</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteMap(map.id)}
                    >
                      削除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
