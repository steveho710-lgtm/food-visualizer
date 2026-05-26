export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { name, ingredients } = req.body
    if (!name) return res.status(400).json({ error: 'Missing dish name' })

    const prompt = `You are a food expert. Given a dish name and ingredients, return ONLY a valid JSON object with no markdown or backticks:
{"description":"2-sentence description of the dish and its flavour profile","color1":"main CSS hex color of the dish","color2":"secondary CSS hex color","emoji":"single emoji for the dish"}

Dish: ${name}. Ingredients: ${ingredients?.length ? ingredients.join(', ') : 'not specified'}.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 500 }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data))
      return res.status(200).json({
        description: 'A delicious dish.',
        color1: '#e67e22', color2: '#f39c12', emoji: '🍽'
      })
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const match = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
    const result = match ? JSON.parse(match[0]) : {}

    res.status(200).json({
      description: result.description || 'A delicious dish.',
      color1: result.color1 || '#e67e22',
      color2: result.color2 || '#f39c12',
      emoji: result.emoji || '🍽'
    })
  } catch (e) {
    console.error('Dish handler error:', e)
    res.status(200).json({
      description: 'A delicious dish.',
      color1: '#e67e22', color2: '#f39c12', emoji: '🍽'
    })
  }
}
