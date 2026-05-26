

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { imageB64, mimeType } = req.body
    if (!imageB64 || !mimeType) return res.status(400).json({ error: 'Missing imageB64 or mimeType' })

    const prompt = `You are a food and menu analysis assistant. Analyze this menu image and return ONLY a valid JSON object. No markdown, no backticks, no explanation. Keep ingredient lists to 3 items max. Limit to 20 dishes maximum.
Format: {"language":"English","dishes":[{"name":"English name","nameOriginal":"original name if not English","ingredients":["ingredient1","ingredient2"]}]}
If no ingredients listed, use []. Always translate dish names to English in the "name" field.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageB64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
        })
      }
    )

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const match = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'No JSON in response' })

    res.status(200).json(JSON.parse(match[0]))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
