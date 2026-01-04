import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// בדיקה אם ההודעה מבקשת אישור
const isAskingConfirmation = (content: string): boolean => {
  const confirmPatterns = [
    'האם לבצע',
    'האם להמשיך',
    'האם אתה בטוח',
    'האם לאשר',
    'מה מעדיף',
    'האם ליצור',
    'האם למחוק',
    'האם לעדכן',
    'האם תרצה',
    'לבצע?',
    'לאשר?',
  ]
  return confirmPatterns.some(pattern => content.includes(pattern))
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

  // שליחת תשובה מהירה
  const sendQuickReply = (text: string) => {
    setInput(text)
    // שימוש ב-setTimeout כדי לאפשר ל-React לעדכן את ה-state לפני השליחה
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent
      sendMessageWithText(text, fakeEvent)
    }, 0)
  }

  const sendMessageWithText = async (text: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || loading || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
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

              if (data.type === 'content' && data.data) {
                assistantContent += data.data
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
              } else if (data.type === 'tool_result') {
                if (data.result?.success && data.result?.data?.user) {
                  const updatedUser = data.result.data.user
                  if (updatedUser.name || updatedUser.email) {
                    updateUser({
                      name: updatedUser.name || user.name,
                      email: updatedUser.email || user.email,
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !user) return
    sendMessageWithText(input.trim(), e)
  }

  // בדיקה אם צריך להציג כפתורי אישור
  const lastMessage = messages[messages.length - 1]
  const showConfirmButtons = !loading && lastMessage?.role === 'assistant' && isAskingConfirmation(lastMessage.content)

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

      {showConfirmButtons && (
        <div className="quick-replies">
          <button onClick={() => sendQuickReply('כן')} className="quick-reply-btn yes">
            כן ✓
          </button>
          <button onClick={() => sendQuickReply('לא')} className="quick-reply-btn no">
            לא ✗
          </button>
          <button onClick={() => sendQuickReply('משהו אחר')} className="quick-reply-btn other">
            משהו אחר
          </button>
        </div>
      )}

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
