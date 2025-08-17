import { PoseLandmark } from './mediapipe'

export interface JointAngles {
  trunkAngle: number
  hipAngle: number
  kneeAngle: number
  shoulderAngle: number
  elbowAngle: number
  ankleAngle: number
}

export class AngleCalculator {
  private static readonly SMOOTHING_FACTOR = 0.8 // Higher = more smoothing
  private static lastAngles: JointAngles | null = null

  static calculateAngles(landmarks: PoseLandmark[]): JointAngles {
    if (landmarks.length < 33) {
      return {
        trunkAngle: 0,
        hipAngle: 0,
        kneeAngle: 0,
        shoulderAngle: 0,
        elbowAngle: 0,
        ankleAngle: 0
      }
    }

    const rawAngles = {
      trunkAngle: this.calculateTrunkAngle(landmarks),
      hipAngle: this.calculateHipAngle(landmarks),
      kneeAngle: this.calculateKneeAngle(landmarks),
      shoulderAngle: this.calculateShoulderAngle(landmarks),
      elbowAngle: this.calculateElbowAngle(landmarks),
      ankleAngle: this.calculateAnkleAngle(landmarks)
    }

    // Apply smoothing if we have previous angles
    if (this.lastAngles) {
      const smoothedAngles = {
        trunkAngle: this.smoothAngle(rawAngles.trunkAngle, this.lastAngles.trunkAngle),
        hipAngle: this.smoothAngle(rawAngles.hipAngle, this.lastAngles.hipAngle),
        kneeAngle: this.smoothAngle(rawAngles.kneeAngle, this.lastAngles.kneeAngle),
        shoulderAngle: this.smoothAngle(rawAngles.shoulderAngle, this.lastAngles.shoulderAngle),
        elbowAngle: this.smoothAngle(rawAngles.elbowAngle, this.lastAngles.elbowAngle),
        ankleAngle: this.smoothAngle(rawAngles.ankleAngle, this.lastAngles.ankleAngle)
      }
      
      this.lastAngles = smoothedAngles
      return smoothedAngles
    } else {
      this.lastAngles = rawAngles
      return rawAngles
    }
  }

  private static smoothAngle(current: number, previous: number): number {
    return previous * this.SMOOTHING_FACTOR + current * (1 - this.SMOOTHING_FACTOR)
  }

  private static calculateTrunkAngle(landmarks: PoseLandmark[]): number {
    // For side view: angle between vertical and hip-to-shoulder line
    const leftHip = landmarks[23]
    const leftShoulder = landmarks[11]

    if (!this.isLandmarkVisible(leftHip) || !this.isLandmarkVisible(leftShoulder)) {
      return 0
    }

    // Calculate angle between vertical (0, -1) and hip-to-shoulder vector
    const hipToShoulder = {
      x: leftShoulder.x - leftHip.x,
      y: leftShoulder.y - leftHip.y
    }

    // Normalize the vector
    const magnitude = Math.sqrt(hipToShoulder.x * hipToShoulder.x + hipToShoulder.y * hipToShoulder.y)
    if (magnitude === 0) return 0

    const normalized = {
      x: hipToShoulder.x / magnitude,
      y: hipToShoulder.y / magnitude
    }

    // Calculate angle with vertical (0, -1)
    const angle = Math.acos(-normalized.y) * (180 / Math.PI)
    
    // Clamp to 0-90 degrees (trunk should never be more than 90° from vertical)
    return Math.min(90, Math.max(0, angle))
  }

  private static calculateHipAngle(landmarks: PoseLandmark[]): number {
    // For side view: angle between trunk (hip-to-shoulder) and thigh (hip-to-knee)
    const leftHip = landmarks[23]
    const leftKnee = landmarks[25]
    const leftShoulder = landmarks[11]

    if (!this.isLandmarkVisible(leftHip) || !this.isLandmarkVisible(leftKnee) || !this.isLandmarkVisible(leftShoulder)) {
      return 0
    }

    // Trunk vector: hip to shoulder
    const trunkVector = {
      x: leftShoulder.x - leftHip.x,
      y: leftShoulder.y - leftHip.y
    }

    // Thigh vector: hip to knee
    const thighVector = {
      x: leftKnee.x - leftHip.x,
      y: leftKnee.y - leftHip.y
    }

    // Calculate the acute angle between vectors
    const acuteAngle = this.calculateAngleBetweenVectors(trunkVector, thighVector)
    
    // Convert to obtuse angle (180° - acute angle) for proper squat representation
    // This makes: Standing = ~180°, Squatting = ~90° or less
    const obtuseAngle = 180 - acuteAngle
    
    return obtuseAngle
  }

  private static calculateKneeAngle(landmarks: PoseLandmark[]): number {
    // Angle between thigh (hip-to-knee) and shin (knee-to-ankle)
    const leftHip = landmarks[23]
    const leftKnee = landmarks[25]
    const leftAnkle = landmarks[27]

    if (!this.isLandmarkVisible(leftHip) || !this.isLandmarkVisible(leftKnee) || !this.isLandmarkVisible(leftAnkle)) {
      return 0
    }

    const thighVector = {
      x: leftKnee.x - leftHip.x,
      y: leftKnee.y - leftHip.y
    }

    const shinVector = {
      x: leftAnkle.x - leftKnee.x,
      y: leftAnkle.y - leftKnee.y
    }

    // Calculate the acute angle between vectors
    const acuteAngle = this.calculateAngleBetweenVectors(thighVector, shinVector)
    
    // Convert to obtuse angle (180° - acute angle) for proper squat representation
    // This makes: Standing = ~180°, Squatting = ~90° or less
    const obtuseAngle = 180 - acuteAngle
    
    return obtuseAngle
  }

  private static calculateShoulderAngle(landmarks: PoseLandmark[]): number {
    // For side view: angle between trunk (shoulder-to-hip) and upper arm (shoulder-to-elbow)
    const leftShoulder = landmarks[11]
    const leftElbow = landmarks[13]
    const leftHip = landmarks[23]

    if (!this.isLandmarkVisible(leftShoulder) || !this.isLandmarkVisible(leftElbow) || !this.isLandmarkVisible(leftHip)) {
      return 0
    }

    // Trunk vector: shoulder to hip
    const trunkVector = {
      x: leftHip.x - leftShoulder.x,
      y: leftHip.y - leftShoulder.y
    }
    
    // Upper arm vector: shoulder to elbow
    const upperArmVector = {
      x: leftElbow.x - leftShoulder.x,
      y: leftElbow.y - leftShoulder.y
    }

    // Calculate the acute angle between vectors
    const acuteAngle = this.calculateAngleBetweenVectors(trunkVector, upperArmVector)
    
    // Convert to obtuse angle (180° - acute angle) for consistency
    const obtuseAngle = 180 - acuteAngle
    
    return obtuseAngle
  }

  private static calculateElbowAngle(landmarks: PoseLandmark[]): number {
    // Angle between upper arm (shoulder-to-elbow) and forearm (elbow-to-wrist)
    const leftShoulder = landmarks[11]
    const leftElbow = landmarks[13]
    const leftWrist = landmarks[15]

    if (!this.isLandmarkVisible(leftShoulder) || !this.isLandmarkVisible(leftElbow) || !this.isLandmarkVisible(leftWrist)) {
      return 0
    }

    const upperArmVector = {
      x: leftElbow.x - leftShoulder.x,
      y: leftElbow.y - leftShoulder.y
    }

    const forearmVector = {
      x: leftWrist.x - leftElbow.x,
      y: leftWrist.y - leftElbow.y
    }

    // Calculate the acute angle between vectors
    const acuteAngle = this.calculateAngleBetweenVectors(upperArmVector, forearmVector)
    
    // Convert to obtuse angle (180° - acute angle) for consistency
    const obtuseAngle = 180 - acuteAngle
    
    return obtuseAngle
  }

  private static calculateAnkleAngle(landmarks: PoseLandmark[]): number {
    // Angle between shin (knee-to-ankle) and foot (ankle-to-foot)
    const leftKnee = landmarks[25]
    const leftAnkle = landmarks[27]
    const leftFoot = landmarks[31]

    if (!this.isLandmarkVisible(leftKnee) || !this.isLandmarkVisible(leftAnkle) || !this.isLandmarkVisible(leftFoot)) {
      return 0
    }

    const shinVector = {
      x: leftAnkle.x - leftKnee.x,
      y: leftAnkle.y - leftKnee.y
    }

    const footVector = {
      x: leftFoot.x - leftAnkle.x,
      y: leftFoot.y - leftAnkle.y
    }

    // Calculate the acute angle between vectors
    const acuteAngle = this.calculateAngleBetweenVectors(shinVector, footVector)
    
    // Convert to obtuse angle (180° - acute angle) for consistency
    const obtuseAngle = 180 - acuteAngle
    
    return obtuseAngle
  }

  private static calculateAngleBetweenVectors(v1: { x: number; y: number }, v2: { x: number; y: number }): number {
    // Calculate dot product
    const dot = v1.x * v2.x + v1.y * v2.y
    
    // Calculate magnitudes
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
    
    if (mag1 === 0 || mag2 === 0) return 0
    
    // Calculate cosine of angle
    const cosAngle = dot / (mag1 * mag2)
    
    // Clamp to valid range and convert to degrees
    const clampedCos = Math.max(-1, Math.min(1, cosAngle))
    const angle = Math.acos(clampedCos) * (180 / Math.PI)
    
    // Return angle clamped to 0-180 degrees
    return Math.max(0, Math.min(180, angle))
  }

  private static isLandmarkVisible(landmark: PoseLandmark): boolean {
    return landmark.visibility !== undefined && landmark.visibility > 0.5
  }

  static getAngleColor(angle: number, min: number, max: number): string {
    if (angle >= min && angle <= max) return '#22c55e' // Green
    if (angle >= min * 0.8 && angle <= max * 1.2) return '#f59e0b' // Amber
    return '#ef4444' // Red
  }
}
