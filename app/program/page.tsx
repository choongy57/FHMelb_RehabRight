'use client'

import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { 
  Activity, 
  Dumbbell, 
  TrendingUp, 
  Clock, 
  Target,
  ArrowRight,
  Lock
} from 'lucide-react'

const exercises = [
  {
    id: 'squat',
    name: 'Squat',
    description: 'Lower body strength and stability',
    icon: Activity,
    enabled: true,
    color: 'primary'
  },
  {
    id: 'pullup',
    name: 'Pull-up',
    description: 'Upper body strength and control',
    icon: Dumbbell,
    enabled: true,
    color: 'accent'
  },
  {
    id: 'lunge',
    name: 'Lunge',
    description: 'Single-leg stability and balance',
    icon: Target,
    enabled: false,
    color: 'gray'
  },
  {
    id: 'catcamel',
    name: 'Cat-Camel',
    description: 'Spinal mobility and flexibility',
    icon: TrendingUp,
    enabled: false,
    color: 'gray'
  },
  {
    id: 'scaption',
    name: 'Scaption',
    description: 'Shoulder stability and control',
    icon: Target,
    enabled: false,
    color: 'gray'
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    description: 'Posterior chain strength',
    icon: Activity,
    enabled: false,
    color: 'gray'
  }
]

export default function ProgramPage() {
  const router = useRouter()
  const user = useAppStore(state => state.user)

  const handleExerciseClick = (exercise: typeof exercises[0]) => {
    if (exercise.enabled) {
      router.push(`/record?exercise=${exercise.id}`)
    }
  }

  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text">Your Program</h1>
              <p className="text-muted">Choose an exercise to get started</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted">Welcome back</p>
              <p className="font-medium text-text">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((exercise, index) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() => handleExerciseClick(exercise)}
              className={`card cursor-pointer transition-all duration-200 ${
                exercise.enabled 
                  ? 'hover:scale-105 hover:shadow-lg' 
                  : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-${exercise.color}-100 flex items-center justify-center`}>
                  <exercise.icon className={`w-6 h-6 text-${exercise.color}-600`} />
                </div>
                {!exercise.enabled && (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
              </div>

              <h3 className="text-xl font-semibold text-text mb-2">
                {exercise.name}
              </h3>
              
              <p className="text-muted mb-4">
                {exercise.description}
              </p>

              {exercise.enabled ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary-600">
                    Ready to start
                  </span>
                  <ArrowRight className="w-5 h-5 text-primary-600" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Coming soon
                  </span>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16"
        >
          <div className="card bg-gradient-to-r from-primary-50 to-accent-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-text mb-4">
                Track Your Progress
              </h2>
              <p className="text-muted mb-6 max-w-2xl mx-auto">
                Start with Squats and Pull-ups to build a strong foundation. 
                More exercises will be available soon as you progress.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-text mb-1">Form Quality</h3>
                  <p className="text-sm text-muted">Real-time feedback on your technique</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-accent-600" />
                  </div>
                  <h3 className="font-semibold text-text mb-1">Progress Tracking</h3>
                  <p className="text-sm text-muted">Monitor improvements over time</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-text mb-1">Consistency</h3>
                  <p className="text-sm text-muted">Build lasting habits</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
