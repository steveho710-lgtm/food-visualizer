import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { name, ingredients } = req.body
    if (!name) return res.status(400).json({ error: 'Missing dish name' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `You are a food expert. Given a dish name and ingredients, return ONLY a valid JSON object with no markdown or backticks:
{"description":"2-sentence description of the dish and its flavour profile","color1":"main CSS hex color of the dish","color2":"secondary CSS hex color","emoji":"single emoji for the dish"}`,
        messages: [{
          role: 'user',
          content: `Dish: ${name}. Ingredients: ${ingredients?.length ? ingredients.join(', ') : 'not specified'}.`
        }]
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json(data)

    const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
    const match = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
    const result = match ? JSON.parse(match[0]) : {}

    res.status(200).json({
      description: result.description || 'A delicious dish.',
      color1: result.color1 || '#e67e22',
      color2: result.color2 || '#f39c12',
      emoji: result.emoji || '🍽'
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
