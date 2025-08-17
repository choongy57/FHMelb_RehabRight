# RehabRight - AI-Powered Physiotherapy Exercise Feedback

**Recover Faster. Live Better.**
Instant, private form feedback on your phone with AI-powered physiotherapy guidance.

## 🚀 Features

- **Real-time Pose Estimation**: MediaPipe-powered body tracking
- **Live Form Feedback**: Instant coaching cues during exercises
- **Rep Counting**: Automatic repetition detection and counting
- **Form Scoring**: Real-time assessment of exercise quality
- **Voice Cues**: Audio feedback for hands-free training
- **Privacy First**: All processing happens on-device; no video ever leaves your device
- **AI Summary**: Optional AI-powered coaching insights (when enabled)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + shadcn/ui + lucide-react
- **State Management**: Zustand with persistence
- **Pose Estimation**: MediaPipe BlazePose (browser)
- **AI Integration**: OpenAI GPT-4o-mini / Google Gemini 1.5 Flash
- **Deployment**: Docker + Vercel/Netlify ready

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern browser with camera access

### Installation

1. **Clone and install dependencies**
```bash
git clone <your-repo>
cd rehabright
npm install
```

2. **Set up environment variables**
```bash
cp env.template .env.local
```

Edit `.env.local` with your API keys:
```env
# AI Provider (choose one)
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here

# Feature flags
ENABLE_AI=1
ENABLE_VOICE=1
ENABLE_PRIVACY_MODE=1
```

3. **Run development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
rehabright/
├── app/                    # Next.js App Router
│   ├── page.tsx          # Landing page
│   ├── program/          # Exercise program grid
│   ├── record/           # Exercise recording page
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout
├── lib/                   # Core libraries
│   ├── pose/             # Pose estimation
│   │   ├── mediapipe.ts  # MediaPipe integration
│   │   ├── angles.ts     # Joint angle calculations
│   │   ├── rules.ts      # Exercise form rules
│   │   └── rep.ts        # Repetition detection
│   ├── store.ts          # Zustand state management
│   └── utils.ts          # Utility functions
├── components/            # Reusable UI components
├── styles/                # Global styles
└── public/                # Static assets
```

## 🎯 Core Features

### Pose Estimation Pipeline
- **MediaPipe Integration**: Lazy-loaded on `/record` page
- **Real-time Processing**: 60fps pose detection with smoothing
- **Joint Angle Calculation**: Vector math for accurate measurements
- **Skeleton Overlay**: Real-time visual feedback

### Exercise Rules Engine
- **Squat Analysis**: Trunk angle, depth, knee valgus, tempo
- **Pull-up Analysis**: Shoulder/elbow flexion, chin-over-bar, swing control
- **Traffic Light Scoring**: Green/amber/red based on thresholds
- **Instant Feedback**: Real-time coaching cues

### Rep Detection
- **State Machine**: Start → Peak → End transitions
- **Tempo Tracking**: Rep duration and cadence analysis
- **Accuracy Improvements**: Hysteresis and throttling for stability

### Voice Feedback
- **Debounced Cues**: 800ms delay to prevent spam
- **Smart Messaging**: Only speaks changed feedback
- **Toggle Control**: ON by default, user-configurable

### Privacy & AI
- **Privacy Mode**: Disables all network calls
- **AI Summary**: 3 concise coaching tips (<80 words)
- **Numeric Only**: No raw video/image data sent
- **Provider Selection**: OpenAI or Gemini via environment

## 🎨 UI/UX Design

### Design System
- **Light Theme**: Clean whites and soft greys
- **Accent Colors**: Teal and green for CTAs and highlights
- **Typography**: Inter font family, large readable text
- **Spacing**: Generous whitespace for breathing room

### Components
- **Cards**: Rounded corners with subtle shadows
- **Buttons**: Gradient backgrounds with hover effects
- **Forms**: Clean inputs with focus states
- **Animations**: Smooth transitions and micro-interactions

### Responsive Design
- **Mobile First**: Optimized for phone screens
- **Touch Friendly**: Large touch targets and gestures
- **Adaptive Layout**: Grid systems that work on all devices

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o-mini | - |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `ENABLE_AI` | Enable AI summary feature | 1 |
| `ENABLE_VOICE` | Enable voice feedback | 1 |
| `ENABLE_PRIVACY_MODE` | Enable privacy mode toggle | 1 |

### AI Provider Selection
The app automatically selects the AI provider based on available API keys:
1. If `OPENAI_API_KEY` is set → Uses GPT-4o-mini
2. If `GEMINI_API_KEY` is set → Uses Gemini 1.5 Flash
3. If neither is set → Falls back to template responses

## 🚀 Deployment

### Docker Deployment

1. **Build the image**
```bash
docker build -t rehabright .
```

2. **Run the container**
```bash
docker run -p 3000:3000 rehabright
```

### Production Build

1. **Multi-stage production build**
```bash
docker build --target runner -t rehabright:prod .
```

2. **Run production container**
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e OPENAI_API_KEY=your_key \
  rehabright:prod
```

### Vercel/Netlify
The app is ready for serverless deployment:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node Version**: 18.x

## 🧪 Testing

### Manual Testing Checklist
- [ ] Landing page loads with hero and calculator
- [ ] Email input saves to localStorage and routes to program
- [ ] Program grid shows enabled/disabled exercises
- [ ] Record page camera access and pose detection
- [ ] Skeleton overlay appears and moves with user
- [ ] Rep counter increments correctly
- [ ] Form scoring updates in real-time
- [ ] Voice feedback works (if enabled)
- [ ] Privacy mode disables AI summary
- [ ] AI summary generates coaching tips

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🔒 Privacy & Security

### Data Handling
- **No Video Storage**: Raw video never leaves the device
- **Local Processing**: All pose analysis happens in-browser
- **Optional AI**: AI summary only when explicitly enabled
- **No Tracking**: No analytics or user behavior tracking

### Camera Access
- **Permission Required**: User must grant camera access
- **Local Only**: Stream never leaves the device
- **Secure Context**: Requires HTTPS in production

## 📱 Mobile Considerations

### iOS Safari
- **Camera Permission**: Requested on Start button click
- **Performance**: Optimized for mobile processing
- **Touch Interface**: Large buttons and touch-friendly controls

### Android Chrome
- **Native Performance**: Full MediaPipe support
- **Background Processing**: Continues when app is active
- **Battery Optimization**: Efficient pose detection

## 🚨 Important Notes

### Medical Disclaimer
**RehabRight is not a medical device and should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals before starting any exercise program.**

### Performance
- **Model Loading**: MediaPipe model loads on first use (~2-5 seconds)
- **Memory Usage**: ~50-100MB additional memory for pose detection
- **Battery Impact**: Continuous camera use will drain battery faster

### Limitations
- **Lighting**: Requires good lighting for accurate pose detection
- **Clothing**: Loose clothing may affect landmark detection
- **Movement**: Very fast movements may be missed
- **Camera Position**: Camera should be positioned to capture full body

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Consistent formatting
- **Components**: Functional components with hooks

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues
- **Camera not working**: Check browser permissions and HTTPS requirement
- **Pose not detected**: Ensure good lighting and full body in frame
- **AI summary fails**: Verify API keys and internet connection
- **Performance issues**: Close other tabs and ensure sufficient memory

### Getting Help
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this README and code comments
- **Community**: Join our Discord/forum for support

---

**Built with ❤️ for better rehabilitation outcomes**
