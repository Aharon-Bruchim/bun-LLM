import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

interface RegisterResult {
  success: boolean
  error?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string) => Promise<boolean>
  register: (name: string, email: string) => Promise<RegisterResult>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const login = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/trpc/user.getByQuery?input=${encodeURIComponent(JSON.stringify({ email }))}`
      )

      const data = await response.json()

      if (data.result?.data?.length > 0) {
        const userData = data.result.data[0]
        const userObj: User = {
          id: userData._id,
          name: userData.name,
          email: userData.email,
          isAdmin: userData.isAdmin || false,
        }
        setUser(userObj)
        localStorage.setItem('user', JSON.stringify(userObj))
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const register = async (name: string, email: string): Promise<RegisterResult> => {
    try {
      const response = await fetch('/trpc/user.createOne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      const data = await response.json()

      if (data.error) {
        return { success: false, error: data.error.message || 'שגיאה ביצירת המשתמש' }
      }

      if (data.result?.data) {
        const userData = data.result.data
        const userObj: User = {
          id: userData._id,
          name: userData.name,
          email: userData.email,
          isAdmin: userData.isAdmin || false,
        }
        setUser(userObj)
        localStorage.setItem('user', JSON.stringify(userObj))
        return { success: true }
      }

      return { success: false, error: 'שגיאה לא צפויה' }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: 'שגיאה בחיבור לשרת' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
