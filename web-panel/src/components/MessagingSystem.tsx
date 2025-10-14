'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, User, Search, Paperclip, Check, CheckCheck } from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  job_id: number | null
  subject: string
  body: string
  is_read: boolean
  read_at: string | null
  created_at: string
  sender_name?: string
  recipient_name?: string
}

interface Conversation {
  user_id: string
  user_name: string
  user_email: string
  last_message: string
  last_message_at: string
  unread_count: number
  is_admin: boolean
}

interface Driver {
  id: string
  full_name: string
  email: string
  role: string
}

export default function MessagingSystem() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user_id)
      markAsRead(selectedConversation.user_id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      await Promise.all([
        fetchConversations(user.id),
        fetchDrivers()
      ])
    }
    setLoading(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async (userId: string) => {
    try {
      // Get all messages where user is sender or recipient
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (id, full_name, email, role),
          recipient:recipient_id (id, full_name, email, role)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group by conversation partner
      const conversationsMap = new Map<string, Conversation>()

      messagesData?.forEach((msg: any) => {
        const isCurrentUserSender = msg.sender_id === userId
        const partnerId = isCurrentUserSender ? msg.recipient_id : msg.sender_id
        const partner = isCurrentUserSender ? msg.recipient : msg.sender

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            user_id: partnerId,
            user_name: partner?.full_name || 'Unknown User',
            user_email: partner?.email || '',
            last_message: msg.body,
            last_message_at: msg.created_at,
            unread_count: 0,
            is_admin: partner?.role === 'admin'
          })
        }

        // Count unread messages
        if (!msg.is_read && msg.recipient_id === userId) {
          const conv = conversationsMap.get(partnerId)!
          conv.unread_count++
        }
      })

      setConversations(Array.from(conversationsMap.values()))
    } catch (error: any) {
      console.error('Error fetching conversations:', error.message)
    }
  }

  const fetchMessages = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (full_name),
          recipient:recipient_id (full_name)
        `)
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedMessages = data?.map((msg: any) => ({
        ...msg,
        sender_name: msg.sender?.full_name,
        recipient_name: msg.recipient?.full_name
      })) || []

      setMessages(formattedMessages)
    } catch (error: any) {
      console.error('Error fetching messages:', error.message)
    }
  }

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'driver')
        .order('full_name')

      if (error) throw error
      setDrivers(data || [])
    } catch (error: any) {
      console.error('Error fetching drivers:', error.message)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: currentUserId,
          recipient_id: selectedConversation.user_id,
          body: newMessage.trim(),
          subject: '',
          is_read: false
        }])

      if (error) throw error

      setNewMessage('')
      await fetchMessages(selectedConversation.user_id)
      await fetchConversations(currentUserId)
    } catch (error: any) {
      alert('Error sending message: ' + error.message)
    }
  }

  const markAsRead = async (otherUserId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', currentUserId)
        .eq('sender_id', otherUserId)
        .eq('is_read', false)

      if (error) throw error
    } catch (error: any) {
      console.error('Error marking as read:', error.message)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0)

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex">
      {/* Conversations List */}
      <div className="w-80 bg-[#1a1a1a] border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              New
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-sm text-white"
            />
          </div>

          {totalUnread > 0 && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-gray-400">
              <MessageCircle className="w-4 h-4" />
              <span>{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No conversations</p>
              <p className="text-gray-600 text-sm mt-1">Start a new message</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.user_id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left hover:bg-[#0f0f0f] transition-colors ${
                    selectedConversation?.user_id === conv.user_id ? 'bg-[#0f0f0f]' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium truncate ${conv.unread_count > 0 ? 'text-white' : 'text-gray-300'}`}>
                          {conv.user_name}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{conv.last_message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-[#1a1a1a] border-b border-gray-800 flex items-center px-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedConversation.user_name}</h3>
                  <p className="text-sm text-gray-400">{selectedConversation.user_email}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No messages yet</p>
                    <p className="text-gray-600 text-sm mt-1">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isCurrentUser = message.sender_id === currentUserId
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-lg px-4 py-3 ${
                            isCurrentUser
                              ? 'bg-green-600 text-white'
                              : 'bg-[#1a1a1a] border border-gray-800 text-gray-100'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                        </div>
                        <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                          {isCurrentUser && (
                            message.is_read ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-[#1a1a1a] border-t border-gray-800 p-4">
              <div className="flex items-end space-x-3">
                <button
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type a message... (Shift+Enter for new line)"
                    rows={1}
                    className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white resize-none"
                    style={{ minHeight: '42px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-gray-400">Choose a conversation from the list or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <NewMessageModal
          drivers={drivers}
          currentUserId={currentUserId}
          onClose={() => setShowNewMessageModal(false)}
          onSuccess={(recipientId) => {
            setShowNewMessageModal(false)
            fetchConversations(currentUserId)
            const recipient = drivers.find(d => d.id === recipientId)
            if (recipient) {
              setSelectedConversation({
                user_id: recipient.id,
                user_name: recipient.full_name,
                user_email: recipient.email,
                last_message: '',
                last_message_at: new Date().toISOString(),
                unread_count: 0,
                is_admin: recipient.role === 'admin'
              })
            }
          }}
        />
      )}
    </div>
  )
}

// New Message Modal
function NewMessageModal({
  drivers,
  currentUserId,
  onClose,
  onSuccess
}: {
  drivers: Driver[]
  currentUserId: string
  onClose: () => void
  onSuccess: (recipientId: string) => void
}) {
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    body: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.body.trim() || !formData.recipient_id) return

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: currentUserId,
          recipient_id: formData.recipient_id,
          subject: formData.subject.trim() || '',
          body: formData.body.trim(),
          is_read: false
        }])

      if (error) throw error

      alert('Message sent successfully')
      onSuccess(formData.recipient_id)
    } catch (error: any) {
      alert('Error sending message: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 max-w-2xl w-full">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold">New Message</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">To: *</label>
            <select
              value={formData.recipient_id}
              onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              required
            >
              <option value="">Select a driver...</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} ({driver.email})
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Subject (optional)</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              placeholder="Message subject..."
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Message *</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={6}
              required
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              placeholder="Type your message here..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={submitting || !formData.body.trim() || !formData.recipient_id}
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
