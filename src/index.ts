import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

const payloadSchema = z.object({
  data: z.record(z.any()),
  timestamp: z.number().optional()
});

app.post('/api/v1/process', (req, res) => {
  try {
    const validated = payloadSchema.parse(req.body);
    res.json({ status: 'success', processed: validated.data });
  } catch (e) {
    res.status(400).json({ error: 'Invalid payload schema' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '3.0.0' });
});

if (require.main === module) {
  app.listen(8080, () => console.log('TypeScript-Data-Warehouse-Sync running on port 8080'));
}

export default app;
