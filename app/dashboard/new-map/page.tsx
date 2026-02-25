'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const RangeSelectorMap = dynamic(() => import('@/components/map/range-selector-map'), {
  ssr: false,
  loading: () => <div className="w-full h-96 rounded-lg border bg-muted flex items-center justify-center">地図を読み込み中...</div>,
})

interface SelectedBounds {
  north: number
  south: number
  east: number
  west: number
}

export default function NewMapPage() {
  const [mapName, setMapName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedBounds, setSelectedBounds] = useState<SelectedBounds | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    console.log('[v0] handleCreate called')

    if (!mapName) {
      console.log('[v0] Map name is empty')
      setError('マップ名を入力してください')
      return
    }

    if (!selectedBounds) {
      console.log('[v0] Selected bounds is null')
      setError('マップ範囲を選択してください')
      return
    }

    setIsLoading(true)
    console.log('[v0] Creating map with name:', mapName)

    try {
      // シンプルなモック実装：新しいマップIDを生成してエディタに遷移
      const mapId = Math.random().toString(36).substr(2, 9)
      console.log('[v0] Generated map ID:', mapId)
      
      const newMap = {
        id: mapId,
        name: mapName,
        description: description || null,
        bounds: selectedBounds,
        created_at: new Date().toISOString(),
      }

      // localStorageに保存（クライアント側でのみ実行）
      if (typeof window !== 'undefined') {
        console.log('[v0] Saving to localStorage')
        const maps = JSON.parse(localStorage.getItem('maps') || '[]')
        maps.push(newMap)
        localStorage.setItem('maps', JSON.stringify(maps))
        console.log('[v0] Saved successfully, pushing to editor page')
      }

      router.push(`/dashboard/editor/${mapId}`)
    } catch (err) {
      console.error('[v0] Error creating map:', err)
      setError('マップの作成に失敗しました')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            ダッシュボードに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Map Selector */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>マップ範囲を選択</CardTitle>
                <CardDescription>矩形または自由ポリゴンで範囲を選択してください（保存は外接矩形）</CardDescription>
              </CardHeader>
              <CardContent>
                <RangeSelectorMap onBoundsChange={setSelectedBounds} />
                {selectedBounds && (
                  <div className="mt-4 p-3 bg-primary/10 rounded text-sm">
                    <p className="font-semibold mb-2">選択された範囲:</p>
                    <p>北: {selectedBounds.north.toFixed(4)}°</p>
                    <p>南: {selectedBounds.south.toFixed(4)}°</p>
                    <p>東: {selectedBounds.east.toFixed(4)}°</p>
                    <p>西: {selectedBounds.west.toFixed(4)}°</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Map Details */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>マップ情報</CardTitle>
                <CardDescription>マップの名前と説明を入力してください</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">マップ名 *</label>
                    <Input
                      placeholder="例：高知県日曜市"
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">説明</label>
                    <Textarea
                      placeholder="マップの説明を入力..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isLoading}
                      rows={4}
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">{error}</div>
                  )}
                  <Button
                    type="submit"
                    disabled={isLoading || !selectedBounds}
                    className="w-full"
                  >
                    {isLoading ? 'マップを作成中...' : 'マップを作成'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
