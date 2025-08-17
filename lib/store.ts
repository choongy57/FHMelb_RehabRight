import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  email: string
  injury?: string
  recoveryTime?: number
  fasterRecoveryPercent?: number
}

export interface ExerciseSettings {
  skeletonVisible: boolean
  anglesHudVisible: boolean
  voiceEnabled: boolean
  privacyMode: boolean
  aiSummaryEnabled: boolean
}

export interface ExerciseSession {
  exercise: string
  startTime: Date
  endTime?: Date
  repCount: number
  averageScore: number
  lastRepScore: number // Add this to track the score of the last completed rep
  flags: string[]
  feedback: Feedback[]
}

export interface Feedback {
  repNumber: number // Link feedback to specific rep instead of timestamp
  message: string
  type: 'info' | 'warning' | 'error'
  priority: number
}

interface AppState {
  user: User | null
  exerciseSettings: ExerciseSettings
  currentSession: ExerciseSession | null
  setUser: (user: User) => void
  updateExerciseSettings: (settings: Partial<ExerciseSettings>) => void
  startSession: (exercise: string) => void
  endSession: () => void
  addFeedback: (message: string, type: 'info' | 'warning' | 'error', priority: number) => void
  incrementRep: () => void
  updateScore: (score: number) => void
  addFlag: (flag: string) => void
  clearSession: () => void
  clearFeedback: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      exerciseSettings: {
        skeletonVisible: true,
        anglesHudVisible: true,
        voiceEnabled: true,
        privacyMode: false,
        aiSummaryEnabled: false,
      },
      currentSession: null,
      
      setUser: (user: User) => set({ user }),
      
      updateExerciseSettings: (settings: Partial<ExerciseSettings>) =>
        set((state) => ({
          exerciseSettings: { ...state.exerciseSettings, ...settings }
        })),
      
      startSession: (exercise: string) => set((state) => ({
        currentSession: {
          exercise,
          startTime: new Date(),
          repCount: 0,
          averageScore: 0,
          lastRepScore: 0, // Initialize last rep score to 0
          flags: [],
          feedback: [] // Start with empty feedback for new session
        }
      })),
      
      clearFeedback: () => set((state) => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          feedback: []
        } : null
      })),
      
      endSession: () => set((state) => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          endTime: new Date()
        } : null
      })),
      
      addFeedback: (message: string, type: 'info' | 'warning' | 'error', priority: number = 1, repNumber?: number) => set((state) => {
        if (!state.currentSession) return state
        
        // Use current rep count if not provided
        const targetRepNumber = repNumber || state.currentSession.repCount
        
        // Check if this exact message was already added for this rep to prevent duplicates
        const isDuplicate = state.currentSession.feedback.some(fb => 
          fb.message === message && fb.repNumber === targetRepNumber
        )
        
        if (isDuplicate) {
          console.log(`🚫 Duplicate feedback blocked for rep ${targetRepNumber}:`, message)
          return state
        }
        
        console.log(`✅ Adding new feedback for rep ${targetRepNumber}:`, message)
        
        return {
          currentSession: {
            ...state.currentSession,
            feedback: [
              ...state.currentSession.feedback,
              { repNumber: targetRepNumber, message, type, priority }
            ]
          }
        }
      }),
      
      incrementRep: () => set((state) => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          repCount: state.currentSession.repCount + 1
        } : null
      })),
      
      updateScore: (score: number) => set((state) => {
        if (!state.currentSession) return state
        const currentScore = state.currentSession.averageScore
        const repCount = state.currentSession.repCount
        const newAverage = repCount === 0 ? score : (currentScore * repCount + score) / (repCount + 1)
        
        return {
          currentSession: {
            ...state.currentSession,
            averageScore: newAverage,
            lastRepScore: score // Store the score of the last completed rep
          }
        }
      }),
      
      addFlag: (flag: string) => set((state) => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          flags: [...Array.from(new Set([...state.currentSession.flags, flag]))]
        } : null
      })),
      
      clearSession: () => set({ currentSession: null }),
    }),
    {
      name: 'rehabright-storage',
      partialize: (state) => ({
        user: state.user,
        exerciseSettings: state.exerciseSettings,
      }),
    }
  )
)
