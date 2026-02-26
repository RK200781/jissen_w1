import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GUIDE_UPDATED_NOTE, MAP_CREATION_STEPS_BY_METHOD, SELECTION_METHOD_OPTIONS } from '@/lib/guide-steps'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">はじめての方へ</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href="/about">このサービスについて</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/new-map">地図を作る</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>最初に選ぶこと</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SELECTION_METHOD_OPTIONS.map((option) => (
              <div key={option.id} className="rounded-md border p-4">
                <p className="font-semibold">{option.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>四角で囲むときの3ステップ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MAP_CREATION_STEPS_BY_METHOD.rectangle.map((step) => (
              <p key={step.title} className="text-sm">
                <span className="font-semibold">{step.title}</span>：{step.description}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>点と点を線でつなぐときの3ステップ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MAP_CREATION_STEPS_BY_METHOD.polygon.map((step) => (
              <p key={step.title} className="text-sm">
                <span className="font-semibold">{step.title}</span>：{step.description}
              </p>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">{GUIDE_UPDATED_NOTE}</p>
      </main>
    </div>
  )
}
