'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Play, Copy, Check, Code, Download } from 'lucide-react'

interface EndpointTestingModalProps {
  endpoint: {
    id: string
    name: string
    display_name: string
    method: string
    path: string
    auth_required: boolean
  }
  onClose: () => void
}

export default function EndpointTestingModal({ endpoint, onClose }: EndpointTestingModalProps) {
  const [requestBody, setRequestBody] = useState('{\n  \n}')
  const [response, setResponse] = useState<{
    status: number
    statusText: string
    data: unknown
    responseTime: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  async function testEndpoint() {
    setLoading(true)
    setResponse(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      const startTime = Date.now()
      const res = await fetch(`${supabaseUrl}/functions/v1${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(endpoint.auth_required && session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: endpoint.method !== 'GET' ? requestBody : undefined,
      })

      const data = await res.json()
      const endTime = Date.now()

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        responseTime: endTime - startTime,
      })
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        responseTime: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  async function generateEndpointCode() {
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ endpoint_id: endpoint.id }),
      })

      const result = await res.json()

      if (result.code) {
        setGeneratedCode(result.code)
        setShowCode(true)
      } else {
        alert('Failed to generate code: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error generating code: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  function downloadCode() {
    const blob = new Blob([generatedCode], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${endpoint.name}.ts`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-8 max-w-4xl w-full border border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{endpoint.display_name}</h2>
            <p className="text-sm text-gray-400 mt-1">
              <span className="font-mono bg-gray-800 px-2 py-1 rounded">{endpoint.method}</span>
              <span className="ml-2">{endpoint.path}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {!showCode ? (
          <>
            {/* Request Body */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Request Body (JSON)
              </label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full h-32 px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded font-mono text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder='{\n  "key": "value"\n}'
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={testEndpoint}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-medium transition disabled:opacity-50 flex-1"
              >
                <Play className="w-4 h-4" />
                <span>{loading ? 'Testing...' : 'Test Endpoint'}</span>
              </button>
              <button
                onClick={generateEndpointCode}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium transition disabled:opacity-50 flex-1"
              >
                <Code className="w-4 h-4" />
                <span>{loading ? 'Generating...' : 'Generate Code'}</span>
              </button>
            </div>

            {/* Response */}
            {response && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Response</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`px-3 py-1 rounded ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-green-600'
                        : response.status >= 400
                        ? 'bg-red-600'
                        : 'bg-yellow-600'
                    }`}>
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-gray-400">{response.responseTime}ms</span>
                  </div>
                </div>

                <div className="relative">
                  <pre className="bg-[#0f0f0f] border border-gray-800 rounded p-4 overflow-x-auto text-sm font-mono">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Generated Code */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Function Code</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(generatedCode)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={downloadCode}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setShowCode(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                  >
                    Back to Test
                  </button>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-gray-800 rounded p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-300">
                  <code>{generatedCode}</code>
                </pre>
              </div>

              <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-2">Deployment Instructions</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  <li>Save the generated code to <code className="bg-gray-800 px-2 py-1 rounded text-xs">supabase/functions/{endpoint.name}/index.ts</code></li>
                  <li>Run: <code className="bg-gray-800 px-2 py-1 rounded text-xs">supabase functions deploy {endpoint.name}</code></li>
                  <li>Test your endpoint using the &quot;Test Endpoint&quot; button above</li>
                  <li>Monitor performance in the API Observability dashboard</li>
                </ol>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
