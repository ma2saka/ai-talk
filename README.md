# AI Talk

AIとの対話を楽しむモダンなWebアプリケーションです。Chrome v140以降を前提にしています。サーバーサイドと通信はしません。

ほぼ cursur-agent により実装されています。

https://ma2saka.github.io/ai-talk/

## 🚀 機能

- 💬 直感的なチャットインターフェース
- 🤖 Chrome AI API統合による実際のAI応答
- 🎙️ 日本語の音声入力（ヘッダのトグルでON/OFF、結果は自動送信）
- 🎨 モダンでレスポンシブなUI
- 🌙 ダークモード/ライトモード対応
- 📱 モバイルフレンドリー
- ⚡ リアルタイム応答生成

## 🛠️ 技術スタック

- **React 18** - UIライブラリ
- **Vite** - 高速なビルドツール
- **Chrome Summarizer API** - AI応答生成
- **CSS3** - モダンなスタイリング
- **GitHub Pages** - ホスティング

## 💻 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

### 音声入力の利用

- ブラウザでマイク許可を求められたら「許可」を選択してください。
- ヘッダの「音声」トグルをONにすると、日本語で話した内容が確定次第チャットへ自動送信されます。
- Web Speech API 非対応のブラウザではトグルは無効になります（Chrome推奨）。

## 🚀 デプロイ

このプロジェクトはGitHub Actionsを使用してGitHub Pagesに自動デプロイされます。

### 手動デプロイ

```bash
# GitHub Pagesにデプロイ
npm run deploy
```
