export default async function handler(req, res) {
  // CORS headers
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

  // Get API key from request or environment
  const key = apiKey || process.env.REPLICATE_API_KEY;

  if (!key) {
    return res.status(500).json({ 
      error: 'r8_FE1YJioCW9Hj9QoF490QrQMjWEntCi92LoSLE' 
    });
  }

  try {
    console.log('Creating prediction...');
    
    // Step 1: Create prediction on Replicate
    const predictionRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '2c1608e18606ffa54c33d20623cb039da57f564ad619591713ba017628246b435',
        input: {
          prompt: `You are a helpful Bihari AI assistant who speaks Bhojpuri, Hindi, and English.
Answer the user's question in a friendly way.
Keep response under 200 words.

User message: ${message}

Your response:`,
          max_length: 300
        }
      })
    });

    // Check if response is ok
    if (!predictionRes.ok) {
      const errText = await predictionRes.text();
      console.error('Replicate API Error:', errText);
      return res.status(predictionRes.status).json({ 
        error: `Replicate API error: ${predictionRes.statusText}` 
      });
    }

    const prediction = await predictionRes.json();
    const predictionId = prediction.id;

    console.log('Prediction created:', predictionId);

    // Step 2: Poll for result (wait max 60 seconds)
    let output = null;
    let attempts = 0;
    const maxAttempts = 120; // 120 * 0.5s = 60 seconds

    while (attempts < maxAttempts) {
      // Wait 0.5 seconds before polling
      await new Promise(resolve => setTimeout(resolve, 500));

      const getRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${key}`,
          'Content-Type': 'application/json',
        }
      });

      if (!getRes.ok) {
        const errText = await getRes.text();
        console.error('Poll error:', errText);
        return res.status(500).json({ error: 'Failed to get prediction status' });
      }

      const result = await getRes.json();
      console.log('Status:', result.status);

      if (result.status === 'succeeded') {
        // Extract output
        if (Array.isArray(result.output)) {
          output = result.output.join('');
        } else if (typeof result.output === 'string') {
          output = result.output;
        } else {
          output = JSON.stringify(result.output);
        }

        console.log('Got output:', output.substring(0, 100));
        break;
      }

      if (result.status === 'failed') {
        return res.status(500).json({ 
          error: `Prediction failed: ${result.error || 'Unknown error'}` 
        });
      }

      attempts++;
    }

    if (!output) {
      return res.status(500).json({ 
        error: 'Prediction timeout - took too long. Try again.' 
      });
    }

    // Clean up output
    output = output.trim();
    if (!output) {
      output = 'माफ करिये, मुझे कोई जवाब नहीं मिला। फिर से कोशिश करें।';
    }

    return res.status(200).json({ reply: output });

  } catch (error) {
    console.error('Backend error:', error);
    return res.status(500).json({ 
      error: `Error: ${error.message}` 
    });
  }
}
