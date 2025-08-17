import { JointAngles } from './angles'
import { PoseLandmark } from './mediapipe'

export enum RepState {
  IDLE = 'idle',
  STARTING = 'starting',
  PEAK = 'peak',
  ENDING = 'ending',
  COMPLETE = 'complete'
}

export interface RepDetection {
  state: RepState
  repCount: number
  confidence: number
  lastRepTime: number
  averageTempo: number
}

export class RepDetector {
  private currentState: RepState = RepState.IDLE
  private repCount: number = 0
  private lastRepTime: number = 0
  private repStartTime: number = 0
  private repTimes: number[] = []
  private lastAngles: JointAngles | null = null
  private stateConfidence: number = 0
  private consecutiveFrames: number = 0
  private lastUpdateTime: number = 0
  private readonly UPDATE_THROTTLE = 50 // Only update every 50ms for stability

  // Calibration properties
  private isCalibrated: boolean = false
  private standingHipAngle: number = 0
  private standingKneeAngle: number = 0
  private squatDepthHipAngle: number = 0
  private calibrationFrames: number = 0
  private readonly CALIBRATION_FRAMES_NEEDED = 25 // Increased for stability (1.25 seconds)

  // Exercise-specific thresholds - will be calibrated
  private readonly MIN_REP_DURATION = 1000 // ms - minimum time for a valid rep
  private readonly MAX_REP_DURATION = 20000 // ms - maximum time for a valid rep
  private readonly CONFIDENCE_THRESHOLD = 0.7

  constructor(private exercise: 'squat' | 'pullup') {}

  update(angles: JointAngles, landmarks: PoseLandmark[]): RepDetection {
    const now = Date.now()
    
    // Throttle updates to prevent excessive processing
    if (now - this.lastUpdateTime < this.UPDATE_THROTTLE) {
      return this.getCurrentDetection()
    }
    
    this.lastUpdateTime = now

    // First, calibrate if not done
    if (!this.isCalibrated) {
      this.calibrate(angles, now)
      return this.getCurrentDetection()
    }

    // Update state based on exercise type - ONLY ONE SYSTEM
    if (this.exercise === 'squat') {
      this.updateSquatState(angles, now)
    } else {
      this.updatePullupState(angles, landmarks, now)
    }

    // Simple fallback: if we're stuck in a state for too long, try to detect rep completion
    this.checkForStuckState(now)

    // Calculate confidence based on consecutive frames in same state
    this.updateConfidence()

    return this.getCurrentDetection()
  }

  private checkForStuckState(now: number) {
    // If we've been in a non-idle state for too long, try to complete the rep
    const timeInState = now - this.lastRepTime
    const isStuck = timeInState > 5000 && this.currentState !== RepState.IDLE && this.currentState !== RepState.COMPLETE // 5 seconds, but not if already completed
    
    if (isStuck) {
      console.log(`⚠️ State stuck for ${timeInState}ms in ${this.currentState}, forcing completion`)
      this.completeRep(now)
    }
  }

  private calibrate(angles: JointAngles, now: number) {
    // Collect calibration data
    if (this.calibrationFrames === 0) {
      console.log('🎯 Starting calibration...')
      this.repStartTime = now
    }

    this.calibrationFrames++

    // Store current angles for calibration - much more robust
    if (this.calibrationFrames <= this.CALIBRATION_FRAMES_NEEDED) {
      // First 15 frames: collect standing position data
      if (this.calibrationFrames <= 15) {
        this.standingHipAngle = (this.standingHipAngle * (this.calibrationFrames - 1) + angles.hipAngle) / this.calibrationFrames
        this.standingKneeAngle = (this.standingKneeAngle * (this.calibrationFrames - 1) + angles.kneeAngle) / this.calibrationFrames
        console.log(`📏 Calibration frame ${this.calibrationFrames}/25 - Standing angles: Hip: ${this.standingHipAngle.toFixed(1)}°, Knee: ${this.standingKneeAngle.toFixed(1)}°`)
      }
      // Last 10 frames: look for any significant movement to detect squat range
      else {
        const hipChange = Math.abs(angles.hipAngle - this.standingHipAngle)
        const kneeChange = Math.abs(angles.kneeAngle - this.standingKneeAngle)
        
        // If we see significant movement, update squat depth
        if (hipChange > 15 || kneeChange > 15) {
          this.squatDepthHipAngle = (this.squatDepthHipAngle * 0.8 + angles.hipAngle * 0.2)
          console.log(`📏 Calibration frame ${this.calibrationFrames}/25 - Movement detected: Hip: ${this.squatDepthHipAngle.toFixed(1)}°`)
        }
      }
    }

    // Complete calibration
    if (this.calibrationFrames >= this.CALIBRATION_FRAMES_NEEDED) {
      this.isCalibrated = true
      
      // Set reasonable defaults if we didn't get good squat data
      if (this.squatDepthHipAngle === 0) {
        // Use a more reasonable default based on actual standing position
        const defaultSquatDepth = Math.max(60, this.standingHipAngle - 80) // At least 60°, but not more than 80° difference
        this.squatDepthHipAngle = defaultSquatDepth
        console.log(`⚠️ No squat depth detected, using smart default: ${this.squatDepthHipAngle.toFixed(1)}°`)
      }
      
      console.log('✅ Calibration complete!')
      console.log(`📏 Standing - Hip: ${this.standingHipAngle.toFixed(1)}°, Knee: ${this.standingKneeAngle.toFixed(1)}°`)
      console.log(`📏 Squat Depth - Hip: ${this.squatDepthHipAngle.toFixed(1)}°`)
      console.log(`📏 Range: ${(this.standingHipAngle - this.squatDepthHipAngle).toFixed(1)}°`)
      
      // Set dynamic thresholds based on calibration
      this.setDynamicThresholds()
    }
  }

  private setDynamicThresholds() {
    // Calculate thresholds based on calibrated values
    const hipRange = this.standingHipAngle - this.squatDepthHipAngle
    const midPoint = this.squatDepthHipAngle + (hipRange * 0.3) // 30% from bottom
    
    console.log(`🎯 Dynamic thresholds set - Mid point: ${midPoint.toFixed(1)}°`)
  }

  private updateSquatState(angles: JointAngles, now: number) {
    if (!this.isCalibrated) return

    const hipAngle = angles.hipAngle
    const kneeAngle = angles.kneeAngle
    
    // Calculate thresholds based on actual calibrated values
    const hipRange = this.standingHipAngle - this.squatDepthHipAngle
    const standingThreshold = this.standingHipAngle - (hipRange * 0.2) // 20% from standing
    const squatThreshold = this.squatDepthHipAngle + (hipRange * 0.2) // 20% from squat depth
    const midThreshold = (standingThreshold + squatThreshold) / 2
    
    // Very lenient hysteresis for reliable detection
    const hipHysteresis = 5 // degrees
    const kneeHysteresis = 8 // degrees
    
    console.log(`🏋️ Squat angles - Hip: ${hipAngle.toFixed(1)}°, Knee: ${kneeAngle.toFixed(1)}°, State: ${this.currentState}`)
    console.log(`📏 Thresholds - Standing: ${standingThreshold.toFixed(1)}°, Mid: ${midThreshold.toFixed(1)}°, Squat: ${squatThreshold.toFixed(1)}°`)
    console.log(`📏 Range: ${hipRange.toFixed(1)}°, Hysteresis: Hip ${hipHysteresis}°, Knee ${kneeHysteresis}°`)
    
    switch (this.currentState) {
      case RepState.IDLE:
        // Start when we begin to squat down - much more lenient
        const shouldStart = hipAngle < standingThreshold || kneeAngle < this.standingKneeAngle - kneeHysteresis
        console.log(`🔄 IDLE → STARTING check: ${shouldStart}`)
        console.log(`   Hip check: ${hipAngle.toFixed(1)}° < ${standingThreshold.toFixed(1)}° = ${hipAngle < standingThreshold}`)
        console.log(`   Knee check: ${kneeAngle.toFixed(1)}° < ${(this.standingKneeAngle - kneeHysteresis).toFixed(1)}° = ${kneeAngle < this.standingKneeAngle - kneeHysteresis}`)
        
        if (shouldStart) {
          console.log('🚀 Starting squat rep - beginning descent')
          this.transitionTo(RepState.STARTING, now)
        }
        break
        
      case RepState.STARTING:
        // Transition to peak when we reach squat depth - very lenient
        const shouldPeak = hipAngle <= squatThreshold
        const shouldReturn = hipAngle > standingThreshold + hipHysteresis
        
        console.log(`🔄 STARTING → PEAK check: ${shouldPeak}`)
        console.log(`🔄 STARTING → IDLE check: ${shouldReturn}`)
        
        if (shouldPeak) {
          console.log('⬇️ Reached squat depth - transitioning to peak')
          this.transitionTo(RepState.PEAK, now)
        } else if (shouldReturn) {
          // Return to idle if we go back to standing
          console.log('↗️ Returned to standing - resetting to idle')
          this.transitionTo(RepState.IDLE, now)
        }
        break
        
      case RepState.PEAK:
        // Stay in peak while maintaining depth, then start rising - lenient
        const shouldRise = hipAngle > midThreshold
        console.log(`🔄 PEAK → ENDING check: ${shouldRise}`)
        
        if (shouldRise) {
          console.log('⬆️ Starting to rise - transitioning to ending')
          this.transitionTo(RepState.ENDING, now)
        }
        break
        
      case RepState.ENDING:
        // Complete rep when we return to standing - very lenient
        const shouldComplete = hipAngle > standingThreshold || kneeAngle > this.standingKneeAngle - kneeHysteresis
        const shouldReturnToPeak = hipAngle <= squatThreshold
        
        console.log(`🔄 ENDING → COMPLETE check: ${shouldComplete}`)
        console.log(`🔄 ENDING → PEAK check: ${shouldReturnToPeak}`)
        
        if (shouldComplete) {
          console.log('✅ Completed rep! - returned to standing')
          this.completeRep(now)
        } else if (shouldReturnToPeak) {
          // Go back to peak if we drop again
          console.log('⬇️ Dropped back down - returning to peak')
          this.transitionTo(RepState.PEAK, now)
        }
        break
        
      case RepState.COMPLETE:
        console.log('🔄 Rep complete, transitioning to idle')
        this.transitionTo(RepState.IDLE, now)
        break
    }
  }

  private updatePullupState(angles: JointAngles, landmarks: PoseLandmark[], now: number) {
    // Pull-up logic would go here
    // For now, just maintain current state
  }

  private transitionTo(newState: RepState, timestamp: number) {
    if (this.currentState === newState) return

    const timeSinceLastTransition = timestamp - this.lastRepTime
    if (timeSinceLastTransition < 200) { // Reduced from 300ms to 200ms for more responsiveness
      console.log(`⏱️ Transition blocked - too soon (${timeSinceLastTransition}ms)`)
      return
    }

    console.log(`🔄 State transition: ${this.currentState} → ${newState}`)
    
    this.currentState = newState
    this.lastRepTime = timestamp
    this.consecutiveFrames = 0
    
    // Reset confidence when changing states
    this.stateConfidence = 0
  }

  private completeRep(timestamp: number) {
    // Prevent multiple completions of the same rep
    if (this.currentState === RepState.COMPLETE) {
      console.log('🚫 Rep already completed, ignoring duplicate completion')
      return
    }
    
    const repDuration = timestamp - this.repStartTime
    
    if (repDuration >= this.MIN_REP_DURATION && repDuration <= this.MAX_REP_DURATION) {
      this.repCount++
      this.repTimes.push(repDuration)
      
      // Keep only last 10 reps for tempo calculation
      if (this.repTimes.length > 10) {
        this.repTimes.shift()
      }
      
      console.log(`✅ Rep ${this.repCount} completed in ${repDuration}ms`)
      
      // Mark as completed to prevent duplicates
      this.currentState = RepState.COMPLETE
    } else {
      console.log(`⚠️ Invalid rep duration: ${repDuration}ms (expected ${this.MIN_REP_DURATION}-${this.MAX_REP_DURATION}ms)`)
    }
    
    // Don't call transitionTo here since we're already in COMPLETE state
  }

  private updateConfidence() {
    // Confidence increases with consecutive frames in same state
    this.consecutiveFrames++
    this.stateConfidence = Math.min(1.0, this.consecutiveFrames / 15)
  }

  private getCurrentDetection(): RepDetection {
    return {
      state: this.currentState,
      repCount: this.repCount,
      confidence: this.stateConfidence,
      lastRepTime: this.lastRepTime,
      averageTempo: this.calculateAverageTempo()
    }
  }

  private calculateAverageTempo(): number {
    if (this.repTimes.length === 0) return 0
    
    const totalTime = this.repTimes.reduce((sum, time) => sum + time, 0)
    return totalTime / this.repTimes.length
  }

  reset() {
    this.currentState = RepState.IDLE
    this.repCount = 0
    this.lastRepTime = 0
    this.repStartTime = 0
    this.repTimes = []
    this.lastAngles = null
    this.stateConfidence = 0
    this.consecutiveFrames = 0
    
    // Reset calibration
    this.isCalibrated = false
    this.standingHipAngle = 0
    this.standingKneeAngle = 0
    this.squatDepthHipAngle = 0
    this.calibrationFrames = 0
    
    console.log('🔄 Rep detector reset')
  }

  getCurrentState(): RepState {
    return this.currentState
  }

  getRepCount(): number {
    return this.repCount
  }

  isRepInProgress(): boolean {
    return this.currentState === RepState.STARTING || 
           this.currentState === RepState.PEAK || 
           this.currentState === RepState.ENDING
  }

  // Debug methods
  getCalibrationStatus(): any {
    return {
      isCalibrated: this.isCalibrated,
      standingHipAngle: this.standingHipAngle,
      standingKneeAngle: this.standingKneeAngle,
      squatDepthHipAngle: this.squatDepthHipAngle,
      calibrationFrames: this.calibrationFrames
    }
  }

  forceCalibration() {
    this.isCalibrated = false
    this.calibrationFrames = 0
    console.log('🔄 Forcing recalibration...')
  }
}