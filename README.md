# AI Talk

AIとの対話を楽しむモダンなWebアプリケーション

## 🚀 機能

- 💬 直感的なチャットインターフェース
- 🤖 Chrome AI API統合による実際のAI応答
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

## 🚀 デプロイ

このプロジェクトはGitHub Actionsを使用してGitHub Pagesに自動デプロイされます。

### 手動デプロイ

```bash
# GitHub Pagesにデプロイ
npm run deploy
```

## 🤖 Chrome Summarizer APIについて

このアプリケーションはChrome Summarizer APIを使用して実際のAI応答を生成します。

### 使用方法

1. **Chrome拡張機能として使用**: `manifest.json`を設定してChrome拡張機能としてインストール
2. **PWAとして使用**: ChromeでPWAとしてインストールして使用
3. **フォールバック**: Chrome Summarizer APIが利用できない場合は、ルールベースの応答システムが動作

### Chrome Summarizer APIの利点

- Chrome拡張機能やPWAとして動作
- Chrome 120以降で利用可能
- 高品質なAI要約機能を提供

## 📝 開発ガイドライン

プロジェクトの開発ガイドラインについては [AGENTS.md](./AGENTS.md) を参照してください。

## 🌐 ライブデモ

[https://ma2saka-personal.github.io/ai-talk/](https://ma2saka-personal.github.io/ai-talk/)

## 📄 ライセンス

MIT License