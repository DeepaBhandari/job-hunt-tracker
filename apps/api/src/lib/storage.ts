import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
const resumesDir = path.join(uploadDir, 'resumes');

async function ensureResumesDir(): Promise<void> {
  await mkdir(resumesDir, { recursive: true });
}

function sanitizeFileName(originalName: string): string {
  return originalName.replace(/[^a-zA-Z0-9.\-_]/g, '-');
}

export async function saveResumeFile(buffer: Buffer, originalName: string): Promise<string> {
  await ensureResumesDir();

  const fileName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(originalName)}`;
  await writeFile(path.join(resumesDir, fileName), buffer);

  return `resumes/${fileName}`;
}

export function resolveResumeFilePath(filePath: string): string {
  const resolved = path.resolve(uploadDir, filePath);
  if (!resolved.startsWith(uploadDir + path.sep)) {
    throw new Error('Invalid file path');
  }
  return resolved;
}

export async function deleteResumeFile(filePath: string): Promise<void> {
  try {
    await unlink(resolveResumeFilePath(filePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
