/**
 * 設定画面
 * プロバイダー切り替え、APIキー管理
 */

'use client';

import { useState } from 'react';

type LLMProviderType = 'openai' | 'anthropic' | 'ollama';

export default function SettingsPage({ params }: { params: { projectId: string } }) {
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>('openai');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
  const [humeApiKey, setHumeApiKey] = useState('');
  const [runwaymlApiKey, setRunwaymlApiKey] = useState('');
  const [youtubeClientId, setYoutubeClientId] = useState('');
  const [youtubeClientSecret, setYoutubeClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: params.projectId,
          settings: {
            llmProvider,
            openaiApiKey,
            anthropicApiKey,
            ollamaBaseUrl,
            humeApiKey,
            runwaymlApiKey,
            youtubeClientId,
            youtubeClientSecret,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {message && (
        <div
          className={`px-4 py-3 rounded mb-4 ${
            message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* LLM Provider Settings */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">LLM Provider</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="llmProvider" className="block text-sm font-medium mb-2">
                Provider
              </label>
              <select
                id="llmProvider"
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value as LLMProviderType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="openai">OpenAI (GPT-5)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
            </div>

            {llmProvider === 'openai' && (
              <div>
                <label htmlFor="openaiApiKey" className="block text-sm font-medium mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  id="openaiApiKey"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sk-..."
                />
              </div>
            )}

            {llmProvider === 'anthropic' && (
              <div>
                <label htmlFor="anthropicApiKey" className="block text-sm font-medium mb-2">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  id="anthropicApiKey"
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sk-ant-..."
                />
              </div>
            )}

            {llmProvider === 'ollama' && (
              <div>
                <label htmlFor="ollamaBaseUrl" className="block text-sm font-medium mb-2">
                  Ollama Base URL
                </label>
                <input
                  type="text"
                  id="ollamaBaseUrl"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
          </div>
        </section>

        {/* Media Provider Settings */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Media Providers</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="humeApiKey" className="block text-sm font-medium mb-2">
                Hume API Key (TTS)
              </label>
              <input
                type="password"
                id="humeApiKey"
                value={humeApiKey}
                onChange={(e) => setHumeApiKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hume API Key"
              />
            </div>

            <div>
              <label htmlFor="runwaymlApiKey" className="block text-sm font-medium mb-2">
                RunwayML API Key (Video)
              </label>
              <input
                type="password"
                id="runwaymlApiKey"
                value={runwaymlApiKey}
                onChange={(e) => setRunwaymlApiKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RunwayML API Key"
              />
            </div>
          </div>
        </section>

        {/* YouTube Settings */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">YouTube API</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="youtubeClientId" className="block text-sm font-medium mb-2">
                YouTube Client ID
              </label>
              <input
                type="text"
                id="youtubeClientId"
                value={youtubeClientId}
                onChange={(e) => setYoutubeClientId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="YouTube OAuth Client ID"
              />
            </div>

            <div>
              <label htmlFor="youtubeClientSecret" className="block text-sm font-medium mb-2">
                YouTube Client Secret
              </label>
              <input
                type="password"
                id="youtubeClientSecret"
                value={youtubeClientSecret}
                onChange={(e) => setYoutubeClientSecret(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="YouTube OAuth Client Secret"
              />
            </div>
          </div>
        </section>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

