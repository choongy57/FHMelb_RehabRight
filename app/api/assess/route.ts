import { NextRequest, NextResponse } from 'next/server'

interface AssessmentRequest {
  exercise: string
  angles: {
    trunkAngle: number
    hipAngle: number
    kneeAngle: number
    shoulderAngle: number
    elbowAngle: number
    ankleAngle: number
  }
  flags: string[]
  score: number
  repCount: number
}

interface AssessmentResponse {
  summary: string
  tips: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: AssessmentRequest = await request.json()
    
    // Validate request - only numeric features allowed
    if (!body.exercise || !body.angles || !body.score || typeof body.repCount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request format. Only numeric features allowed.' },
        { status: 400 }
      )
    }

    // Check if AI is enabled via environment variable
    const enableAI = process.env.ENABLE_AI === '1'
    
    let summary: string
    let tips: string[]

    if (enableAI) {
      // Call external AI provider (OpenAI or Gemini)
      const aiProvider = process.env.AI_PROVIDER || 'openai'
      
      if (aiProvider === 'openai') {
        const result = await callOpenAI(body)
        summary = result.summary
        tips = result.tips
      } else if (aiProvider === 'gemini') {
        const result = await callGemini(body)
        summary = result.summary
        tips = result.tips
      } else {
        // Fallback to template
        const result = generateTemplateSummary(body)
        summary = result.summary
        tips = result.tips
      }
    } else {
      // Use deterministic template
      const result = generateTemplateSummary(body)
      summary = result.summary
      tips = result.tips
    }

    const response: AssessmentResponse = {
      summary: summary,
      tips: tips
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Assessment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function callOpenAI(request: AssessmentRequest): Promise<{ summary: string; tips: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `Physiotherapy assistant. Based on the following numeric features from a ${request.exercise} exercise session, provide 3 concise coaching tips (total <80 words). No diagnosis, only actionable advice.

Exercise: ${request.exercise}
Form Score: ${request.score}/100
Rep Count: ${request.repCount}
Joint Angles:
- Trunk: ${request.angles.trunkAngle}°
- Hip: ${request.angles.hipAngle}°
- Knee: ${request.angles.kneeAngle}°
- Shoulder: ${request.angles.shoulderAngle}°
- Elbow: ${request.angles.elbowAngle}°
- Ankle: ${request.angles.ankleAngle}°

Flags: ${request.flags.join(', ') || 'None'}

Provide 3 specific, actionable tips based on this data:`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content || ''
    
    // Parse the response into tips
    const tips = content.split('\n').filter(line => line.trim().length > 0).slice(0, 3)
    
    return {
      summary: `AI-generated coaching tips for your ${request.exercise} session.`,
      tips: tips.length > 0 ? tips : ['Focus on maintaining proper form', 'Keep movements controlled', 'Practice regularly for improvement']
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    // Fallback to template
    return generateTemplateSummary(request)
  }
}

async function callGemini(request: AssessmentRequest): Promise<{ summary: string; tips: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const prompt = `Physiotherapy assistant. Based on the following numeric features from a ${request.exercise} exercise session, provide 3 concise coaching tips (total <80 words). No diagnosis, only actionable advice.

Exercise: ${request.exercise}
Form Score: ${request.score}/100
Rep Count: ${request.repCount}
Joint Angles:
- Trunk: ${request.angles.trunkAngle}°
- Hip: ${request.angles.hipAngle}°
- Knee: ${request.angles.kneeAngle}°
- Shoulder: ${request.angles.shoulderAngle}°
- Elbow: ${request.angles.elbowAngle}°
- Ankle: ${request.angles.ankleAngle}°

Flags: ${request.flags.join(', ') || 'None'}

Provide 3 specific, actionable tips based on this data:`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.7
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.candidates[0]?.content?.parts[0]?.text || ''
    
    // Parse the response into tips
    const tips = content.split('\n').filter(line => line.trim().length > 0).slice(0, 3)
    
    return {
      summary: `AI-generated coaching tips for your ${request.exercise} session.`,
      tips: tips.length > 0 ? tips : ['Focus on maintaining proper form', 'Keep movements controlled', 'Practice regularly for improvement']
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    // Fallback to template
    return generateTemplateSummary(request)
  }
}

function generateTemplateSummary(request: AssessmentRequest): { summary: string; tips: string[] } {
  const { exercise, score, repCount, angles, flags } = request
  
  let tips: string[] = []
  
  // Generate tips based on score and exercise type
  if (score < 60) {
    tips.push('Focus on basic form before increasing intensity')
    tips.push('Practice with slower, controlled movements')
    tips.push('Consider reducing range of motion initially')
  } else if (score < 80) {
    tips.push('Good progress! Focus on consistency')
    tips.push('Pay attention to breathing patterns')
    tips.push('Gradually increase difficulty')
  } else {
    tips.push('Excellent form! Maintain this quality')
    tips.push('Consider adding variations or resistance')
    tips.push('Great job on technique consistency')
  }
  
  // Exercise-specific tips
  if (exercise === 'squat') {
    if (angles.hipAngle < 60) {
      tips[0] = 'Go deeper in your squat for better range of motion'
    }
    if (angles.trunkAngle > 20) {
      tips[1] = 'Keep your chest up and back straight'
    }
  } else if (exercise === 'pullup') {
    if (angles.shoulderAngle > 30) {
      tips[0] = 'Engage your shoulders and keep them stable'
    }
    if (angles.elbowAngle > 120) {
      tips[1] = 'Pull with your back muscles, not just arms'
    }
  }
  
  // Flag-based tips
  if (flags.includes('Knee valgus detected')) {
    tips[2] = 'Push your knees out to align with your toes'
  }
  if (flags.includes('Swinging detected')) {
    tips[2] = 'Control the movement and avoid momentum'
  }
  
  return {
    summary: `Template coaching tips for your ${exercise} session (Score: ${score}/100, Reps: ${repCount})`,
    tips: tips.slice(0, 3)
  }
}
