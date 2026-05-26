export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { dish } = req.query
    if (!dish) return res.status(400).json({ error: 'Missing dish param' })

    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(dish + ' food dish cuisine')}&gsrlimit=20&prop=imageinfo&iiprop=url|mime|thumburl&iiurlwidth=600&format=json`

    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'FoodVisualizer/1.0' }
    })
    const searchData = await searchRes.json()
    const pages = Object.values(searchData.query?.pages || {})

    const foodWords = ['food', 'dish', 'cuisine', 'meal', 'cook', 'recipe', 'pizza', 'pasta',
      'rice', 'meat', 'fish', 'salad', 'soup', 'bread', 'cake', 'chicken', 'beef', 'pork',
      'vegetable', 'dessert', 'sauce', 'grill', 'fried', 'baked', 'roast', 'curry', 'noodle',
      'sushi', 'burger', 'sandwich', 'taco', 'steak', 'seafood', 'prawn', 'shrimp', 'cheese']

    const dishWords = dish.toLowerCase().split(' ')

    // First pass: images whose filename contains dish name or food words
    let imgs = pages.filter(p => {
      const mime = p.imageinfo?.[0]?.mime || ''
      if (mime !== 'image/jpeg' && mime !== 'image/png') return false
      const title = p.title?.toLowerCase() || ''
      const matchesDish = dishWords.some(w => w.length > 3 && title.includes(w))
      const matchesFood = foodWords.some(w => title.includes(w))
      return matchesDish || matchesFood
    })

    // Fallback: any jpeg/png if no food-matched images found
    if (!imgs.length) {
      imgs = pages.filter(p => {
        const mime = p.imageinfo?.[0]?.mime || ''
        return mime === 'image/jpeg' || mime === 'image/png'
      })
    }

    if (!imgs.length) return res.status(404).json({ error: 'No image found' })

    const imgUrl = imgs[0].imageinfo?.[0]?.thumburl || imgs[0].imageinfo?.[0]?.url
    if (!imgUrl) return res.status(404).json({ error: 'No image URL' })

    const imgRes = await fetch(imgUrl, {
      headers: { 'User-Agent': 'FoodVisualizer/1.0', 'Referer': 'https://commons.wikimedia.org' }
    })

    if (!imgRes.ok) return res.status(imgRes.status).json({ error: 'Image fetch failed' })

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const buffer = await imgRes.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.status(200).send(Buffer.from(buffer))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
