# おたすけ地蔵くん (1on1傾聴サポートAI)

マネージャーと部下の1on1ミーティングを、AIが「地蔵1on1メソッド」に基づいて支援する、企業向けのSaaSアプリケーションです。リアルタイムでの傾聴サポート、会話の要約とネクストアクションの提案、過去セッションの分析を通じて、より質の高い対話を促進し、部下の内省と成長、そして組織全体の信頼関係構築をサポートします。

## ✨ 主な機能

* **AIによる1on1サポート**: マネージャーがAIに相談することで、傾聴を促す質問や応答のヒントをリアルタイムで得られます。
* **議事録の自動生成**: 1on1でのAIとの対話履歴を、AIが要約し、重要なキーワードやネクストアクションを抽出して議事録を自動作成します。
* **過去セッションの管理**: これまでの1on1の議事録や対話履歴をいつでも閲覧・確認できます。
* **分析ダッシュボード**: 組織または個人の1on1で頻出するトピックや、会話の感情の推移をグラフで可視化し、対話の質を客観的に把握できます。
* **マルチテナントと役割ベースのアクセス制御**:
    * データは組織（企業）ごとに完全に分離され、セキュアに管理されます。
    * 組織の管理者は、組織全体のデータ閲覧やユーザー管理が可能です。
    * 一般ユーザーは、自分が関わったデータにのみアクセスできます。

## 🏗️ アーキテクチャの特徴

このアプリケーションは、保守性と拡張性を重視したモダンなアーキテクチャで構築されています。

* **ハイブリッド・マルチテナント**: データは組織単位で管理されつつ、ユーザーの役割（`admin`/`user`）に基づいてアクセス権限を細かく制御します。これにより、個人のプライバシーと組織的なデータ活用の両立を実現しています。
* **バックエンド**: `Routes` (ルーティング) → `Controllers` (リクエスト処理) → `Services` (外部API連携) → `Models` (DB操作) という責務が明確な多層アーキテクチャを採用しています。
* **フロントエンド**: `Views` (ページ) → `Components` (UI部品) → `Services` (API通信) → `Context` (状態管理) という、Reactのベストプラクティスに基づいた関心の分離を徹底しています。

## 🛠️ 使用技術

#### フロントエンド (Frontend)
* **フレームワーク**: React
* **ルーティング**: React Router
* **状態管理**: React Context API (`useContext`, `useReducer`)
* **API通信**: `fetch` API を用いたサービス層 (`apiClient.js`)
* **スタイリング**: CSS Modules, Plain CSS (with CSS Variables)
* **UI/Viz**: Chart.js, Heroicons

#### バックエンド (Backend)
* **フレームワーク**: Node.js, Express
* **データベース**: PostgreSQL
* **DBドライバ**: `pg`
* **認証**: JWT (jsonwebtoken), `bcryptjs`
* **AIサービス**:
    * Google Generative AI (Gemini): テキスト生成・要約

## 🚀 利用開始までの流れ

このアプリケーションをローカル環境で実行するための手順です。

### 1. 前提条件
* Node.js (v18以上推奨)
* npm
* PostgreSQLクライアントコマンドラインツール (`psql`)

### 2. 環境変数の設定
プロジェクトの**ルートディレクトリ**（`frontend`と`backend`がある場所）に `.env` という名前のファイルを作成し、以下の内容を記述・設定してください。

```.env.example
# Renderなどで作成したPostgreSQLデータベースの外部接続URL
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE_NAME"

# JWTの署名に使う非常に長くランダムな秘密の文字列
JWT_SECRET="your_super_secret_jwt_key_that_is_long_and_random"

# Google AI Studioで取得したAPIキー
GEMINI_API_KEY="your_gemini_api_key"

# CORS設定で許可するフロントエンドのURL
FRONTEND_URL="http://localhost:3000"

# (任意) バックエンドサーバーのポート番号
PORT=5000