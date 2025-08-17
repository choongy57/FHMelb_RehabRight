'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAppStore, Feedback } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Square, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Shield, 
  ShieldOff,
  Brain,
  XCircle,
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { MediaPipePose, PoseResult } from '@/lib/pose/mediapipe'
import { AngleCalculator, JointAngles } from '@/lib/pose/angles'
import { ExerciseRules } from '@/lib/pose/rules'
import { RepDetector } from '@/lib/pose/rep'
import { VoiceFeedback } from '@/lib/voice'

export default function RecordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const exercise = searchParams.get('exercise')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Local state for real-time updates
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isPoseActive, setIsPoseActive] = useState<boolean>(false)
  const [currentAngles, setCurrentAngles] = useState<JointAngles | null>(null)
  const [currentScore, setCurrentScore] = useState<number>(0)
  const [currentFlags, setCurrentFlags] = useState<string[]>([])
  const [repCount, setRepCount] = useState<number>(0)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [aiSummary, setAiSummary] = useState<string>('')
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false)
  const [debugMode, setDebugMode] = useState<boolean>(false)

  // Get feedback from store and sync with local state
  const storeFeedback = useAppStore(state => state.currentSession?.feedback || [])
  const storeScore = useAppStore(state => state.currentSession?.lastRepScore || 0)
  
  // Sync feedback from store to local state
  useEffect(() => {
    if (storeFeedback.length > 0) {
      setFeedback(storeFeedback)
      console.log('🔄 Syncing feedback from store:', storeFeedback.length, 'messages')
    }
  }, [storeFeedback])
  
  // Sync score from store to local state - only when it changes
  useEffect(() => {
    setCurrentScore(storeScore)
    console.log('🔄 Syncing score from store:', storeScore)
  }, [storeScore])
  
  const {
    exerciseSettings,
    updateExerciseSettings,
    startSession,
    endSession,
    addFeedback: addStoreFeedback,
    incrementRep,
    updateScore,
    addFlag,
    clearFeedback
  } = useAppStore()
  
  const poseRef = useRef<MediaPipePose | null>(null)
  const repDetectorRef = useRef<RepDetector | null>(null)
  const voiceRef = useRef<VoiceFeedback | null>(null)
  const animationFrameRef = useRef<number>()

  // Sync feedback with store
  useEffect(() => {
    const storeFeedback = useAppStore.getState().currentSession?.feedback || []
    setFeedback(storeFeedback)
  }, [])

  useEffect(() => {
    if (!exercise || !['squat', 'pullup'].includes(exercise)) {
      router.push('/program')
      return
    }

    // Initialize components
    if (videoRef.current && canvasRef.current) {
      poseRef.current = new MediaPipePose(
        videoRef.current,
        canvasRef.current,
        handlePoseResults
      )
      
      repDetectorRef.current = new RepDetector(exercise as 'squat' | 'pullup')
      voiceRef.current = new VoiceFeedback()
      
      // Clear previous feedback and start new session
      // clearFeedback() - Commented out to allow feedback persistence
      if (exercise) {
        startSession(exercise)
      }
      
      // Don't clear feedback immediately - let it persist from previous session
      // clearFeedback() - Commented out to allow feedback persistence
    }

    return () => {
      if (poseRef.current) {
        poseRef.current.stop()
      }
      if (voiceRef.current) {
        voiceRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      endSession()
    }
  }, [exercise, router, startSession, endSession])

  const handlePoseResults = useCallback((results: PoseResult) => {
    console.log('🎯 Real MediaPipe pose results received:', results) // Debug log
    
    if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
      console.log('❌ No pose landmarks detected') // Debug log
      return
    }

    console.log(`✅ Detected ${results.poseLandmarks.length} pose landmarks`) // Debug log
    
    // Debug: Show which landmarks are visible
    const visibleLandmarks = results.poseLandmarks
      .map((landmark, index) => ({ index, visibility: landmark.visibility, x: landmark.x, y: landmark.y }))
      .filter(lm => (lm.visibility ?? 0) > 0.5)
    
    console.log('🔍 Visible landmarks:', visibleLandmarks)
    console.log('🔍 Landmark indices detected:', visibleLandmarks.map(lm => lm.index))

    // Calculate angles
    const angles = AngleCalculator.calculateAngles(results.poseLandmarks)
    console.log('📐 Calculated angles:', angles) // Debug log
    setCurrentAngles(angles)

    // Update rep detection FIRST
    let repCompleted = false
    if (repDetectorRef.current) {
      const repData = repDetectorRef.current.update(angles, results.poseLandmarks)
      console.log('🔄 Rep detection:', repData) // Debug log
      console.log('🔍 Current rep detector state:', repDetectorRef.current.getCurrentState())
      console.log('🔍 Rep detector internal count:', repData.repCount)
      console.log('🔍 Rep detector is in progress:', repDetectorRef.current.isRepInProgress())
      console.log('🔍 Rep detector confidence:', repData.confidence)
      
      // Check if a new rep was completed by comparing with the detector's internal count
      const detectorRepCount = repData.repCount
      const currentRepCount = repCount
      
      console.log(`🔢 Rep count comparison - Detector: ${detectorRepCount}, Local: ${currentRepCount}`)
      console.log(`🔢 Rep completion check: ${detectorRepCount > currentRepCount ? 'YES - NEW REP!' : 'NO - Same count'}`)
      
      if (detectorRepCount > currentRepCount) {
        console.log('🎉 New rep completed!')
        console.log('📊 Rep data:', repData)
        console.log('📐 Angles at rep completion:', angles)
        
        // Update local state first
        setRepCount(detectorRepCount)
        
        // Update store
        incrementRep()
        
        repCompleted = true
        
        if (exerciseSettings.voiceEnabled && voiceRef.current) {
          voiceRef.current.speakRepCount(detectorRepCount)
        }
      } else {
        console.log('🔄 No new rep completed - current state:', repDetectorRef.current.getCurrentState())
        console.log('🔄 Rep detector state details:', {
          state: repDetectorRef.current.getCurrentState(),
          inProgress: repDetectorRef.current.isRepInProgress(),
          confidence: repData.confidence
        })
      }
    } else {
      console.log('⚠️ Rep detector not initialized')
    }

    // Only evaluate exercise and add feedback when a rep is completed
    if (repCompleted) {
      console.log('📊 Evaluating exercise for completed rep...')
      
      if (exercise === 'squat') {
        const evaluation = ExerciseRules.evaluateSquat(angles, results.poseLandmarks)
        console.log('🏋️ Squat evaluation for completed rep:', evaluation) // Debug log
        console.log('📝 Feedback generated:', evaluation.feedback.length, 'messages')
        
        // Update score only when rep is completed - this will hold until next rep
        const newScore = evaluation.score.overall
        setCurrentScore(newScore)
        setCurrentFlags(evaluation.score.flags)
        
        // Add feedback for this specific rep - feedback will persist between reps
        const currentRepNumber = repCount + 1
        evaluation.feedback.forEach((fb, index) => {
          console.log(`📝 Adding feedback ${index + 1} for rep ${currentRepNumber}: "${fb.message}" (${fb.type}, priority: ${fb.priority})`)
          addStoreFeedback(fb.message, fb.type, fb.priority, currentRepNumber)
          
          // Voice feedback
          if (exerciseSettings.voiceEnabled && voiceRef.current) {
            voiceRef.current.speakSquatCue(fb.message)
          }
        })
        
        // Update score in store only when rep is completed
        updateScore(newScore)
        console.log(`✅ Rep ${repCount + 1} completed! Score: ${newScore} - This score will hold until next rep`)
        
      } else if (exercise === 'pullup') {
        const evaluation = ExerciseRules.evaluatePullup(angles, results.poseLandmarks)
        console.log('💪 Pull-up evaluation for completed rep:', evaluation) // Debug log
        console.log('📝 Feedback generated:', evaluation.feedback.length, 'messages')
        
        // Update score only when rep is completed - this will hold until next rep
        const newScore = evaluation.score.overall
        setCurrentScore(newScore)
        setCurrentFlags(evaluation.score.flags)
        
        // Add feedback for this specific rep - feedback will persist between reps
        const currentRepNumber = repCount + 1
        evaluation.feedback.forEach((fb, index) => {
          console.log(`📝 Adding feedback ${index + 1} for rep ${currentRepNumber}: "${fb.message}" (${fb.type}, priority: ${fb.priority})`)
          addStoreFeedback(fb.message, fb.type, fb.priority, currentRepNumber)
          
          // Voice feedback
          if (exerciseSettings.voiceEnabled && voiceRef.current) {
            voiceRef.current.speakPullupCue(fb.message)
          }
        })
        
        // Update score in store only when rep is completed
        updateScore(newScore)
        console.log(`✅ Rep ${repCount + 1} completed! Score: ${newScore} - This score will hold until next rep`)
      }
    } else {
      console.log(`🔄 No rep completed, skipping evaluation - Score remains: ${currentScore}`)
    }

    // Draw skeleton if enabled
    if (poseRef.current && exerciseSettings.skeletonVisible) {
      poseRef.current.drawSkeleton(results.poseLandmarks, true)
    }

    // Continue animation loop for smooth skeleton updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (poseRef.current && isPoseActive && exerciseSettings.skeletonVisible) {
        poseRef.current.drawSkeleton(results.poseLandmarks, true)
      }
    })
  }, [exercise, repCount, exerciseSettings, addStoreFeedback, incrementRep, updateScore])

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        console.log('🎬 Starting MediaPipe pose detection...') // Debug log
        
        // Clear previous feedback and start new session
        // clearFeedback() - Commented out to allow feedback persistence
        if (exercise) {
          startSession(exercise)
        }
        
        if (!poseRef.current) {
          console.log('🔧 Initializing MediaPipe pose detection...') // Debug log
          poseRef.current = new MediaPipePose(videoRef.current!, canvasRef.current!, handlePoseResults)
        }
        
        if (!repDetectorRef.current) {
          console.log('🔧 Creating new rep detector for exercise:', exercise)
          repDetectorRef.current = new RepDetector(exercise as 'squat' | 'pullup')
        } else {
          console.log('🔄 Resetting existing rep detector for new session')
          repDetectorRef.current.reset()
        }
        
        // Reset local state for new session
        setRepCount(0)
        setCurrentScore(0) // Start score at 0
        setCurrentFlags([])
        
        console.log('✅ Rep detector ready:', repDetectorRef.current.getCurrentState())
        
        await poseRef.current.start()
        setIsPoseActive(true)
        console.log('✅ Real MediaPipe pose detection started successfully') // Debug log
      } catch (error) {
        console.error('❌ Failed to start MediaPipe:', error)
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to start pose detection. '
        if (error instanceof Error) {
          if (error.message.includes('permission')) {
            errorMessage += 'Please allow camera access and try again.'
          } else if (error.message.includes('MediaPipe')) {
            errorMessage += 'MediaPipe failed to initialize. Please refresh the page.'
          } else {
            errorMessage += error.message
          }
        }
        
        alert(errorMessage)
      }
    } else {
      console.log('⏹️ Stopping MediaPipe pose detection...') // Debug log
      if (poseRef.current) {
        poseRef.current.stop()
        setIsPoseActive(false)
        console.log('✅ MediaPipe pose detection stopped') // Debug log
      }
      setIsRecording(false)
      endSession()
    }
  }

  const toggleSkeleton = () => {
    updateExerciseSettings({ skeletonVisible: !exerciseSettings.skeletonVisible })
  }

  const toggleAnglesHud = () => {
    updateExerciseSettings({ anglesHudVisible: !exerciseSettings.anglesHudVisible })
  }

  const toggleVoice = () => {
    updateExerciseSettings({ voiceEnabled: !exerciseSettings.voiceEnabled })
  }

  const togglePrivacy = () => {
    updateExerciseSettings({ privacyMode: !exerciseSettings.privacyMode })
  }

  const toggleAiSummary = () => {
    updateExerciseSettings({ aiSummaryEnabled: !exerciseSettings.aiSummaryEnabled })
  }

  const generateAiSummary = async () => {
    if (!currentAngles || exerciseSettings.privacyMode) return

    setIsGeneratingAi(true)
    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise,
          angles: currentAngles,
          flags: currentFlags,
          score: currentScore,
          repCount
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiSummary(data.summary)
      } else {
        setAiSummary('Failed to generate summary. Please try again.')
      }
    } catch (error) {
      setAiSummary('Network error. Please check your connection.')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-accent-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-accent-600" />
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    return <XCircle className="w-5 h-5 text-red-600" />
  }

  if (!exercise) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/program')}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Program</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-text capitalize">{exercise}</h1>
              <p className="text-muted">Real-time form feedback</p>
            </div>
            
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Camera Feed */}
          <div className="lg:col-span-2">
            <div className="card p-0 overflow-hidden">
              {/* Toolbar */}
              <div className="bg-gray-50 p-4 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={toggleRecording}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isRecording 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {isRecording ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isRecording ? 'Stop' : 'Start'}
                  </button>

                  <button
                    onClick={toggleSkeleton}
                    className={`p-2 rounded-lg transition-colors ${
                      exerciseSettings.skeletonVisible 
                        ? 'bg-primary-100 text-primary-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {exerciseSettings.skeletonVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={toggleAnglesHud}
                    className={`p-2 rounded-lg transition-colors ${
                      exerciseSettings.anglesHudVisible 
                        ? 'bg-accent-100 text-accent-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                  </button>

                  <button
                    onClick={toggleVoice}
                    className={`p-2 rounded-lg transition-colors ${
                      exerciseSettings.voiceEnabled 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {exerciseSettings.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={togglePrivacy}
                    className={`p-2 rounded-lg transition-colors ${
                      exerciseSettings.privacyMode 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {exerciseSettings.privacyMode ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={toggleAiSummary}
                    className={`p-2 rounded-lg transition-colors ${
                      exerciseSettings.aiSummaryEnabled 
                        ? 'bg-purple-100 text-purple-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {exerciseSettings.aiSummaryEnabled ? <Brain className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setDebugMode(!debugMode)}
                    className={`p-2 rounded-full transition-colors ${
                      debugMode 
                        ? 'bg-orange-100 text-orange-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    title="Debug Mode"
                  >
                    <Activity className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Camera Feed */}
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-96 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  width={640}
                  height={480}
                />
                
                {/* Angles HUD Overlay */}
                {exerciseSettings.anglesHudVisible && currentAngles && (
                  <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div>Trunk: {Math.round(currentAngles.trunkAngle)}°</div>
                      <div>Hip: {Math.round(currentAngles.hipAngle)}°</div>
                      <div>Knee: {Math.round(currentAngles.kneeAngle)}°</div>
                      {exercise === 'pullup' && (
                        <>
                          <div>Shoulder: {Math.round(currentAngles.shoulderAngle)}°</div>
                          <div>Elbow: {Math.round(currentAngles.elbowAngle)}°</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Debug Information */}
            {debugMode && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Info</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p><strong>Pose Active:</strong> {isPoseActive ? 'Yes' : 'No'}</p>
                    <p><strong>Recording:</strong> {isRecording ? 'Yes' : 'No'}</p>
                    <p><strong>Rep State:</strong> {repDetectorRef.current?.getCurrentState() || 'Unknown'}</p>
                    <p><strong>Rep Detector:</strong> {repDetectorRef.current ? 'Initialized' : 'Not Initialized'}</p>
                  </div>
                  <div>
                    <p><strong>Current Score:</strong> {currentScore}/100</p>
                    <p><strong>Rep Count:</strong> {repCount}</p>
                    <p><strong>Flags:</strong> {currentFlags.join(', ') || 'None'}</p>
                    <p><strong>Feedback Count:</strong> {feedback.length}</p>
                  </div>
                </div>
                {currentAngles && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs font-semibold">Raw Angles:</p>
                    <p className="text-xs">Trunk: {currentAngles.trunkAngle.toFixed(1)}° | Hip: {currentAngles.hipAngle.toFixed(1)}° | Knee: {currentAngles.kneeAngle.toFixed(1)}°</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Trunk:</span>
                        <span className={currentAngles.trunkAngle > 20 ? 'text-red-500' : currentAngles.trunkAngle > 10 ? 'text-yellow-500' : 'text-green-500'}>
                          {currentAngles.trunkAngle.toFixed(1)}°
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Hip:</span>
                        <span className={currentAngles.hipAngle < 60 ? 'text-red-500' : currentAngles.hipAngle < 90 ? 'text-yellow-500' : 'text-green-500'}>
                          {currentAngles.hipAngle.toFixed(1)}°
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Knee:</span>
                        <span className={currentAngles.kneeAngle < 70 ? 'text-red-500' : currentAngles.kneeAngle < 110 ? 'text-yellow-500' : 'text-green-500'}>
                          {currentAngles.kneeAngle.toFixed(1)}°
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {repDetectorRef.current && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs font-semibold">Rep Detection Details:</p>
                    <p className="text-xs">State: {repDetectorRef.current.getCurrentState()}</p>
                    <p className="text-xs">Rep Count: {repDetectorRef.current.getRepCount()}</p>
                    <p className="text-xs">In Progress: {repDetectorRef.current.isRepInProgress() ? 'Yes' : 'No'}</p>
                    
                    {/* Calibration Status */}
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs font-semibold">Calibration Status:</p>
                      {(() => {
                        if (!repDetectorRef.current) return null
                        const calStatus = repDetectorRef.current.getCalibrationStatus()
                        return (
                          <>
                            <p className="text-xs">Calibrated: {calStatus.isCalibrated ? '✅ Yes' : '⏳ No'}</p>
                            {calStatus.isCalibrated && (
                              <>
                                <p className="text-xs">Standing Hip: {calStatus.standingHipAngle.toFixed(1)}°</p>
                                <p className="text-xs">Standing Knee: {calStatus.standingKneeAngle.toFixed(1)}°</p>
                                <p className="text-xs">Squat Depth: {calStatus.squatDepthHipAngle.toFixed(1)}°</p>
                              </>
                            )}
                            <p className="text-xs">Frames: {calStatus.calibrationFrames}/25</p>
                            
                            {/* Real-time angle comparison */}
                            {currentAngles && calStatus.isCalibrated && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-semibold">Real-time Analysis:</p>
                                <p className="text-xs">Current Hip: {currentAngles.hipAngle.toFixed(1)}°</p>
                                <p className="text-xs">Standing Threshold: {(calStatus.standingHipAngle + 10).toFixed(1)}°</p>
                                <p className="text-xs">Squat Threshold: {(calStatus.squatDepthHipAngle - 10).toFixed(1)}°</p>
                                <p className="text-xs">Hip Status: {
                                  currentAngles.hipAngle > calStatus.standingHipAngle + 10 ? '🟢 Standing' :
                                  currentAngles.hipAngle < calStatus.squatDepthHipAngle - 10 ? '🔴 Squatting' :
                                  '🟡 Transitioning'
                                }</p>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t">
                  <button
                    onClick={() => {
                      if (repDetectorRef.current) {
                        console.log('🧪 Manual rep test - Current state:', repDetectorRef.current.getCurrentState())
                        console.log('🧪 Manual rep test - Current count:', repDetectorRef.current.getRepCount())
                      }
                    }}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    Test Rep Detector
                  </button>
                  <button
                    onClick={() => {
                      console.log('🧪 Manual rep increment test')
                      setRepCount(prev => prev + 1)
                      incrementRep()
                    }}
                    className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                  >
                    Test Rep Increment
                  </button>
                  <button
                    onClick={() => {
                      if (repDetectorRef.current) {
                        console.log('🧪 Manual rep completion test')
                        // Manually trigger rep completion for testing
                        const currentState = repDetectorRef.current.getCurrentState()
                        console.log('Current state before manual completion:', currentState)
                        
                        // Force a rep completion
                        setRepCount(prev => prev + 1)
                        incrementRep()
                        console.log('Manual rep completion triggered')
                      }
                    }}
                    className="ml-2 px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                  >
                    Force Rep Complete
                  </button>
                  <button
                    onClick={() => {
                      if (repDetectorRef.current) {
                        console.log('🔄 Force recalibration')
                        repDetectorRef.current.forceCalibration()
                      }
                    }}
                    className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                  >
                    Force Recalibration
                  </button>
                  <button
                    onClick={() => {
                      console.log('🧪 Manual rep trigger test')
                      // Test if the rep counting system works at all
                      setRepCount(prev => {
                        const newCount = prev + 1
                        console.log(`🧪 Manual rep increment: ${prev} → ${newCount}`)
                        return newCount
                      })
                      incrementRep()
                      console.log('🧪 Manual rep increment completed')
                    }}
                    className="ml-2 px-2 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600"
                  >
                    Manual Rep
                  </button>
                  <button
                    onClick={() => {
                      if (repDetectorRef.current) {
                        console.log('🧪 Test rep detector state')
                        const state = repDetectorRef.current.getCurrentState()
                        const count = repDetectorRef.current.getRepCount()
                        const inProgress = repDetectorRef.current.isRepInProgress()
                        const calStatus = repDetectorRef.current.getCalibrationStatus()
                        
                        console.log('🧪 Rep Detector Status:')
                        console.log('  State:', state)
                        console.log('  Count:', count)
                        console.log('  In Progress:', inProgress)
                        console.log('  Calibration:', calStatus)
                      }
                    }}
                    className="ml-2 px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600"
                  >
                    Test Detector
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Feedback & Stats */}
          <div className="space-y-6">
            {/* Form Score */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text mb-4">Form Score</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">
                  {currentScore || 0}
                </div>
                <p className="text-muted">out of 100</p>
                {currentScore === 0 && (
                  <p className="text-xs text-gray-500 mt-2">Complete a rep to see your score</p>
                )}
                {currentScore > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Score from last completed rep</p>
                )}
              </div>
            </div>

            {/* Rep Counter */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text mb-4">Reps</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">
                  {repCount}
                </div>
                <p className="text-muted">completed</p>
                {repDetectorRef.current?.isRepInProgress() && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-2 text-blue-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium">Rep in progress...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Flags */}
            {currentFlags.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text mb-4">Flags</h3>
                <div className="space-y-2">
                  {currentFlags.map((flag, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {exerciseSettings.aiSummaryEnabled && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text mb-4">AI Summary</h3>
                {exerciseSettings.privacyMode ? (
                  <div className="text-center text-muted">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">AI disabled (Privacy Mode)</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiSummary ? (
                      <div className="bg-gray-50 p-3 rounded-lg text-sm">
                        {aiSummary}
                      </div>
                    ) : (
                      <button
                        onClick={generateAiSummary}
                        disabled={isGeneratingAi}
                        className="w-full btn-primary text-sm py-2"
                      >
                        {isGeneratingAi ? 'Generating...' : 'Generate Summary'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Panel */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text">Live Feedback</h3>
                <p className="text-xs text-gray-500">Accumulates across reps</p>
                {feedback.length > 0 && (
                  <button
                    onClick={() => {
                      clearFeedback()
                      setFeedback([])
                      console.log('🧹 Manual feedback clear')
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                    title="Clear all feedback"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {/* Debug info */}
                {debugMode && (
                  <div className="p-2 bg-gray-50 rounded-lg text-xs text-gray-600 mb-2">
                    <p>Feedback count: {feedback.length}</p>
                    <p>Last feedback: {feedback.length > 0 ? `"${feedback[feedback.length - 1]?.message}" (Rep ${feedback[feedback.length - 1]?.repNumber})` : 'None'}</p>
                    <p>Current score: {currentScore} (updates only on rep completion)</p>
                  </div>
                )}
                
                <AnimatePresence>
                  {feedback.slice(-10).map((fb, index) => (
                    <motion.div
                      key={`${fb.repNumber}-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`p-2 rounded-lg text-sm ${
                        fb.type === 'error' ? 'bg-red-50 text-red-700' :
                        fb.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-green-50 text-green-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{fb.message}</span>
                        <span className="text-xs text-gray-500">
                          Rep {fb.repNumber}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {feedback.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <p className="text-sm">No feedback yet</p>
                    <p className="text-xs">Complete a rep to see form feedback</p>
                  </div>
                )}
                {feedback.length > 0 && (
                  <div className="text-center text-muted py-2">
                    <p className="text-xs text-gray-500">Feedback persists between reps</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
