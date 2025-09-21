// AIモデル関連のロジックを集約

export async function checkModelStatus(language = 'ja') {
  try {
    const model = await LanguageModel.create({ language })

    if (model.status) {
      switch (model.status) {
        case 'available':
          return { status: 'ready', message: 'モデルが利用可能です' }
        case 'downloading':
          return { status: 'downloading', message: 'モデルをダウンロード中です', progress: model.downloadProgress }
        case 'downloadable':
          return { status: 'downloadable', message: 'モデルをダウンロードできます' }
        case 'not-available':
          return { status: 'not-available', message: 'モデルが利用できません' }
        default:
          return { status: 'unknown', message: 'モデル状態が不明です' }
      }
    }

    // statusが無い場合はプロンプト実行で検知
    try {
      await model.prompt('テスト')
      return { status: 'ready', message: 'モデルが利用可能です' }
    } catch (promptError) {
      if (promptError?.message?.includes('download')) {
        return { status: 'downloading', message: 'モデルをダウンロード中です' }
      }
      return { status: 'error', message: 'モデルでエラーが発生しました' }
    }
  } catch (error) {
    if (error?.message) {
      if (error.message.includes('download') || error.message.includes('downloading')) {
        return { status: 'downloading', message: 'モデルをダウンロード中です' }
      }
      if (error.message.includes('not available') || error.message.includes('unavailable')) {
        return { status: 'not-available', message: 'モデルが利用できません' }
      }
      if (error.message.includes('user gesture')) {
        return { status: 'downloadable', message: 'モデルをダウンロードできます' }
      }
    }
    return { status: 'error', message: 'モデルの状態確認でエラーが発生しました' }
  }
}

export async function startModelDownload(language = 'ja') {
  try {
    await LanguageModel.create({ language })
    return { started: true }
  } catch (error) {
    return { started: false, error }
  }
}

export async function promptAI({ message, context, history, language = 'ja' }) {
  const userName = context?.userName ? `${context.userName}さん` : 'ユーザー'
  const topicsText = context?.topics?.length ? `これまでの話題: ${context.topics.join(', ')}` : ''

  const recentHistory = (history || []).slice(-10)
  const historyText = recentHistory.length > 0
    ? `\n\nこれまでの会話履歴:\n${recentHistory.map(msg => `${msg.sender === 'user' ? userName : 'AI'}: ${msg.text}`).join('\n')}`
    : ''

  const prompt = `あなたはAI Talkという対話アプリケーションのAIエージェントです。${userName}と自然な日本語で会話してください。もっとも最近の発言の意図に合わせて、自然な応答をします。ユーザーが質問を望んでいない場合は共感を示すに留めたり、話題を変えたりします。ユーザーが書き込んでいないことを決めつけて書かないようにします。

${topicsText ? `${topicsText}` : ''}${historyText}

現在の会話:
${userName}: ${message}

AIエージェントとして、上記の会話履歴を参考に、${userName}の現在のメッセージ「${message}」に対して、これまでの会話でAIエージェントの応答に対するユーザーの満足度の推測、ユーザーの状況の推測、ユーザーの性格の推測、エージェントへの要求を思考し、応答してください。情報が不足していても、大胆に推測を交えて応答する方が満足してもらえる可能性が高いです。
また、直近の話題から関連するトピックを推定してください。トピックは以下のようなカテゴリから選択してください：映画、プログラミング、寿司のネタ、人生相談、料理、音楽、スポーツ、旅行、仕事、趣味、勉強、健康、家族、友達、ペット、ゲーム、読書、アニメ、漫画、悪巧み、愚痴、その他。
*出力はJSON形式とします。改行文字は"\n"としてエスケープしてください。*、{ "thinking": { "満足度の推測": "満足度の推測内容", "ユーザーの状況の推測": "ユーザーの状況の推測内容", "ユーザーの性格の推測": "ユーザーの性格の推測内容", "エージェントへの要求": "エージェントへの要求内容" }, "topics": ["トピック1", "トピック2"], "answer": "応答内容" }としてください。`

  try {
    const session = await LanguageModel.create({ language })
    const response = await session.prompt(prompt)

    // JSONのコードフェンスをクリーニング
    let clean = (response || '').trim()
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    try {
      const json = JSON.parse(clean)
      const topics = Array.isArray(json.topics) ? json.topics : []
      return {
        displayText: json.answer || response,
        fullResponse: JSON.stringify(json, null, 2),
        isJson: true,
        topics
      }
    } catch {
      return {
        displayText: response || '申し訳ございません。応答を生成できませんでした。',
        fullResponse: response || '申し訳ございません。応答を生成できませんでした。',
        isJson: false,
        topics: []
      }
    }
  } catch (error) {
    throw error
  }
}

