import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Sparkles, Hand } from 'lucide-react'
import { MAP_CREATION_STEPS_BY_METHOD } from '@/lib/guide-steps'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">Locap</div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button asChild>
              <Link href="/dashboard/new-map">地図を作る</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/guide">使い方</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/about">このサービスについて</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            だれでも
            <br />
            かんたん地図づくり
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            難しい言葉なしで、場所を囲んでボタンを押すだけ。直感的に地図を作れます。
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/dashboard/new-map">今すぐ作る</Link>
            </Button>
          </div>
        </div>

        <section className="py-14 space-y-10">
          <h2 className="text-3xl font-bold text-center">できること</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg border bg-card">
              <MapPin className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">場所を囲んで作成</h3>
              <p className="text-muted-foreground">地図データを見ながら、必要な場所だけ選べます。</p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Sparkles className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">道と建物を自動表示</h3>
              <p className="text-muted-foreground">選んだ場所に合わせて、土台の情報を自動で読み込みます。</p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Hand className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">置いて動かすだけ</h3>
              <p className="text-muted-foreground">お店や目印は、つかんで動かすだけで配置できます。</p>
            </div>
          </div>
        </section>

        <section className="py-14 space-y-8 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center">作り方</h2>
          {MAP_CREATION_STEPS_BY_METHOD.rectangle.map((step) => (
            <div key={step.title} className="rounded-lg border bg-card p-5">
              <p className="font-semibold">{step.title}</p>
              <p className="text-muted-foreground mt-1">{step.description}</p>
            </div>
          ))}
        </section>
      </section>
    </div>
  )
}
