export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { dish, ingredients } = req.query
    if (!dish) return res.status(400).json({ error: 'Missing dish param' })

    const ingredientList = ingredients ? ingredients.split(',').slice(0, 2).join(' ') : ''
    const searchQuery = `${dish} ${ingredientList} food`.trim()

    // Search Unsplash for a food photo
    const searchRes = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1'
        }
      }
    )

    if (!searchRes.ok) {
      const err = await searchRes.json()
      console.error('Unsplash error:', err)
      return res.status(404).json({ error: 'Image search failed' })
    }

    const searchData = await searchRes.json()
    const imgUrl = searchData.results?.[0]?.urls?.regular

    if (!imgUrl) return res.status(404).json({ error: 'No image found' })

    // Proxy the image back
    const imgRes = await fetch(imgUrl)
    if (!imgRes.ok) return res.status(imgRes.status).json({ error: 'Image fetch failed' })

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const buffer = await imgRes.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(Buffer.from(buffer))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
