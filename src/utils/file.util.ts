import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

// Directory path for temporary files only
export const TEMP_DIR = path.join(process.cwd(), 'assets', 'temp');

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath - Path to the directory
 */
export const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Save an image buffer to a temporary file
 * @param buffer - Image buffer to save
 * @param filename - Base filename (without extension)
 * @param extension - File extension (default: 'png')
 * @returns Path to the saved file
 */
export const saveImageBuffer = async (
  buffer: Buffer,
  filename: string,
  extension: string = 'png'
): Promise<string> => {
  await ensureDirectoryExists(TEMP_DIR);
  const filePath = path.join(TEMP_DIR, `temp_${filename}_${Date.now()}.${extension}`);
  await writeFile(filePath, buffer);
  return filePath;
};

/**
 * Save a video buffer to a temporary file
 * @param buffer - Video buffer to save
 * @param filename - Base filename (without extension)
 * @param extension - File extension (default: 'webm')
 * @returns Path to the saved file
 */
export const saveVideoBuffer = async (
  buffer: Buffer,
  filename: string,
  extension: string = 'webm'
): Promise<string> => {
  await ensureDirectoryExists(TEMP_DIR);
  const filePath = path.join(TEMP_DIR, `temp_${filename}_${Date.now()}.${extension}`);
  await writeFile(filePath, buffer);
  return filePath;
};
