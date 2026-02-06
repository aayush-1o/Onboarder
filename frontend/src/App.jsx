import { useState } from 'react'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🚀 Onboarder
          </h1>
          <p className="text-xl text-gray-300">
            Automated Developer Environment Setup Tool
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Reduce onboarding time from hours to minutes
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Welcome to the MVP - Day 1 Complete! ✅
            </h2>

            <div className="space-y-4 text-gray-200">
              <p className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Backend server running on port 5000
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Frontend running on port 3000
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                MongoDB configuration ready
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Project structure established
              </p>
            </div>

            <div className="mt-8 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Next:</strong> Day 2 will add API endpoints, database models, and GitHub integration
              </p>
            </div>
          </div>

          {/* API Health Check */}
          <div className="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Backend Health Check</h3>
            <p className="text-gray-300 text-sm mb-3">
              API Endpoint: <code className="bg-gray-900 px-2 py-1 rounded text-green-400">http://localhost:5000/api/health</code>
            </p>
            <p className="text-xs text-gray-400">
              Start backend with: <code className="bg-gray-900 px-2 py-1 rounded">npm run dev</code>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Built for rapid developer onboarding</p>
          <p className="mt-1">By aayush-1o</p>
        </footer>
      </div>
    </div>
  )
}

export default App
