'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Map, BookOpen } from 'lucide-react'
import { loadMaps, saveMaps, type LocalMapData } from '@/lib/local-maps'

export default function DashboardPage() {
  const [maps, setMaps] = useState<LocalMapData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setMaps(loadMaps())
    setIsLoading(false)
  }, [])

  const handleDeleteMap = async (mapId: string) => {
    if (!confirm('この地図を削除しますか？')) return

    const next = maps.filter((m) => m.id !== mapId)
    setMaps(next)
    saveMaps(next)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">地図を作る</h1>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/guide">
              <BookOpen className="w-4 h-4" />
              はじめての方へ
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold">あなたの地図</h2>
            <p className="text-muted-foreground">続きから作業できます</p>
          </div>
          <Button asChild className="gap-2 h-11 px-5 text-base">
            <Link href="/dashboard/new-map">
              <Plus className="w-5 h-5" />
              新しく作る
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">読み込み中...</div>
        ) : maps.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <Map className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">まだ地図がありません</h3>
              <p className="text-muted-foreground mb-4">「新しく作る」から始めましょう</p>
              <Button asChild>
                <Link href="/dashboard/new-map">新しく作る</Link>
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
                      <Link href={`/dashboard/editor/${map.id}`}>続きを開く</Link>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteMap(map.id)}>
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
