const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const openRouterModel = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';

if (!openRouterApiKey) {
  throw new Error('OPENROUTER_API_KEY is not configured');
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

async function chatComplete(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openRouterApiKey}`,
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function generateCoverLetter(prompt: string): Promise<string> {
  return chatComplete(
    'You write persuasive, concise cover letters with a short introduction, relevant skills and experience, and a closing paragraph.',
    `Write a cover letter for the following job posting:\n\n${prompt}`
  );
}

export async function summarizeJobPosting(jobPosting: string): Promise<string> {
  return chatComplete(
    'You summarize job postings into a short list of key responsibilities and required skills.',
    `Summarize the following job posting:\n\n${jobPosting}`
  );
}

export async function analyzeResumeGap(prompt: string): Promise<string> {
  return chatComplete(
    'You compare a resume against a job posting and produce a gap analysis: a short list of missing or under-emphasized keywords and skills, followed by concrete suggestions for tailoring the resume to the role.',
    prompt
  );
}

export async function generateInterviewPrep(prompt: string): Promise<string> {
  return chatComplete(
    'You generate interview preparation material. Produce exactly 10 likely interview questions for the given role and interview stage, each followed by a short coaching tip on how to answer well.',
    prompt
  );
}
