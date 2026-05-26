export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { dish, ingredients } = req.query
    if (!dish) return res.status(400).json({ error: 'Missing dish param' })

    // Build a rich search query using dish name + ingredients as context
    const ingredientList = ingredients ? ingredients.split(',').slice(0, 3).join(' ') : ''
    const searchQuery = `${dish} ${ingredientList} food dish`.trim()

    // Step 1: Search Wikipedia with rich query
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srlimit=8&format=json`,
      { headers: { 'User-Agent': 'FoodVisualizer/1.0' } }
    )
    const searchData = await searchRes.json()
    const results = searchData.query?.search || []
    if (!results.length) return res.status(404).json({ error: 'No Wikipedia page found' })

    const dishLower = dish.toLowerCase()
    const foodWords = ['pizza', 'pasta', 'dish', 'cuisine', 'food', 'recipe', 'salad', 'soup',
      'bread', 'cake', 'chicken', 'beef', 'pork', 'fish', 'rice', 'noodle', 'curry', 'steak',
      'burger', 'taco', 'sushi', 'seafood', 'dessert', 'sandwich', 'wrap', 'pie', 'tart',
      'grill', 'roast', 'fried', 'baked', 'sauce', 'cheese', 'meat', 'vegetable', 'calzone']

    // Priority 1: title contains dish name AND a food word
    let topResult = results.find(r => {
      const t = r.title.toLowerCase()
      return t.includes(dishLower) && foodWords.some(w => t.includes(w))
    })?.title

    // Priority 2: title contains dish name
    if (!topResult) {
      topResult = results.find(r => r.title.toLowerCase().includes(dishLower))?.title
    }

    // Priority 3: title contains a food word
    if (!topResult) {
      topResult = results.find(r => {
        const t = r.title.toLowerCase()
        return foodWords.some(w => t.includes(w))
      })?.title
    }

    // Priority 4: first result
    if (!topResult) topResult = results[0]?.title
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
