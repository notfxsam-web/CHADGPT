export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, apiKey } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  // Use API key from request (frontend sends it) or from env var
  const key = apiKey || process.env.REPLICATE_API_KEY;

  if (!key) {
    return res.status(500).json({ 
      error: 'r8_FE1YJioCW9Hj9QoF490QrQMjWEntCi92LoSLE' 
    });
  }

  try {
    // Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '2c1608e18606ffa54c33d20623cb039da57f564ad619591713ba017628246b435',
        input: {
          prompt: `You are a helpful Bihari AI assistant. Respond in Bhojpuri, Hindi, or English.
Be friendly, fun, and helpful.

User: ${message}
