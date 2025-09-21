import { useState } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: 'user', timestamp: new Date() }])
      setInput('')
      
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: `AI response to: "${input}"`, 
          sender: 'ai', 
          timestamp: new Date() 
        }])
      }, 1000)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 AI Talk</h1>
        <p>AIとの対話を楽しもう</p>
      </header>
      
      <main className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <p>👋 こんにちは！何でも気軽に話しかけてください。</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                <div className="message-content">
                  <span className="message-text">{message.text}</span>
                  <small className="message-time">
                    {message.timestamp.toLocaleTimeString()}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
        
        <form className="input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力してください..."
            className="message-input"
          />
          <button type="submit" className="send-button">
            送信
          </button>
        </form>
      </main>
    </div>
  )
}

export default App