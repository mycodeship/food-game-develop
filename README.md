# ご飯をあげようゲーム 公開手順

このフォルダには、ゲームをインターネット上に無料で公開するために整理した
ファイルが入っています。フロントエンド(画面)とバックエンド(AIセリフ生成)を
別々の無料サービスにアップロードする2段階の作業です。

---

## 0. 最初に必ずやること：古いAPIキーの無効化

元のファイルにはOpenAIのAPIキーがそのままコードに書かれていました。
このキーは**今すぐ**以下の手順で無効化してください。

1. https://platform.openai.com/api-keys を開く
2. 元のファイルにあったキー(`sk-proj-...`で始まるもの)を探して削除(Revoke)する
3. 新しいキーを発行する(この新しいキーは後で使います)

このREADMEおよび配布ファイルには古いキーも新しいキーも含めていません。

---

## 1. バックエンド(AIセリフ生成サーバー)をRenderに公開する

`backend` フォルダの内容をGitHubリポジトリにアップロードしてから、
[Render](https://render.com) にデプロイします。

1. GitHubアカウントがなければ作成し、新しいリポジトリを作る
2. `backend` フォルダの中身(`main.py`, `requirements.txt`, `render.yaml`, `.gitignore` など)を
   そのリポジトリにアップロードする(`.env` ファイルは作らない、アップロードしない)
3. Render (https://render.com) にサインアップし、「New +」→「Web Service」を選択
4. 先ほどのGitHubリポジトリを接続する
5. 設定項目を入力する
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Plan: Free
6. 「Environment」のところで環境変数を追加する
   - Key: `OPENAI_API_KEY`
   - Value: 手順0で発行した新しいAPIキー
7. 「Create Web Service」でデプロイを実行する
8. デプロイが完了すると `https://何かしらの名前.onrender.com` のようなURLが発行されるので、
   このURLをコピーしておく

補足：Renderの無料プランは15分間アクセスがないとスリープし、次のアクセス時に
起動まで30秒〜1分ほどかかります。個人のゲームとして使う分には問題ありません。
料金プランの内容は変更されることがあるので、利用前に
https://render.com/pricing で最新情報を確認してください。

---

## 2. フロントエンド側のURLを書き換える

`frontend/script.js` の一番上にある以下の行を、手順1で取得したRenderのURLに書き換えます。

```js
const API_URL = "https://your-backend.onrender.com";
```

例えば、Renderで発行されたURLが `https://gohan-game-backend.onrender.com` であれば、

```js
const API_URL = "https://gohan-game-backend.onrender.com";
```

のようにします。

---

## 3. フロントエンド(画面)をNetlifyやVercelに公開する

`frontend` フォルダ(index.html, style.css, script.js, 画像、音声ファイル一式)を
そのまま無料の静的サイトホスティングにアップロードします。

### Netlifyを使う場合(ドラッグ&ドロップで一番簡単)

1. https://app.netlify.com にサインアップ
2. 「Add new site」→「Deploy manually」を選択
3. `frontend` フォルダをそのままブラウザにドラッグ&ドロップ
4. 数秒で `https://何かしらの名前.netlify.app` のようなURLが発行される

### Vercelを使う場合

1. https://vercel.com にサインアップ
2. GitHubに `frontend` フォルダの内容をアップロードしてリポジトリを作る
3. Vercelで「New Project」からそのリポジトリを選んでデプロイ

どちらも無料で、時間制限なく使えます。

---

## 4. 動作確認

発行されたフロントエンドのURLをブラウザで開き、キャラクターを選んで
「はじめる」を押し、実際に食べ物を選んでAIのセリフが返ってくるか確認してください。

うまく動かない場合によくある原因：

- `script.js` の `API_URL` がRenderのURLに正しく書き換えられていない
- RenderでOpenAIの新しいAPIキーが環境変数として正しく設定されていない
- Renderがスリープ状態で、初回アクセス時に時間がかかっている(少し待って再読み込み)

---

## このバージョンで変更した点

- OpenAIのAPIキーをコードから削除し、環境変数 `OPENAI_API_KEY` から読み込むように変更
- ハイスコアの保存先をPostgreSQLデータベースから、各プレイヤーのブラウザの
  localStorageに変更(`/best_score`, `/save_score` のAPIとデータベース関連ファイルは削除)
- これにより、データベースサーバーを別に契約・維持する必要がなくなり、
  無料のホスティングだけで公開できる構成にしています

全員のハイスコアを1つの場所にまとめて表示したい場合は、後からデータベース
(例：Supabaseの無料PostgreSQL)を追加することも可能です。必要であれば
お知らせください。
