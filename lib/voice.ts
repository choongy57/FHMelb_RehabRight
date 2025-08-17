export class VoiceFeedback {
  private speechSynthesis: SpeechSynthesis
  private currentMessage: string = ''
  private lastSpokenTime: number = 0
  private debounceTimeout: NodeJS.Timeout | null = null
  private readonly DEBOUNCE_DELAY = 800 // ms
  private readonly MIN_INTERVAL = 2000 // ms between same message

  constructor() {
    this.speechSynthesis = window.speechSynthesis
    this.initializeVoice()
  }

  private initializeVoice() {
    // Set default voice to a natural-sounding one if available
    if (this.speechSynthesis.getVoices().length > 0) {
      const voices = this.speechSynthesis.getVoices()
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && voice.name.includes('Google')
      ) || voices.find(voice => 
        voice.lang.includes('en')
      ) || voices[0]
      
      if (preferredVoice) {
        this.speechSynthesis.defaultVoice = preferredVoice
      }
    }
  }

  speak(message: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.speechSynthesis || !message.trim()) return

    const now = Date.now()
    
    // Don't repeat the same message too quickly
    if (message === this.currentMessage && (now - this.lastSpokenTime) < this.MIN_INTERVAL) {
      return
    }

    // Clear existing debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    // Debounce low and medium priority messages
    if (priority === 'low' || priority === 'medium') {
      this.debounceTimeout = setTimeout(() => {
        this.executeSpeech(message)
      }, this.DEBOUNCE_DELAY)
    } else {
      // High priority messages speak immediately
      this.executeSpeech(message)
    }
  }

  private executeSpeech(message: string) {
    // Cancel any ongoing speech
    this.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(message)
    
    // Configure voice settings
    utterance.rate = 0.9 // Slightly slower for clarity
    utterance.pitch = 1.0
    utterance.volume = 0.8
    
    // Use default voice or find a good one
    if (this.speechSynthesis.defaultVoice) {
      utterance.voice = this.speechSynthesis.defaultVoice
    }

    // Update state
    this.currentMessage = message
    this.lastSpokenTime = Date.now()

    // Speak the message
    this.speechSynthesis.speak(utterance)
  }

  stop() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel()
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
      this.debounceTimeout = null
    }
  }

  isSpeaking(): boolean {
    return this.speechSynthesis.speaking
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.speechSynthesis.getVoices()
  }

  setVoice(voice: SpeechSynthesisVoice) {
    this.speechSynthesis.defaultVoice = voice
  }

  // Exercise-specific voice cues
  speakSquatCue(cue: string) {
    const message = `Squat: ${cue}`
    this.speak(message, 'medium')
  }

  speakPullupCue(cue: string) {
    const message = `Pull-up: ${cue}`
    this.speak(message, 'medium')
  }

  speakRepCount(count: number) {
    const message = `Rep ${count}`
    this.speak(message, 'low')
  }

  speakScore(score: number) {
    let message = ''
    if (score >= 80) {
      message = 'Excellent form!'
    } else if (score >= 60) {
      message = 'Good form, keep it up!'
    } else {
      message = 'Focus on your form'
    }
    this.speak(message, 'high')
  }

  speakFlag(flag: string) {
    const message = `Warning: ${flag}`
    this.speak(message, 'high')
  }
}
