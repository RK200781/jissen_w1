'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { loadMapById, saveMapById, type LocalMapData } from '@/lib/local-maps'

const MapEditor = dynamic(() => import('@/components/map/map-editor'), {
  ssr: false,
  loading: () => <div className="w-full h-96 rounded-lg border bg-muted flex items-center justify-center">マップを読み込み中...</div>,
})

export default function EditorPage() {
  const [mapData, setMapData] = useState<LocalMapData | null>(null)
  const [mapName, setMapName] = useState('')
  const [description, setDescription] = useState('')
  const [isSavingInfo, setIsSavingInfo] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
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
        setMapName(found.name)
        setDescription(found.description ?? '')
      }
    } catch {
      setError('予期しないエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [mapId])

  const handleSaveMapInfo = () => {
    if (!mapData) return

    const nextName = mapName.trim()
    if (!nextName) {
      setInfoMessage('名前を入力してください')
      return
    }

    setIsSavingInfo(true)
    setInfoMessage(null)

    try {
      const updated = saveMapById(mapId, (current) => ({
        ...current,
        name: nextName,
        description: description.trim() ? description.trim() : null,
      }))

      if (!updated) {
        setInfoMessage('保存に失敗しました')
        return
      }

      setMapData(updated)
      setMapName(updated.name)
      setDescription(updated.description ?? '')
      setInfoMessage('名前と説明を保存しました')
    } finally {
      setIsSavingInfo(false)
    }
  }

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
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              一覧に戻る
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">地図の名前</label>
              <Input value={mapName} onChange={(e) => setMapName(e.target.value)} placeholder="例：商店街マップ" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">説明</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="例：イベント当日の出店場所をまとめた地図"
              />
            </div>
            <Button type="button" onClick={handleSaveMapInfo} disabled={isSavingInfo || !mapName.trim()}>
              {isSavingInfo ? '保存中...' : '名前と説明を保存'}
            </Button>
          </div>

          {infoMessage ? <p className="text-sm text-muted-foreground">{infoMessage}</p> : null}
        </div>
      </header>

      <main className="h-[calc(100vh-190px)]">
        <MapEditor mapId={mapId} bounds={mapData.bounds} />
      </main>
    </div>
  )
}
