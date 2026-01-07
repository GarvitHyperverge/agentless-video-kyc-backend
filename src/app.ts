import express, { Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware to parse JSON bodies (increased limit for base64 images and videos)
app.use(express.json({ limit: '300mb' }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Video KYC Backend API' });
});

app.use('/api', routes);

export default app;
