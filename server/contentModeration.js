import vision from '@google-cloud/vision';

let client;
if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CREDENTIALS_B64) {
  // Decode the base64 encoded credentials
  const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
  client = new vision.ImageAnnotatorClient({
    credentials: JSON.parse(credentialsJson)
  });
} else {
  // In development, use the local file path
  client = new vision.ImageAnnotatorClient();
}

export async function moderateImageContent(buffer) {
  const [result] = await client.safeSearchDetection({ image: { content: buffer } });
  const safeSearch = result.safeSearchAnnotation;
  const { adult, violence, racy } = safeSearch;
  const isSafe = !['LIKELY', 'VERY_LIKELY'].includes(adult) &&
                 !['LIKELY', 'VERY_LIKELY'].includes(violence) &&
                 !['LIKELY', 'VERY_LIKELY'].includes(racy);
  return isSafe;
}