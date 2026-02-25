'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { loadMapById, type LocalMapData } from '@/lib/local-maps'

const MapEditor = dynamic(() => import('@/components/map/map-editor'), {
  ssr: false,
  loading: () => <div className="w-full h-96 rounded-lg border bg-muted flex items-center justify-center">マップを読み込み中...</div>,
})

export default function EditorPage() {
  const [mapData, setMapData] = useState<LocalMapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const mapId = params.id as string

  useEffect(() => {
    if (!mapId) return

    try {
      const found = loadMapById(mapId)
      if (!found) {
        setError('マップが見つかりません')
      } else {
        setMapData(found)
      }
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [mapId])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button asChild>
            <Link href="/dashboard">ダッシュボードに戻る</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!mapData) {
    return <div className="min-h-screen flex items-center justify-center">マップが見つかりません</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{mapData.name}</h1>
              {mapData.description && <p className="text-muted-foreground text-sm">{mapData.description}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-80px)]">
        <MapEditor mapId={mapId} bounds={mapData.bounds} />
      </main>
    </div>
  )
}
