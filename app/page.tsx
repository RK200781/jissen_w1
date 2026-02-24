import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Zap, Users } from 'lucide-react'

export default function Home() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">Locap</div>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/dashboard">ダッシュボード</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            ローカルマーケットを
            <br />
            デジタル化しよう
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Locapは、高知県日曜市のようなローカルマーケットをGUIで簡単に管理・運営できるプラットフォームです。
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/dashboard">ダッシュボードへ</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">詳しく見る</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-20 space-y-12">
          <h2 className="text-3xl font-bold text-center">主な機能</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <MapPin className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">簡単な範囲選択</h3>
              <p className="text-muted-foreground">
                OpenStreetMapから直感的に地図範囲を選択できます。
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <Zap className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">自動道路生成</h3>
              <p className="text-muted-foreground">
                Overpass APIで選択範囲の道路データを自動生成します。
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <Users className="w-12 h-12 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">施設管理GUI</h3>
              <p className="text-muted-foreground">
                ドラッグ&ドロップで施設を配置、編集、削除できます。
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 space-y-12">
          <h2 className="text-3xl font-bold text-center">使い方</h2>
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-2">アカウント作成</h3>
                <p className="text-muted-foreground">
                  メールアドレスでアカウントを登録します。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-2">マップ範囲選択</h3>
                <p className="text-muted-foreground">
                  マップ上で矩形を描いて、管理する地域を選択します。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-2">施設を配置</h3>
                <p className="text-muted-foreground">
                  GUIで店舗やイベントスペースを簡単に配置できます。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-2">公開・共有</h3>
                <p className="text-muted-foreground">
                  作成したマップを公開・共有して、来訪者に見てもらいます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-center space-y-6">
          <h2 className="text-3xl font-bold">今すぐ始めましょう</h2>
          <p className="text-lg text-muted-foreground">
            ローカルマーケットのデジタル化は、Locapから。
          </p>
          <Button asChild size="lg">
            <Link href="/dashboard">ダッシュボードに移動</Link>
          </Button>
        </section>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>© 2026 Locap. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
