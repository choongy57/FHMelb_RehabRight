'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, Heart, Info, TrendingUp, Clock } from 'lucide-react'

const injuries = [
  { name: 'ACL', duration: 9, unit: 'mo' },
  { name: 'Shoulder impingement', duration: 3, unit: 'mo' },
  { name: 'Ankle sprain', duration: 1.5, unit: 'mo' },
  { name: 'Rotator cuff', duration: 6, unit: 'mo' }
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [selectedInjury, setSelectedInjury] = useState(injuries[0])
  const [recoveryPercentage, setRecoveryPercentage] = useState(30)
  const [showTooltip, setShowTooltip] = useState(false)
  const router = useRouter()
  const setUser = useAppStore(state => state.setUser)

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setUser({ email: email.trim() })
      router.push('/program')
    }
  }

  const calculateRecovery = () => {
    const originalTime = selectedInjury.duration
    const timeSaved = (originalTime * recoveryPercentage) / 100
    const newTime = originalTime - timeSaved
    
    return {
      newTime: Math.round(newTime * 10) / 10,
      timeSaved: Math.round(timeSaved * 10) / 10
    }
  }

  const { newTime, timeSaved } = calculateRecovery()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo and Brand */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">RehabRight</h1>
              <p className="text-lg text-gray-600">AI-Powered Rehabilitation</p>
            </div>

            {/* Main Headline */}
            <h2 className="text-5xl font-bold text-teal-700 mb-6">
              Recover Faster. Live Better.
            </h2>
            
            {/* Description */}
            <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto">
              Instant, private form feedback on your phone. Get real-time coaching to perfect your rehabilitation exercises safely at home.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">100% Private</h3>
            <p className="text-gray-600">All processing happens on your device. No video data ever leaves your phone.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Real-time Feedback</h3>
            <p className="text-gray-600">Instant form corrections and coaching cues as you exercise.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Expert Guidance</h3>
            <p className="text-gray-600">AI-powered coaching based on physiotherapy best practices.</p>
          </motion.div>
        </div>
      </div>

      {/* Recovery Calculator Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-br from-white to-teal-50 rounded-3xl p-8 shadow-lg border border-teal-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Recovery Calculator</h2>
            <p className="text-gray-600">See how consistent feedback can accelerate your recovery</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Injury Type
                </label>
                <select
                  value={injuries.indexOf(selectedInjury)}
                  onChange={(e) => setSelectedInjury(injuries[parseInt(e.target.value)])}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {injuries.map((injury, index) => (
                    <option key={injury.name} value={index}>
                      {injury.name} ({injury.duration} {injury.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    Faster Recovery %
                    <button
                      type="button"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="ml-2 text-teal-500 hover:text-teal-600"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </label>
                </div>
                
                {showTooltip && (
                  <div className="absolute bg-white p-3 rounded-lg shadow-lg border text-sm text-gray-600 max-w-xs z-10">
                    Based on clinical studies showing consistent form feedback can improve recovery outcomes. Individual results may vary.
                  </div>
                )}
                
                <input
                  type="range"
                  min="25"
                  max="35"
                  step="1"
                  value={recoveryPercentage}
                  onChange={(e) => setRecoveryPercentage(Number(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-center">
                  <span className="text-xl font-semibold text-teal-600">{recoveryPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2 text-teal-600">
                  <TrendingUp className="w-6 h-6" />
                  <span className="text-lg font-semibold">Recovery Time</span>
                </div>
                
                <div className="text-4xl font-bold text-gray-800">
                  {newTime} {selectedInjury.unit}
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Time Saved</span>
                </div>
                
                <div className="text-2xl font-bold text-green-600">
                  {timeSaved} {selectedInjury.unit}
                </div>
                
                <div className="text-sm text-gray-600 pt-2 border-t">
                  That's ~{timeSaved} {selectedInjury.unit} less restrictions — earlier return to sport/work/life.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Call to Action */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email to get started"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
              required
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-600 to-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-teal-700 hover:to-green-600 transition-all duration-200 transform hover:scale-105"
            >
              Start Your Recovery Journey
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
