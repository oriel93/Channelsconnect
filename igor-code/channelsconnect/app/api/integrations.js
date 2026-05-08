// Compatibility layer for integrations
// InvokeLLM now calls OpenAI chat completions directly from the browser.
// Set VITE_OPENAI_API_KEY in your .env / SST secrets for it to work.

export const InvokeLLM = async ({ prompt, response_json_schema } = {}) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('InvokeLLM: VITE_OPENAI_API_KEY is not set.');
    return null;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('InvokeLLM API error:', err);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error('InvokeLLM fetch error:', e);
    return null;
  }
};

export const SendEmail = () => {
  console.warn('SendEmail is not available - base44 specific feature');
  return Promise.resolve({ message: 'Feature not implemented' });
};

export const UploadFile = () => {
  console.warn('UploadFile is not available - base44 specific feature');
  return Promise.resolve({ message: 'Feature not implemented' });
};

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
};

