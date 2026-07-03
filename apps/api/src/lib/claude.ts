import fetch from 'node-fetch';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!anthropicApiKey) {
  throw new Error('ANTHROPIC_API_KEY is not configured');
}

const CLAUDE_BASE = 'https://api.anthropic.com/v1';

export async function generateCoverLetter(prompt: string): Promise<string> {
  const response = await fetch(`${CLAUDE_BASE}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anthropicApiKey}`,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      prompt: `Write a persuasive cover letter for the following job posting. Include a concise introduction, relevant skills and experience, and a closing paragraph. Job details:\n\n${prompt}\n\nCover letter:\n`,
      max_tokens_to_sample: 800,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude request failed: ${errorText}`);
  }

  const data = await response.json();
  return data.completion?.trim() ?? '';
}

export async function summarizeJobPosting(jobPosting: string): Promise<string> {
  const response = await fetch(`${CLAUDE_BASE}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anthropicApiKey}`,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      prompt: `Summarize the following job posting into a short list of key responsibilities and required skills. Job posting:\n\n${jobPosting}\n\nSummary:\n`,
      max_tokens_to_sample: 400,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude request failed: ${errorText}`);
  }

  const data = await response.json();
  return data.completion?.trim() ?? '';
}
