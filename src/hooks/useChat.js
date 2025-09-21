import { useEffect, useState } from 'react'
import { checkModelStatus, startModelDownload, promptAI, warmupSession, isStreamingSupported, promptAIStream, summarizeHistory } from '../services/aiModel'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(null)
  const [speechDraft, setSpeechDraft] = useState('')
  const [aiEphemeral, setAiEphemeral] = useState({ active: false, stage: null })
  const [conversationSummary, setConversationSummary] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [conversationContext, setConversationContext] = useState({ userName: null, topics: [] })
  const [conversationHistory, setConversationHistory] = useState([])
  const [expandedMessages, setExpandedMessages] = useState(new Set())
  const [modelStatus, setModelStatus] = useState({ status: 'checking', message: 'AI機能を確認中...' })

  useEffect(() => {
    checkAIAvailability()
  }, [])

  const toggleMessageExpansion = (index) => {
    setExpandedMessages(prev => {
      const s = new Set(prev)
      s.has(index) ? s.delete(index) : s.add(index)
      return s
    })
  }

  async function checkAIAvailability() {
    if (typeof LanguageModel === 'undefined') {
      setModelStatus({ status: 'not-available', message: 'AI機能が利用できません。Chrome の設定を確認してください。' })
      setAiAvailable(false)
      return
    }
    try {
      const status = await checkModelStatus('ja')
      setModelStatus(status)
      setAiAvailable(['ready', 'downloading', 'downloadable'].includes(status.status))
      if (status.status === 'ready') {
        // セッションを先行生成してウォームアップ
        warmupSession('ja')
      }

      if (status.status === 'downloading') {
        const poll = async () => {
          const current = await checkModelStatus('ja')
          setModelStatus(current)
          if (current.status === 'downloading') {
            setTimeout(poll, 3000)
          }
        }
        setTimeout(poll, 3000)
      }
    } catch {
      setModelStatus({ status: 'error', message: 'AI機能の状態確認でエラーが発生しました。' })
      setAiAvailable(false)
    }
  }

  async function beginModelDownload() {
    setModelStatus({ status: 'downloading', message: 'モデルのダウンロードを開始しています...' })
    await startModelDownload('ja')
    const poll = async () => {
      const current = await checkModelStatus('ja')
      setModelStatus(current)
      if (current.status === 'downloading') {
        setTimeout(poll, 3000)
      }
      if (current.status === 'ready') {
        setAiAvailable(true)
      }
    }
    setTimeout(poll, 3000)
  }

  function updateConversationContext(message) {
    if (message.includes('名前') && message.includes('です')) {
      const nameMatch = message.match(/([あ-んア-ン一-龯]{2,4})です/)
      if (nameMatch) {
        setConversationContext(prev => ({ ...prev, userName: nameMatch[1] }))
      }
    }
  }

  async function sendMessage(userMessage) {
    if (!userMessage || isLoading || !aiAvailable) return

    if (userMessage === '/log') {
      const aiTurns = conversationHistory.filter(m => m.sender === 'ai').length
      const logMessage = `会話履歴 (${conversationHistory.length}件, AI応答 ${aiTurns}件):\n${conversationHistory.map(msg => {
        const messageText = msg.displayText || msg.text || 'メッセージなし'
        return `${msg.sender}: ${messageText}`
      }).join('\n')}\n\n要約: ${conversationSummary || '(なし)'}\n要約中: ${isSummarizing ? 'はい' : 'いいえ'}`
      setMessages(prev => [...prev, { text: logMessage, sender: 'system', timestamp: new Date() }])
      setInput('')
      return
    }

    const userMessageObj = { text: userMessage, sender: 'user', timestamp: new Date() }
    setMessages(prev => [...prev, userMessageObj])
    setConversationHistory(prev => [...prev, userMessageObj])
    updateConversationContext(userMessage)
    setInput('')
    setSpeechDraft('')
    setIsLoading(true)

    // ステータス表示: 受信 → 送信（即時）
    setAiEphemeral({ active: true, stage: 'received' })
    setTimeout(() => setAiEphemeral({ active: true, stage: 'sent' }), 1000)

    // 以降の一時表示は aiEphemeral をUIで描画（バブルはmessagesに追加しない）

    try {
      // モデル状態の特別ケース
      let status = modelStatus
      if (!status || status.status !== 'ready') {
        status = await checkModelStatus('ja')
        setModelStatus(status)
      }
      if (status.status === 'downloading') {
        const progressText = status.progress ? ` (${Math.round(status.progress * 100)}%完了)` : ''
        const aiMessageObj = {
          displayText: `ダウンロード中...${progressText}`,
          fullResponse: JSON.stringify({ status: 'downloading', message: status.message, progress: status.progress }, null, 2),
          isJson: true,
          sender: 'ai',
          timestamp: new Date()
        }
        setAiEphemeral({ active: false, stage: null })
        setMessages(prev => [...prev, aiMessageObj])
        setConversationHistory(prev => [...prev, aiMessageObj])
        setIsLoading(false)
        return
      }
      if (['downloadable', 'not-available', 'error'].includes(status.status)) {
        const mapText = {
          downloadable: 'モデルをダウンロードする必要があります。下のボタンで開始してください。',
          'not-available': 'モデルが利用できません。ブラウザの設定を確認してください。',
          error: '申し訳ございません。AI機能でエラーが発生しました。'
        }
        const aiMessageObj = {
          displayText: mapText[status.status],
          fullResponse: JSON.stringify({ status: status.status, message: status.message }, null, 2),
          isJson: true,
          sender: 'ai',
          timestamp: new Date()
        }
        setAiEphemeral({ active: false, stage: null })
        setMessages(prev => [...prev, aiMessageObj])
        setConversationHistory(prev => [...prev, aiMessageObj])
        setIsLoading(false)
        return
      }

      // ストリーミング対応判定
      setAiEphemeral({ active: true, stage: 'thinking' })
      const streaming = await isStreamingSupported('ja')
      let aiMessageObj
      if (streaming) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
        setMessages(prev => [...prev, { id, sender: 'ai', text: '', timestamp: new Date(), streaming: true }])

        const { finalText } = await promptAIStream({
          message: userMessage,
          context: conversationContext,
          history: conversationHistory,
          summary: conversationSummary,
          language: 'ja',
          onChunk: (delta) => {
            // 受信断片を追記
            setMessages(prev => prev.map(m => m.id === id ? { ...m, text: (m.text || '') + delta } : m))
          }
        })

        // 最終テキストをJSONとして解釈
        let responseObj
        try {
          let clean = (finalText || '').trim()
          if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '')
          responseObj = JSON.parse(clean)
        } catch {}

        if (responseObj && typeof responseObj === 'object') {
          if (responseObj.topics?.length) {
            setConversationContext(prev => ({ ...prev, topics: [...new Set([...prev.topics, ...responseObj.topics])] }))
          }
          aiMessageObj = { displayText: responseObj.answer || finalText, fullResponse: JSON.stringify(responseObj, null, 2), isJson: true, sender: 'ai', timestamp: new Date() }
          setMessages(prev => prev.map(m => m.id === id ? aiMessageObj : m))
        } else {
          aiMessageObj = { text: finalText || '申し訳ございません。応答を生成できませんでした。', sender: 'ai', timestamp: new Date() }
          setMessages(prev => prev.map(m => m.id === id ? aiMessageObj : m))
        }
      } else {
        const aiResponse = await promptAI({ message: userMessage, context: conversationContext, history: conversationHistory, summary: conversationSummary, language: 'ja' })
        aiMessageObj = { ...aiResponse, sender: 'ai', timestamp: new Date() }
        setMessages(prev => [...prev, aiMessageObj])
      }

      setAiEphemeral({ active: false, stage: null })
      setConversationHistory(prev => [...prev, aiMessageObj])

      // 4会話（= AI応答4件）ごとに要約を更新
      const newHistory = conversationHistory.concat([aiMessageObj])
      const aiTurns = newHistory.filter(m => m.sender === 'ai').length
      if (!isSummarizing && aiTurns > 0 && aiTurns % 4 === 0) {
        setIsSummarizing(true)
        ;(async () => {
          const res = await summarizeHistory({ history: newHistory, language: 'ja' })
          if (res.summary) setConversationSummary(res.summary)
          if (res.topics?.length) {
            setConversationContext(prev => ({ ...prev, topics: [...new Set([...prev.topics, ...res.topics])] }))
          }
          // 履歴は直近8件（概ね直近4会話分）だけ残す
          setConversationHistory(h => h.slice(-8))
          setIsSummarizing(false)
        })()
      }
    } catch (error) {
      const errorMessageObj = { text: '申し訳ございません。エラーが発生しました。', sender: 'ai', timestamp: new Date() }
      setAiEphemeral({ active: false, stage: null })
      setMessages(prev => [...prev, errorMessageObj])
      setConversationHistory(prev => [...prev, errorMessageObj])
    } finally {
      setIsLoading(false)
    }
  }

  function resetConversation() {
    setMessages([])
    setConversationHistory([])
    setConversationContext({ userName: null, topics: [] })
  }

  function handleSendMessage(e) {
    e.preventDefault()
    const value = (input || '').trim()
    if (!value) return
    sendMessage(value)
  }

  return {
    // state
    messages,
    input,
    isLoading,
    aiAvailable,
    speechDraft,
    conversationContext,
    conversationHistory,
    expandedMessages,
    modelStatus,
    aiEphemeral,
    conversationSummary,
    isSummarizing,
    // actions
    setInput,
    setSpeechDraft,
    toggleMessageExpansion,
    checkAIAvailability,
    beginModelDownload,
    sendMessage,
    resetConversation,
    handleSendMessage,
    setMessages,
  }
}
