export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const data = await req.json();
    const prompt = `You are a technical estimator. Based on this project brief, provide a realistic budget and timeline estimate in exactly this format: "Estimated Cost: $X - $Y | Timeline: Z weeks".
Brief:
Type: ${data.projectType}
Desc: ${data.description}
Budget: ${data.budget}
Timeline: ${data.timeline}
Do not include any other text.`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.2
      })
    });

    const result = await res.json();
    return new Response(JSON.stringify({ estimate: result.choices[0].message.content.trim() }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
