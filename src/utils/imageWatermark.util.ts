import sharp from 'sharp';

/**
 * Watermark image with location and timestamp using Sharp
 * 
 * This function overlays text on an image containing:
 * - Location coordinates (latitude, longitude)
 * - Server-side timestamp (prevents client-side manipulation)
 * 
 * HOW WATERMARKING WORKS:
 * 1. Sharp loads the input image
 * 2. Creates an SVG text overlay with location and timestamp
 * 3. Composites the text overlay onto the image
 * 4. The watermarked image is written to the output path
 * 
 * @param inputPath - Path to input image file (unwatermarked)
 * @param outputPath - Path to save watermarked image
 * @param latitude - Latitude coordinate from client
 * @param longitude - Longitude coordinate from client
 * @returns Promise that resolves when watermarking is complete
 */
export async function watermarkImage(
  inputPath: string,
  outputPath: string,
  latitude: string,
  longitude: string
): Promise<void> {
  // Generate server timestamp
  const timestamp = new Date().toISOString();
  
  // Format timestamp for display (e.g., "day/month/year hours(24):minutes:seconds")
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
  const year = date.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  
  // Format time in 24-hour format (HH:MM:SS)
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const displayTimestamp = `${formattedDate} ${formattedTime}`;

  // Create watermark text with location and timestamp
  const watermarkText = `Location: ${latitude}, ${longitude} | Time: ${displayTimestamp}`;

  try {
    // Get image metadata to determine dimensions
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    // Create SVG text overlay
    // Position: top-left corner with padding
    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <rect x="0" y="0" width="${width}" height="50" fill="black" opacity="0.5"/>
        <text x="10" y="30" font-family="Arial, sans-serif" font-size="20" fill="white" font-weight="bold">
          ${watermarkText}
        </text>
      </svg>
    `;

    // Composite the watermark onto the image
    await sharp(inputPath)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .png() // Output as PNG to preserve quality
      .toFile(outputPath);

    console.log('Image watermarked successfully');
  } catch (error: any) {
    console.error('Sharp watermarking error:', error);
    throw new Error(`Failed to watermark image: ${error.message}`);
  }
}
