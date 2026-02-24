# Locap セットアップガイド

Locapはローカルマーケットを管理・運営するためのデジタルプラットフォームです。本ガイドでは、プロジェクトのセットアップから運用までを説明します。

## 前提条件

- Node.js 18+
- pnpm または npm
- Supabaseアカウント

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてプロジェクトを作成
2. 以下の環境変数をメモしておく：
   - `NEXT_PUBLIC_SUPABASE_URL` - プロジェクトURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 公開キー

### 2. データベーススキーマの初期化

1. Supabaseコンソール → SQL Editorを開く
2. `/scripts/setup-database.sql`の内容をコピー
3. SQL Editorに貼り付けて実行

このスクリプトで以下が作成されます：
- PostGIS拡張機能の有効化
- `maps`, `roads`, `facilities`テーブル
- Row Level Security (RLS)ポリシー

### 3. プロジェクトの実行

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
# .env.local ファイルを作成して以下を追加：
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# 開発サーバーの起動
pnpm dev
```

ブラウザで `http://localhost:3000` を開く

## 使い方

### 1. アカウント作成

- ホームページから「サインアップ」をクリック
- メールアドレスとパスワードを入力
- 確認メールを確認

### 2. マップ作成

- ダッシュボードから「新規マップ作成」をクリック
- OpenStreetMap上で管理する地域を矩形選択
- マップ名と説明を入力して作成

### 3. 道路生成

- マップエディタの「道路を自動生成」ボタンをクリック
- Overpass APIから道路データが自動取得される

### 4. 施設配置

- エディタ右側の「施設を追加」から施設を追加
- マップ上のマーカーをドラッグして位置調整
- アイコンは追加時に選択可能

## ファイル構成

```
├── app/
│   ├── page.tsx                    # ホームページ
│   ├── dashboard/
│   │   ├── page.tsx               # ダッシュボード
│   │   ├── new-map/               # マップ作成ページ
│   │   └── editor/[id]/           # マップエディタ
│   ├── auth/
│   │   ├── login/                 # ログイン
│   │   ├── signup/                # サインアップ
│   │   └── verify-email/          # メール検証
│   └── api/
│       ├── maps/                  # マップAPI
│       └── maps/[id]/
│           ├── roads/generate     # 道路生成API
│           └── facilities/        # 施設API
├── components/
│   └── map/
│       ├── range-selector-map.tsx # 範囲選択マップ
│       ├── map-editor.tsx         # マップエディタ
│       └── roads-generator.tsx    # 道路生成UI
├── lib/
│   ├── supabase.ts                # クライアント設定
│   └── supabase-server.ts         # サーバー設定
└── scripts/
    └── setup-database.sql         # DB初期化スクリプト
```

## トラブルシューティング

### エラー: 「Supabaseに接続できません」
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトが有効か確認

### エラー: 「ログインに失敗しました」
- メールアドレスとパスワードが正しいか確認
- Supabaseの認証設定を確認

### 道路が生成されない
- Overpass APIが応答しているか確認
- ネットワーク接続を確認
- 大きすぎる地域を選択していないか確認（APIのタイムアウト）

## 今後の実装予定

- 3D地球儀での複数マップの可視化
- マップの公開・共有機能
- CSV/GeoJSONエクスポート
- リアルタイム協業編集
- モバイルアプリ対応

## ライセンス

MIT

## サポート

質問や問題がある場合は、GitHubのIssuesで報告してください。
