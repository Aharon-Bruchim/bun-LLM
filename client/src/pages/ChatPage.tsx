import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function ChatPage() {
  const { user, logout, updateUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantMessageId = (Date.now() + 1).toString()

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: 'assistant', content: '' },
      ])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'content' && data.content) {
                assistantContent += data.content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
              } else if (data.type === 'tool_result') {
                if (data.result?.success && data.result?.data) {
                  const updatedData = data.result.data
                  if (updatedData.name || updatedData.email) {
                    updateUser({
                      name: updatedData.name || user.name,
                      email: updatedData.email || user.email,
                    })
                  }
                }
              }
            } catch {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'שגיאה בשליחת ההודעה. אנא נסה שוב.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="user-info">
          <h2>שלום, {user?.name}</h2>
          <p>{user?.email}</p>
        </div>
        <button onClick={logout} className="logout-btn">
          התנתק
        </button>
      </header>

      <div className="chat-instructions">
        <p>
          אתה יכול לשנות את השם או האימייל שלך דרך הצ'אט.
          <br />
          לדוגמה: "שנה את השם שלי ל-דוד" או "עדכן את האימייל שלי ל-new@email.com"
        </p>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-content typing">מקליד...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="הקלד הודעה..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          שלח
        </button>
      </form>
    </div>
  )
}

export default ChatPage
