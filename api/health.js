/**
 * Health-check endpoint.
 * Returns service status and available endpoints.
 */

export default async function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    timestamp: Date.now(),
    endpoints: [
      'generate-readme',
      'generate-image',
      'upload-image',
      'update-readme',
      'analyse-readme',
    ],
  });
}
