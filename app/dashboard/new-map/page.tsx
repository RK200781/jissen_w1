'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { MAP_CREATION_STEPS_BY_METHOD, type SelectionMethod, SELECTION_METHOD_OPTIONS } from '@/lib/guide-steps'

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
  const [selectionMethod, setSelectionMethod] = useState<SelectionMethod>('rectangle')
  const [selectedBounds, setSelectedBounds] = useState<SelectedBounds | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const steps = MAP_CREATION_STEPS_BY_METHOD[selectionMethod]

  const handleCreate = async () => {
    setError(null)

    if (!selectedBounds) {
      setError('先に場所を選んでください')
      return
    }

    setIsLoading(true)

    try {
      const mapId = Math.random().toString(36).substr(2, 9)
      const newMap = {
        id: mapId,
        name: `新しい地図 ${new Date().toLocaleDateString('ja-JP')}`,
        description: null,
        bounds: selectedBounds,
        created_at: new Date().toISOString(),
      }

      if (typeof window !== 'undefined') {
        const maps = JSON.parse(localStorage.getItem('maps') || '[]')
        maps.push(newMap)
        localStorage.setItem('maps', JSON.stringify(maps))
      }

      router.push(`/dashboard/editor/${mapId}`)
    } catch {
      setError('地図を作れませんでした。時間をおいてもう一度お試しください。')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            一覧に戻る
          </Link>
          <div className="flex items-center gap-4 text-sm flex-wrap justify-end">
            <Link href="/guide" className="text-primary underline underline-offset-4">
              使い方を見る
            </Link>
            <Link href="/about" className="text-primary underline underline-offset-4">
              このサービスについて
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>まず、選び方を決める</CardTitle>
            <CardDescription>作りたい場所の選び方を1つ選んでください。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {SELECTION_METHOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectionMethod(option.id)
                  setSelectedBounds(null)
                  setError(null)
                }}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectionMethod === option.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                }`}
              >
                <p className="font-semibold">{option.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>かんたん3ステップ</CardTitle>
            <CardDescription>今は {steps[0].title} を進めましょう。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {steps.map((step, index) => (
              <p key={step.title} className={index === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                {step.title}：{step.description}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{steps[0].title}</CardTitle>
            <CardDescription>{steps[0].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RangeSelectorMap onBoundsChange={setSelectedBounds} selectionMethod={selectionMethod} />

            {error && <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">{error}</div>}

            <Button
              type="button"
              onClick={handleCreate}
              disabled={isLoading || !selectedBounds}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  作成中...
                </span>
              ) : (
                '地図を作る'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
