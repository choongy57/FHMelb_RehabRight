import { JointAngles } from './angles'
import { PoseLandmark } from './mediapipe'

export interface ExerciseRule {
  name: string
  description: string
  thresholds: {
    min: number
    max: number
    optimal: number
  }
  weight: number
}

export interface ExerciseFeedback {
  message: string
  type: 'info' | 'warning' | 'error'
  priority: number
  timestamp: Date
}

export interface ExerciseScore {
  overall: number
  breakdown: Record<string, number>
  flags: string[]
}

export class ExerciseRules {
  private static squatRules: Record<string, ExerciseRule> = {
    trunkAngle: {
      name: 'Trunk Upright',
      description: 'Keep your chest up and back straight',
      thresholds: { min: 0, max: 25, optimal: 10 }, // More lenient for side view
      weight: 0.3
    },
    hipAngle: {
      name: 'Hip Depth',
      description: 'Go deep enough to break parallel',
      thresholds: { min: 50, max: 130, optimal: 90 }, // Adjusted for actual detected values
      weight: 0.4
    },
    kneeAngle: {
      name: 'Knee Position',
      description: 'Keep knees in line with toes',
      thresholds: { min: 60, max: 150, optimal: 110 }, // Adjusted for actual detected values
      weight: 0.3
    }
  }

  private static pullupRules: Record<string, ExerciseRule> = {
    shoulderAngle: {
      name: 'Shoulder Position',
      description: 'Keep shoulders engaged and stable',
      thresholds: { min: 0, max: 30, optimal: 15 },
      weight: 0.4
    },
    elbowAngle: {
      name: 'Elbow Flexion',
      description: 'Pull with your back, not just arms',
      thresholds: { min: 60, max: 120, optimal: 90 },
      weight: 0.3
    },
    chinOverBar: {
      name: 'Chin Over Bar',
      description: 'Pull your chin above the bar',
      thresholds: { min: 0, max: 5, optimal: 2 },
      weight: 0.3
    }
  }

  static evaluateSquat(angles: JointAngles, landmarks: PoseLandmark[]): { score: ExerciseScore; feedback: ExerciseFeedback[] } {
    const feedback: ExerciseFeedback[] = []
    const breakdown: Record<string, number> = {}
    let totalScore = 0
    const flags: string[] = []

    // Evaluate trunk angle
    const trunkScore = this.evaluateAngle(angles.trunkAngle, this.squatRules.trunkAngle)
    breakdown.trunkAngle = trunkScore
    totalScore += trunkScore * this.squatRules.trunkAngle.weight

    if (trunkScore < 0.7) {
      feedback.push({
        message: 'Keep chest up',
        type: 'warning',
        priority: 2,
        timestamp: new Date()
      })
    }

    // Evaluate hip depth
    const hipScore = this.evaluateAngle(angles.hipAngle, this.squatRules.hipAngle)
    breakdown.hipAngle = hipScore
    totalScore += hipScore * this.squatRules.hipAngle.weight

    if (hipScore < 0.6) {
      feedback.push({
        message: 'Go deeper',
        type: 'warning',
        priority: 1,
        timestamp: new Date()
      })
    } else if (hipScore > 0.9) {
      feedback.push({
        message: 'Good depth!',
        type: 'info',
        priority: 3,
        timestamp: new Date()
      })
    }

    // Evaluate knee angle
    const kneeScore = this.evaluateAngle(angles.kneeAngle, this.squatRules.kneeAngle)
    breakdown.kneeAngle = kneeScore
    totalScore += kneeScore * this.squatRules.kneeAngle.weight

    if (kneeScore < 0.7) {
      feedback.push({
        message: 'Push knees out',
        type: 'warning',
        priority: 2,
        timestamp: new Date()
      })
    }

    // Check for valgus (knees caving in)
    const valgusFlag = this.checkKneeValgus(landmarks)
    if (valgusFlag) {
      flags.push('Knee valgus detected')
      feedback.push({
        message: 'Keep knees in line with toes',
        type: 'error',
        priority: 1,
        timestamp: new Date()
      })
    }

    return {
      score: {
        overall: Math.round(totalScore * 100),
        breakdown,
        flags
      },
      feedback
    }
  }

  static evaluatePullup(angles: JointAngles, landmarks: PoseLandmark[]): { score: ExerciseScore; feedback: ExerciseFeedback[] } {
    const feedback: ExerciseFeedback[] = []
    const breakdown: Record<string, number> = {}
    let totalScore = 0
    const flags: string[] = []

    // Evaluate shoulder position
    const shoulderScore = this.evaluateAngle(angles.shoulderAngle, this.pullupRules.shoulderAngle)
    breakdown.shoulderAngle = shoulderScore
    totalScore += shoulderScore * this.pullupRules.shoulderAngle.weight

    if (shoulderScore < 0.7) {
      feedback.push({
        message: 'Keep shoulders engaged',
        type: 'warning',
        priority: 2,
        timestamp: new Date()
      })
    }

    // Evaluate elbow flexion
    const elbowScore = this.evaluateAngle(angles.elbowAngle, this.pullupRules.elbowAngle)
    breakdown.elbowAngle = elbowScore
    totalScore += elbowScore * this.pullupRules.elbowAngle.weight

    if (elbowScore < 0.7) {
      feedback.push({
        message: 'Pull with your back',
        type: 'warning',
        priority: 2,
        timestamp: new Date()
      })
    }

    // Check chin over bar
    const chinScore = this.checkChinOverBar(landmarks)
    breakdown.chinOverBar = chinScore
    totalScore += chinScore * this.pullupRules.chinOverBar.weight

    if (chinScore < 0.7) {
      feedback.push({
        message: 'Pull chin over bar',
        type: 'warning',
        priority: 1,
        timestamp: new Date()
      })
    }

    // Check for swinging
    const swingFlag = this.checkSwinging(landmarks)
    if (swingFlag) {
      flags.push('Swinging detected')
      feedback.push({
        message: 'Control the movement',
        type: 'error',
        priority: 1,
        timestamp: new Date()
      })
    }

    return {
      score: {
        overall: Math.round(totalScore * 100),
        breakdown,
        flags
      },
      feedback
    }
  }

  private static evaluateAngle(angle: number, rule: ExerciseRule): number {
    const { min, max, optimal } = rule.thresholds
    
    if (angle >= min && angle <= max) {
      // Calculate how close to optimal
      const range = max - min
      const distanceFromOptimal = Math.abs(angle - optimal)
      const maxDistance = range / 2
      
      if (distanceFromOptimal <= maxDistance * 0.2) return 1.0 // Excellent
      if (distanceFromOptimal <= maxDistance * 0.4) return 0.9 // Very good
      if (distanceFromOptimal <= maxDistance * 0.6) return 0.8 // Good
      if (distanceFromOptimal <= maxDistance * 0.8) return 0.7 // Fair
      return 0.6 // Acceptable
    }
    
    // Outside range
    if (angle < min) {
      const distance = min - angle
      return Math.max(0, 0.5 - (distance / 10))
    } else {
      const distance = angle - max
      return Math.max(0, 0.5 - (distance / 10))
    }
  }

  private static checkKneeValgus(landmarks: PoseLandmark[]): boolean {
    if (landmarks.length < 32) return false
    
    const leftKnee = landmarks[25]
    const rightKnee = landmarks[26]
    const leftAnkle = landmarks[27]
    const rightAnkle = landmarks[28]
    
    if (!this.isLandmarkVisible(leftKnee) || !this.isLandmarkVisible(rightKnee) ||
        !this.isLandmarkVisible(leftAnkle) || !this.isLandmarkVisible(rightAnkle)) {
      return false
    }
    
    // Check if knees are closer together than ankles (valgus)
    const kneeDistance = Math.abs(leftKnee.x - rightKnee.x)
    const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x)
    
    return kneeDistance < ankleDistance * 0.8
  }

  private static checkChinOverBar(landmarks: PoseLandmark[]): number {
    if (landmarks.length < 16) return 0
    
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]
    const nose = landmarks[0]
    
    if (!this.isLandmarkVisible(leftShoulder) || !this.isLandmarkVisible(rightShoulder) || !this.isLandmarkVisible(nose)) {
      return 0
    }
    
    const shoulderCenter = (leftShoulder.y + rightShoulder.y) / 2
    
    // Nose should be above shoulder level for chin over bar
    if (nose.y < shoulderCenter) {
      return 1.0
    } else if (nose.y < shoulderCenter + 0.1) {
      return 0.7
    } else {
      return 0.3
    }
  }

  private static checkSwinging(landmarks: PoseLandmark[]): boolean {
    if (landmarks.length < 32) return false
    
    const leftHip = landmarks[23]
    const rightHip = landmarks[24]
    
    if (!this.isLandmarkVisible(leftHip) || !this.isLandmarkVisible(rightHip)) {
      return false
    }
    
    // Simple check for excessive horizontal movement
    const hipCenter = (leftHip.x + rightHip.x) / 2
    
    // This is a simplified check - in a real implementation you'd track movement over time
    return Math.abs(hipCenter - 0.5) > 0.3
  }

  private static isLandmarkVisible(landmark: PoseLandmark): boolean {
    return landmark.visibility !== undefined && landmark.visibility > 0.5
  }

  static getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e' // Green
    if (score >= 60) return '#f59e0b' // Amber
    return '#ef4444' // Red
  }
}
