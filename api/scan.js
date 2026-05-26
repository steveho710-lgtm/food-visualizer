import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { imageB64, mimeType } = req.body
    if (!imageB64 || !mimeType) return res.status(400).json({ error: 'Missing imageB64 or mimeType' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `You are a food and menu analysis assistant. Analyze the menu image and return ONLY a valid JSON object. No markdown, no backticks, no explanation. Keep ingredient lists to 3 items max. Limit to 20 dishes maximum.
Format: {"language":"English","dishes":[{"name":"English name","nameOriginal":"original name if not English","ingredients":["ingredient1","ingredient2"]}]}
If no ingredients listed, use []. Always translate dish names to English in the "name" field.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageB64 } },
            { type: 'text', text: 'Analyze this menu image and return the JSON.' }
          ]
        }]
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json(data)

    const raw = data.content?.find(b => b.type === 'text')?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(500).json({ error: 'No JSON in response' })

    res.status(200).json(JSON.parse(match[0]))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
