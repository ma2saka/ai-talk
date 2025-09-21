import { useEffect, useRef } from 'react'
import './App.css'
import { useChat } from './hooks/useChat'
import { useSpeechInput } from './hooks/useSpeechInput'

function App() {
  const {
    messages,
    input,
    isLoading,
    aiAvailable,
    speechDraft,
    expandedMessages,
    modelStatus,
    aiEphemeral,
    setInput,
    setSpeechDraft,
    toggleMessageExpansion,
    beginModelDownload,
    sendMessage,
    resetConversation,
    handleSendMessage,
  } = useChat()

  const { voiceEnabled, setVoiceEnabled, isRecognizing, speechSupported } = useSpeechInput({
    onText: (text) => { setSpeechDraft(''); sendMessage(text) },
    onInterim: (text) => setSpeechDraft(text),
    enabledWhen: !!aiAvailable,
  })

  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, speechDraft])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chrome Local AI Talk</h1>
        <p>Google Chromeの組み込みAIと会話しよう</p>
        <div className="header-controls">
          {aiAvailable !== null && (
            <div className="ai-status">
              {aiAvailable ? (
                <span className="ai-status-indicator available">✅ AI機能利用可能</span>
              ) : (
                <span className="ai-status-indicator unavailable">⚠️ AI機能利用不可</span>
              )}
            </div>
          )}
          <button
            className={`voice-toggle ${voiceEnabled ? 'active' : ''}`}
            onClick={() => setVoiceEnabled(v => !v)}
            title={speechSupported ? (voiceEnabled ? '音声入力: ON' : '音声入力: OFF') : 'このブラウザは音声入力に非対応です'}
            disabled={!speechSupported || !aiAvailable}
          >
            {voiceEnabled ? '🎙️ 音声 ON' : '🎤 音声 OFF'}
            {voiceEnabled && (<span className={`mic-indicator ${isRecognizing ? 'listening' : 'idle'}`} />)}
          </button>
          <button className="reset-button" onClick={resetConversation} title="会話をリセット">🔄 リセット</button>
        </div>
      </header>

      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <p>👋 こんにちは！何でも気軽に話しかけてください。</p>
              <p className="welcome-note">💡 AI機能が利用できない場合は、メッセージを送信できません。</p>
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

              let displayText
              let topics = []
              if (message.sender === 'ai' && message.isJson) {
                displayText = isExpanded ? message.fullResponse : message.displayText
                try {
                  const jsonData = JSON.parse(message.fullResponse)
                  topics = jsonData.topics || []
                } catch {
                  topics = []
                }
              } else if (message.text) {
                displayText = message.text
              } else if (message.displayText) {
                displayText = message.displayText
              } else {
                displayText = ''
              }

              const safeDisplayText = typeof displayText === 'string' ? displayText : String(displayText || '')

              return (
                <div key={index} className={`message ${message.sender}`}>
                  <div className={`message-content ${message.ephemeral ? 'ephemeral' : ''}`}>
                    <span className="message-text" dangerouslySetInnerHTML={{ __html: safeDisplayText.replace(/\n/g, '<br>') }}></span>
                    <div className="message-footer">
                      <div className="message-footer-left">
                        <small className="message-time">
                          {message.timestamp instanceof Date ? message.timestamp.toLocaleTimeString() : new Date(message.timestamp).toLocaleTimeString()}
                        </small>
                        {message.sender === 'ai' && topics.length > 0 && (
                          <div className="topic-tags">
                            {topics.map((topic, topicIndex) => (
                              <span key={topicIndex} className="topic-tag">{topic}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.sender === 'ai' && message.isJson && (
                        <button className="detail-button" onClick={() => toggleMessageExpansion(index)}>
                          {isExpanded ? 'hide' : 'detail'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {aiEphemeral.active && (
            <div className="message ai">
              <div className="message-content ephemeral status-bubble">
                <div className="status-steps">
                  <div className={`step ${aiEphemeral.stage === 'received' || aiEphemeral.stage === 'sent' || aiEphemeral.stage === 'thinking' ? 'active' : ''}`}>
                    <span className="icon">📥</span>
                    <span className="label">メッセージ受信</span>
                  </div>
                  <div className={`step ${aiEphemeral.stage === 'sent' || aiEphemeral.stage === 'thinking' ? 'active' : ''}`}>
                    <span className="icon">📤</span>
                    <span className="label">AIへ送信</span>
                  </div>
                  <div className={`step ${aiEphemeral.stage === 'thinking' ? 'active' : ''}`}>
                    <span className="icon">🧠</span>
                    <span className="label">思考</span>
                    {aiEphemeral.stage === 'thinking' && <span className="typing"><i></i><i></i><i></i></span>}
                  </div>
                </div>
              </div>
            </div>
          )}
          {speechDraft && (
            <div className="message user">
              <div className="message-content">
                <span className="message-text draft">{speechDraft}</span>
                <div className="message-footer">
                  <div className="message-footer-left">
                    <small className="message-time">音声入力中...</small>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? 'AIが応答を生成中...' : 'メッセージを入力してください...'}
            className="message-input"
            disabled={!aiAvailable}
          />
          <button type="submit" className="send-button" disabled={isLoading || !input.trim() || !aiAvailable}>
            {isLoading ? '...' : '送信'}
          </button>
        </form>

        {(modelStatus.status === 'downloading' || modelStatus.status === 'downloadable' || modelStatus.status === 'error' || modelStatus.status === 'not-available') && (
          <div className="model-status">
            <div className={`model-status-indicator ${modelStatus.status}`}></div>
            <span className="status-text">
              {modelStatus.status === 'downloading' && modelStatus.progress
                ? `${modelStatus.message} (${Math.round(modelStatus.progress * 100)}%完了)`
                : modelStatus.message}
            </span>
            {modelStatus.status === 'downloadable' && (
              <button className="download-button" onClick={beginModelDownload}>ダウンロード開始</button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
