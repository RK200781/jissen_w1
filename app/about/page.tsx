import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ABOUT_PAGE_TITLE, ABOUT_SECTIONS, ABOUT_UPDATED_NOTE } from '@/lib/about-service'

const sectionOrder: Array<keyof typeof ABOUT_SECTIONS> = ['purpose', 'issues', 'features', 'design', 'users']

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">{ABOUT_PAGE_TITLE}</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href="/guide">使い方</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/new-map">地図を作る</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {sectionOrder.map((key) => {
          const section = ABOUT_SECTIONS[key]
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => (
                  <p key={item} className="text-sm leading-relaxed">・{item}</p>
                ))}
              </CardContent>
            </Card>
          )
        })}

        <p className="text-xs text-muted-foreground">{ABOUT_UPDATED_NOTE}</p>
      </main>
    </div>
  )
}
