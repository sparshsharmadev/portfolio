export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { raw, projectType } = await req.json();
    if (!raw) return new Response('Invalid request', { status: 400 });

    const prompt = `You are an expert technical product manager. A client wrote this rough description for a ${projectType} project:
"${raw}"

Rewrite this description to be professional, clear, and actionable. Fix typos. Keep it to a single paragraph. Don't add extra features they didn't ask for. Do not include introductory text like "Here is the rewritten description".`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      })
    });

    const data = await res.json();
    return new Response(JSON.stringify({ improved: data.choices[0].message.content.trim() }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
