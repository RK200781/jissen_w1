export type SelectionMethod = 'rectangle' | 'polygon'

export const SELECTION_METHOD_OPTIONS = [
  {
    id: 'rectangle' as const,
    title: '四角で囲む',
    description: '地図を2回押したまま動かして、作りたい場所を四角で囲みます。',
  },
  {
    id: 'polygon' as const,
    title: '点と点を線でつなぐ',
    description: '地図の点を順番に選び、線でつないで形を作ります。',
  },
]

export const MAP_CREATION_STEPS_BY_METHOD: Record<SelectionMethod, { title: string; description: string }[]> = {
  rectangle: [
    {
      title: '① 四角で場所を囲む',
      description: '地図を2回押したまま動かして、作りたい場所を囲みます。',
    },
    {
      title: '② 地図を作る',
      description: '「地図を作る」ボタンを押します。',
    },
    {
      title: '③ お店や目印を置く',
      description: '必要な場所にお店や目印を置いて、最後に保存します。',
    },
  ],
  polygon: [
    {
      title: '① 点を置く',
      description: '地図を押して点を置き、場所の角を決めます。',
    },
    {
      title: '② 点と点を線でつなぐ',
      description: '線でつないで、作りたい形を作ります。',
    },
    {
      title: '③ 地図を作る',
      description: '「地図を作る」ボタンを押し、次の画面で目印を置きます。',
    },
  ],
}

export const GUIDE_UPDATED_NOTE = 'このページの手順は、地図作成画面と同じ内容を表示しています。'
