'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, AlertCircle } from 'lucide-react'

interface RoadsGeneratorProps {
  mapId: string
}

export default function RoadsGenerator({ mapId }: RoadsGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleGenerateRoads = async () => {
    setIsGenerating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/maps/${mapId}/roads/generate`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: data.error || '道路生成に失敗しました',
        })
        return
      }

      setMessage({
        type: 'success',
        text: data.message || `${data.count}本の道路を生成しました`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: '予期しないエラーが発生しました',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          道路を自動生成
        </CardTitle>
        <CardDescription>Overpass APIから道路データを取得・生成します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          このボタンを押すと、選択した地域の道路データがOpenStreetMapから自動で取得され、マップに追加されます。
        </p>
        {message && (
          <div
            className={`p-3 rounded flex gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{message.text}</span>
          </div>
        )}
        <Button
          onClick={handleGenerateRoads}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? '生成中...' : '道路を生成'}
        </Button>
      </CardContent>
    </Card>
  )
}
