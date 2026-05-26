import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

const anthropicHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': ANTHROPIC_KEY,
  'anthropic-version': '2023-06-01'
}

// --- Scan menu image ---
app.post('/api/scan', async (req, res) => {
  try {
    const { imageB64, mimeType } = req.body
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: anthropicHeaders,
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
    res.json(JSON.parse(match[0]))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Get dish description ---
app.post('/api/dish', async (req, res) => {
  try {
    const { name, ingredients } = req.body
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: anthropicHeaders,
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
    res.json(match ? JSON.parse(match[0]) : { description: 'A delicious dish.', color1: '#e67e22', color2: '#f39c12', emoji: '🍽' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Fetch dish image (server-side, no CORS issues) ---
app.get('/api/image', async (req, res) => {
  try {
    const { dish } = req.query
    if (!dish) return res.status(400).json({ error: 'Missing dish param' })

    // Search Wikimedia Commons for the dish
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(dish + ' food')}&gsrlimit=8&prop=imageinfo&iiprop=url|mime|thumburl&iiurlwidth=600&format=json`
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'FoodVisualizer/1.0' } })
    const searchData = await searchRes.json()
    const pages = Object.values(searchData.query?.pages || {})
    const imgs = pages.filter(p => {
      const mime = p.imageinfo?.[0]?.mime || ''
      return mime === 'image/jpeg' || mime === 'image/png'
    })

    if (!imgs.length) return res.status(404).json({ error: 'No image found' })

    const imgUrl = imgs[0].imageinfo?.[0]?.thumburl || imgs[0].imageinfo?.[0]?.url
    if (!imgUrl) return res.status(404).json({ error: 'No image URL' })

    // Proxy the image bytes back to the client
    const imgRes = await fetch(imgUrl, {
      headers: { 'User-Agent': 'FoodVisualizer/1.0', 'Referer': 'https://commons.wikimedia.org' }
    })
    if (!imgRes.ok) return res.status(imgRes.status).json({ error: 'Image fetch failed' })

    res.set('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=86400')
    imgRes.body.pipe(res)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Serve React frontend in production
app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
