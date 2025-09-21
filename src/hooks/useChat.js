import { useEffect, useState } from 'react'
import { checkModelStatus, startModelDownload, promptAI } from '../services/aiModel'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(null)
  const [speechDraft, setSpeechDraft] = useState('')
  const [aiEphemeral, setAiEphemeral] = useState({ active: false, stage: null })
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
      const logMessage = `会話履歴 (${conversationHistory.length}件):\n${conversationHistory.map(msg => {
        const messageText = msg.displayText || msg.text || 'メッセージなし'
        return `${msg.sender}: ${messageText}`
      }).join('\n')}`
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
      const status = await checkModelStatus('ja')
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

      // ステータス表示: 思考中（プロンプト送信開始直前）
      setAiEphemeral({ active: true, stage: 'thinking' })

      const aiResponse = await promptAI({ message: userMessage, context: conversationContext, history: conversationHistory, language: 'ja' })
      const aiMessageObj = { ...aiResponse, sender: 'ai', timestamp: new Date() }

      // topicsを会話コンテキストに反映
      if (aiResponse.topics?.length) {
        setConversationContext(prev => ({ ...prev, topics: [...new Set([...prev.topics, ...aiResponse.topics])] }))
      }

      setAiEphemeral({ active: false, stage: null })
      setMessages(prev => [...prev, aiMessageObj])
      setConversationHistory(prev => [...prev, aiMessageObj])
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
