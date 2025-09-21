import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(null)
  const [conversationContext, setConversationContext] = useState({
    userName: null,
    topics: []
  })
  const [conversationHistory, setConversationHistory] = useState([])
  const [expandedMessages, setExpandedMessages] = useState(new Set())
  const messagesEndRef = useRef(null)

  // AI機能の利用可能性をチェック
  useEffect(() => {
    checkAIAvailability()
  }, [])

  // メッセージが更新されたら最新までスクロール
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleMessageExpansion = (index) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const checkAIAvailability = async () => {
    console.log('Checking AI availability...')
    console.log('LanguageModel:', typeof LanguageModel)
    
    // Chrome PromptAPIが利用可能かチェック（ユーザージェスチャーが必要なため、存在確認のみ）
    if (typeof LanguageModel !== 'undefined') {
      console.log('PromptAPI found, setting available to true')
      setAiAvailable(true)
    } else {
      console.log('PromptAPI not found, setting available to false')
      setAiAvailable(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (input.trim() && !isLoading && aiAvailable) {
      const userMessage = input.trim()
      
      // デバッグ用ログ表示
      if (userMessage === '/log') {
        const logMessage = `会話履歴 (${conversationHistory.length}件):\n${conversationHistory.map(msg => {
          // 新しいメッセージ構造と古いメッセージ構造の両方に対応
          const messageText = msg.displayText || msg.text || 'メッセージなし'
          return `${msg.sender}: ${messageText}`
        }).join('\n')}`
        setMessages(prev => [...prev, { text: logMessage, sender: 'system', timestamp: new Date() }])
        setInput('')
        // テキストボックスにフォーカスを戻す
        setTimeout(() => {
          const inputElement = document.querySelector('.message-input')
          if (inputElement) inputElement.focus()
        }, 0)
        return
      }
      
      const userMessageObj = { text: userMessage, sender: 'user', timestamp: new Date() }
      setMessages(prev => [...prev, userMessageObj])
      setConversationHistory(prev => [...prev, userMessageObj])
      
      // 会話コンテキストを更新
      updateConversationContext(userMessage)
      
      setInput('')
      setIsLoading(true)
      
      try {
        const aiResponse = await getAIResponse(userMessage)
        const aiMessageObj = { 
          ...aiResponse, 
          sender: 'ai', 
          timestamp: new Date() 
        }
        setMessages(prev => [...prev, aiMessageObj])
        setConversationHistory(prev => [...prev, aiMessageObj])
      } catch (error) {
        const errorMessageObj = { 
          text: '申し訳ございません。エラーが発生しました。', 
          sender: 'ai', 
          timestamp: new Date() 
        }
        setMessages(prev => [...prev, errorMessageObj])
        setConversationHistory(prev => [...prev, errorMessageObj])
      } finally {
        setIsLoading(false)
        // テキストボックスにフォーカスを戻す
        setTimeout(() => {
          const inputElement = document.querySelector('.message-input')
          if (inputElement) inputElement.focus()
        }, 0)
      }
    }
  }

  const getAIResponse = async (message) => {
    const userName = conversationContext.userName ? `${conversationContext.userName}さん` : 'ユーザー'
    const topics = conversationContext.topics.length > 0 ? `これまでの話題: ${conversationContext.topics.join(', ')}` : ''
    
    // 会話履歴（直近10件）
    const recentHistory = conversationHistory.slice(-10)
    const historyText = recentHistory.length > 0 
      ? `\n\nこれまでの会話履歴:\n${recentHistory.map(msg => `${msg.sender === 'user' ? userName : 'AI'}: ${msg.text}`).join('\n')}`
      : ''
    
    const prompt = `あなたはAI Talkという対話アプリケーションのAIエージェントです。${userName}と自然な日本語で会話してください。もっとも最近の発言の意図に合わせて、自然な応答をします。ユーザーが質問を望んでいない場合は共感を示すに留めたり、話題を変えたりします。

${topics ? `${topics}` : ''}${historyText}

現在の会話:
${userName}: ${message}

AIエージェントとして、上記の会話履歴を参考に、${userName}の現在のメッセージ「${message}」に対して、これまでの会話でAIエージェントの応答に対するユーザーの満足度の推測、ユーザーの状況の推測、ユーザーの性格の推測、エージェントへの要求を思考し、応答してください。情報が不足していても、大胆に推測を交えて応答する方が満足してもらえる可能性が高いです。
また、直近の話題から関連するトピックを推定してください。トピックは以下のようなカテゴリから選択してください：映画、プログラミング、人生相談、料理、音楽、スポーツ、旅行、仕事、趣味、勉強、健康、家族、友達、ペット、ゲーム、読書、アニメ、漫画、その他。
出力はJSON形式とし、{ "thinking": { "満足度の推測": "満足度の推測内容", "ユーザーの状況の推測": "ユーザーの状況の推測内容", "ユーザーの性格の推測": "ユーザーの性格の推測内容", "エージェントへの要求": "エージェントへの要求内容" }, "topics": ["トピック1", "トピック2"], "answer": "応答内容" }としてください。`
    
    try {
      console.log('Creating LanguageModel session...')
      const session = await LanguageModel.create({ language: 'ja' })
      console.log('Session created:', session)
      
      console.log('Sending prompt to session...')
      const response = await session.prompt(prompt)
      console.log('Response received:', response)
      
      // JSON形式の応答をチェックしてフォーマット
      try {
        // マークダウンのコードブロックを除去
        let cleanResponse = response.trim()
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        const jsonResponse = JSON.parse(cleanResponse)
        
        // topicsを会話コンテキストに反映
        if (jsonResponse.topics && Array.isArray(jsonResponse.topics)) {
          setConversationContext(prev => ({
            ...prev,
            topics: [...new Set([...prev.topics, ...jsonResponse.topics])]
          }))
        }
        
        return {
          displayText: jsonResponse.answer || response,
          fullResponse: JSON.stringify(jsonResponse, null, 2),
          isJson: true
        }
      } catch {
        // JSONでない場合はそのまま返す
        return {
          displayText: response || '申し訳ございません。応答を生成できませんでした。',
          fullResponse: response || '申し訳ございません。応答を生成できませんでした。',
          isJson: false
        }
      }
    } catch (error) {
      console.error('LanguageModel API error:', error)
      throw error
    }
  }

  const updateConversationContext = (message) => {
    // 名前の抽出
    if (message.includes('名前') && message.includes('です')) {
      const nameMatch = message.match(/([あ-んア-ン一-龯]{2,4})です/)
      if (nameMatch) {
        setConversationContext(prev => ({
          ...prev,
          userName: nameMatch[1]
        }))
      }
    }
  }

  const resetConversation = () => {
    setMessages([])
    setConversationHistory([])
    setConversationContext({
      userName: null,
      topics: []
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chrome Local AI Talk</h1>
        <p>Google Chromeの組み込みAIと会話しよう</p>
        <div className="header-controls">
          {aiAvailable !== null && (
            <div className="ai-status">
              {aiAvailable ? (
                <span className="status-indicator available">
                  ✅ AI機能利用可能
                </span>
              ) : (
                <span className="status-indicator unavailable">
                  ⚠️ AI機能利用不可
                </span>
              )}
            </div>
          )}
          <button 
            className="reset-button" 
            onClick={resetConversation}
            title="会話をリセット"
          >
            🔄 リセット
          </button>
        </div>
      </header>
      
      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <p>👋 こんにちは！何でも気軽に話しかけてください。</p>
              <p className="welcome-note">
                💡 AI機能が利用できない場合は、メッセージを送信できません。
              </p>
              <div className="suggested-topics">
                <p className="topics-label">💬 おすすめの話題:</p>
                <div className="topic-tags">
                  <span className="topic-tag">プログラミング</span>
                  <span className="topic-tag">料理</span>
                  <span className="topic-tag">映画</span>
                  <span className="topic-tag">音楽</span>
                  <span className="topic-tag">スポーツ</span>
                  <span className="topic-tag">旅行</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isExpanded = expandedMessages.has(index)
              
              // 後方互換性のための安全な処理
              let displayText
              let topics = []
              if (message.sender === 'ai' && message.isJson) {
                displayText = isExpanded ? message.fullResponse : message.displayText
                // JSONからtopicsを抽出
                try {
                  const jsonData = JSON.parse(message.fullResponse)
                  topics = jsonData.topics || []
                } catch {
                  topics = []
                }
              } else if (message.text) {
                displayText = message.text
              } else {
                displayText = ''
              }
              
              // displayTextが文字列でない場合の安全な処理
              const safeDisplayText = typeof displayText === 'string' ? displayText : String(displayText || '')
              
              return (
                <div key={index} className={`message ${message.sender}`}>
                  <div className="message-content">
                    <span className="message-text" dangerouslySetInnerHTML={{ __html: safeDisplayText.replace(/\n/g, '<br>') }}></span>
                    <div className="message-footer">
                      <div className="message-footer-left">
                        <small className="message-time">
                          {message.timestamp.toLocaleTimeString()}
                        </small>
                        {message.sender === 'ai' && topics.length > 0 && (
                          <div className="topic-tags">
                            {topics.map((topic, topicIndex) => (
                              <span key={topicIndex} className="topic-tag">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.sender === 'ai' && message.isJson && (
                        <button 
                          className="detail-button"
                          onClick={() => toggleMessageExpansion(index)}
                        >
                          {isExpanded ? 'hide' : 'detail'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "AIが応答を生成中..." : "メッセージを入力してください..."}
            className="message-input"
            disabled={!aiAvailable}
          />
          <button type="submit" className="send-button" disabled={isLoading || !input.trim() || !aiAvailable}>
            {isLoading ? "..." : "送信"}
          </button>
        </form>
        
        {!aiAvailable && (
          <div className="system-message">
            ⚠️ PromptAPIが利用できません。chrome://flags/ から Prompt API を有効にしてください。
          </div>
        )}
      </main>
    </div>
  )
}

export default App