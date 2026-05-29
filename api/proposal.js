export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { inquiry } = await req.json();
    const prompt = `Write a professional, concise project proposal for the following client inquiry:
Name: ${inquiry.name}
Company: ${inquiry.company}
Project Type: ${inquiry.projectType}
Budget: ${inquiry.budget}
Timeline: ${inquiry.timeline}
Description: ${inquiry.description}

Keep it under 200 words. Address the client directly. Outline the next steps for onboarding.`;

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.5
      })
    });

    const result = await res.json();
    return new Response(JSON.stringify({ proposal: result.choices[0].message.content.trim() }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
