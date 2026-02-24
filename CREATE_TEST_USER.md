## テストアカウント作成方法

テストユーザーを作成するには、以下のコマンドを実行してください：

```bash
node scripts/create-test-user.js
```

### テストアカウント情報

作成されるテストアカウント：
- **Email**: `test@gmail.com`
- **Password**: `test`

### 前提条件

1. Supabaseプロジェクトがセットアップされていること
2. 環境変数が正しく設定されていること：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### トラブルシューティング

#### "Missing Supabase credentials" エラーが出る場合
環境変数が正しく設定されているか確認してください。

```bash
echo $SUPABASE_SERVICE_ROLE_KEY
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### アカウントが既に存在する場合
新しいアカウントは作成されません。既存のアカウントでログインしてください。

### ログイン手順

1. ホームページ（`/`）から「ログイン」をクリック
2. 以下を入力：
   - Email: `test@gmail.com`
   - Password: `test`
3. ログインボタンをクリック
4. ダッシュボードにリダイレクトされます

### 動作確認

テストユーザーでログイン後、ダッシュボードで以下の機能をテストできます：

- マップの新規作成
- OpenStreetMapでの範囲選択
- 施設の追加・削除
- マップの管理・削除
