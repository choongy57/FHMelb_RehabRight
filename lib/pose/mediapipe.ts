import { Pose } from '@mediapipe/pose'
import { Camera } from '@mediapipe/camera_utils'

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseResult {
  poseLandmarks: PoseLandmark[]
  poseWorldLandmarks: PoseLandmark[]
}

export class MediaPipePose {
  private pose: Pose | null = null
  private camera: Camera | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private video: HTMLVideoElement
  private onResults: (results: PoseResult) => void
  private isRunning = false

  constructor(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    onResults: (results: PoseResult) => void
  ) {
    this.video = video
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.onResults = onResults
  }

  private async initializePose() {
    if (this.pose) return

    try {
      console.log('Initializing MediaPipe Pose...')
      
      // Create new Pose instance
      this.pose = new Pose({
        locateFile: (file) => {
          // Use CDN for MediaPipe files
          const url = `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          console.log('Loading MediaPipe file:', url)
          return url
        }
      })

      // Configure pose detection options for better full-body detection
      this.pose.setOptions({
        modelComplexity: 1, // Use higher complexity for better accuracy
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.3, // Lower threshold to catch more poses
        minTrackingConfidence: 0.3
      })

      // Set up results handler
      this.pose.onResults(this.handleResults.bind(this))
      
      console.log('MediaPipe Pose initialized successfully')
    } catch (error) {
      console.error('Failed to initialize MediaPipe Pose:', error)
      throw new Error('MediaPipe Pose initialization failed')
    }
  }

  private handleResults(results: any) {
    if (!this.isRunning || !this.pose) return

    const poseLandmarks = results.poseLandmarks || []
    const poseWorldLandmarks = results.poseWorldLandmarks || []

    console.log('MediaPipe raw results:', results)
    console.log('Pose landmarks count:', poseLandmarks.length)

    if (poseLandmarks.length > 0) {
      // Convert MediaPipe landmarks to our format
      const convertedLandmarks = poseLandmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility
      }))

      // Check if we have enough body landmarks (not just face)
      const hasBodyLandmarks = convertedLandmarks.some((landmark: PoseLandmark, index: number) => 
        index >= 11 && (landmark.visibility ?? 0) > 0.5 // Shoulders and below
      )

      if (hasBodyLandmarks) {
        console.log('✅ Full body pose detected with', convertedLandmarks.length, 'landmarks')
        this.onResults({
          poseLandmarks: convertedLandmarks,
          poseWorldLandmarks: convertedLandmarks
        })
      } else {
        console.log('⚠️ Only face landmarks detected, waiting for full body pose...')
      }
    } else {
      console.log('❌ No pose landmarks detected')
    }
  }

  async start() {
    try {
      await this.initializePose()
      
      console.log('Starting camera and pose detection...')
      
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })

      this.video.srcObject = stream
      this.video.play()

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = resolve
      })

      this.isRunning = true

      // Start pose detection using MediaPipe Camera
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          if (this.isRunning && this.video.readyState === 4) {
            try {
              await this.pose!.send({ image: this.video })
            } catch (error) {
              console.error('Error sending frame to MediaPipe:', error)
            }
          }
        },
        width: 640,
        height: 480
      })

      await this.camera.start()
      console.log('Real MediaPipe pose detection started successfully')
      
    } catch (error) {
      console.error('Failed to start camera:', error)
      throw error
    }
  }

  stop() {
    this.isRunning = false
    
    if (this.camera) {
      this.camera.stop()
      this.camera = null
    }
    
    if (this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      this.video.srcObject = null
    }
  }

  drawSkeleton(landmarks: PoseLandmark[], visible = true) {
    if (!this.ctx || !landmarks || landmarks.length === 0) return

    // Clear canvas first
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Only draw if skeleton is enabled
    if (!visible) return
    
    try {
      console.log('🎨 Drawing skeleton with', landmarks.length, 'landmarks')
      
      // Draw connections first
      this.drawConnections(landmarks)
      
      // Draw landmarks
      landmarks.forEach((landmark, index) => {
        if (landmark.visibility && landmark.visibility > 0.5) {
          this.ctx.beginPath()
          this.ctx.arc(
            landmark.x * this.canvas.width, 
            landmark.y * this.canvas.height, 
            4, 0, 2 * Math.PI
          )
          this.ctx.fillStyle = '#ffffff' // White skeleton
          this.ctx.fill()
          this.ctx.strokeStyle = '#000000' // Black outline for contrast
          this.ctx.lineWidth = 1
          this.ctx.stroke()
        }
      })
    } catch (error) {
      console.error('Error drawing skeleton:', error)
    }
  }

  private drawConnections(landmarks: PoseLandmark[]) {
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Shoulders and arms
      [11, 23], [12, 24], [23, 24], // Torso
      [23, 25], [25, 27], [27, 29], [29, 31], // Left leg
      [24, 26], [26, 28], [28, 30], [30, 32], // Right leg
      [23, 24], [11, 12], [11, 23], [12, 24] // Core connections
    ]

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end] && 
          landmarks[start].visibility && landmarks[start].visibility > 0.5 &&
          landmarks[end].visibility && landmarks[end].visibility > 0.5) {
        
        this.drawManualConnection(landmarks[start], landmarks[end])
      }
    })
  }

  private drawManualConnection(start: PoseLandmark, end: PoseLandmark) {
    this.ctx.beginPath()
    this.ctx.moveTo(
      start.x * this.canvas.width, 
      start.y * this.canvas.height
    )
    this.ctx.lineTo(
      end.x * this.canvas.width, 
      end.y * this.canvas.height
    )
    this.ctx.strokeStyle = '#ffffff' // White connections
    this.ctx.lineWidth = 3
    this.ctx.stroke()
  }

  isActive() {
    return this.isRunning
  }
}
