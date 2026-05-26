export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { dish } = req.query
    if (!dish) return res.status(400).json({ error: 'Missing dish param' })

    // Step 1: Search Wikipedia for the dish page
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(dish + ' food')}&srlimit=3&format=json`,
      { headers: { 'User-Agent': 'FoodVisualizer/1.0' } }
    )
    const searchData = await searchRes.json()
    const topResult = searchData.query?.search?.[0]?.title
    if (!topResult) return res.status(404).json({ error: 'No Wikipedia page found' })

    // Step 2: Get the main image from that Wikipedia page
    const pageRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(topResult)}&prop=pageimages&piprop=original&pithumbsize=600&format=json`,
      { headers: { 'User-Agent': 'FoodVisualizer/1.0' } }
    )
    const pageData = await pageRes.json()
    const pages = Object.values(pageData.query?.pages || {})
    const imgUrl = pages[0]?.original?.source || pages[0]?.thumbnail?.source

    if (!imgUrl) return res.status(404).json({ error: 'No image on Wikipedia page' })

    // Step 3: Proxy the image back
    const imgRes = await fetch(imgUrl, {
      headers: { 'User-Agent': 'FoodVisualizer/1.0', 'Referer': 'https://en.wikipedia.org' }
    })

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
