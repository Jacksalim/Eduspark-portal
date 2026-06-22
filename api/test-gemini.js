export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const apiKey = process.env.GEMINI_API_KEY
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  const data = await r.json()
  const models = data.models?.map(m => m.name).filter(n => n.includes('gemini')) || []
  res.status(200).json({ models })
}
