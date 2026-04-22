export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, gender } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const cleanText = text
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .slice(0, 200);

  // gender: 'male' | 'female' | 'boy' | 'girl' (תאימות לאחור)
  // השרת מחזיר תמיד את אותו קול — הbitch shift קורה בצד הלקוח
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=he&client=tw-ob`;

  try {
    const googleRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    });

    if (!googleRes.ok) {
      return res.status(502).json({ error: 'Google TTS error', status: googleRes.status });
    }

    const arrayBuffer = await googleRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', buffer.length);
    // שולחים גם את הgender חזרה כ-header כדי שהלקוח ידע לעשות pitch shift
    res.setHeader('X-Voice-Gender', gender || 'male');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}