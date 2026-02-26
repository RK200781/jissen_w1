import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GUIDE_UPDATED_NOTE, MAP_CREATION_STEPS } from '@/lib/guide-steps'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">はじめての方へ</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard/new-map">地図を作る</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>まずはこの3つだけ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {MAP_CREATION_STEPS.map((step) => (
              <div key={step.title} className="rounded-md border p-4">
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>画面の見かた</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>・大きなボタンに「次にやること」が書かれています。</p>
            <p>・場所が選べると、色が変わって完了メッセージが出ます。</p>
            <p>・困ったときは「一覧に戻る」を押せば大丈夫です。</p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">{GUIDE_UPDATED_NOTE}</p>
      </main>
    </div>
  )
}
