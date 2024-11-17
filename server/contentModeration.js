import vision from '@google-cloud/vision';
const client = new vision.ImageAnnotatorClient();

export async function moderateImageContent(buffer) {
    const [result] = await client.safeSearchDetection({ image: { content: buffer } });
    const safeSearch = result.safeSearchAnnotation;

    const { adult, violence, racy } = safeSearch;
    const isSafe = !['LIKELY', 'VERY_LIKELY'].includes(adult) &&
                   !['LIKELY', 'VERY_LIKELY'].includes(violence) &&
                   !['LIKELY', 'VERY_LIKELY'].includes(racy);

    return isSafe;
}

