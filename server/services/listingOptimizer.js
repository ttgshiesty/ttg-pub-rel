function buildPrompt(input) {
  const { item, price, currency, quantity, notes } = input;
  const features = [
    item.description?.trim() || null,
    item.foundIn?.length
      ? `Found in: ${item.foundIn.slice(0, 3).join(', ')}`
      : null,
    notes?.trim() || null,
  ]
    .filter(Boolean)
    .join(' | ');

  return [
    'Create a SHiESTY marketplace listing for ARC Raiders players.',
    'Return polished plain text only, using exactly these headings:',
    'Title:',
    'Description:',
    'Tags:',
    'Visual Recommendations:',
    'Pricing Suggestion:',
    '',
    'Rules:',
    '- Title must be 60 characters or less.',
    '- Description must be 150 to 300 words.',
    '- Include 10 to 15 search tags in one comma-separated line.',
    '- Sound premium, clear, and trustworthy.',
    '- Do not invent unsupported guarantees, stats, rarity, or fake urgency.',
    '- Make the result ready to paste into a marketplace listing.',
    '',
    'Item details:',
    `- Item name / title: ${item.name}`,
    `- Item type / category: ${item.itemType || 'Unknown'}`,
    `- Condition / rarity: ${item.rarity || 'Not provided'}`,
    `- Current price: ${price !== null ? `${price} ${currency || 'credits'}` : 'Not provided'}`,
    `- Quantity: ${quantity || 1}`,
    `- Key features: ${features || 'No extra seller notes provided'}`,
  ].join('\n');
}

function extractOutputText(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) return '';
  return payload.output
    .flatMap((entry) => (Array.isArray(entry?.content) ? entry.content : []))
    .map((chunk) =>
      chunk?.type === 'output_text' && typeof chunk.text === 'string'
        ? chunk.text
        : '',
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}

export async function generateOptimizedListing(input) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured for marketplace listing optimization.',
    );
  }

  const model = process.env.OPENAI_MARKETPLACE_MODEL?.trim() || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 900,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are an expert ARC Raiders marketplace listing optimizer.',
            },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: buildPrompt(input) }],
        },
      ],
      text: { format: { type: 'text' } },
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(details || 'OpenAI request failed.');
  }

  const payload = await response.json();
  const output = extractOutputText(payload);
  if (!output) throw new Error('OpenAI returned an empty optimizer response.');
  return { output, model };
}
