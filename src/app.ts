import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes';

const app = express();

// Enable CORS for all origins with credentials support for cookies
// Note: When credentials: true, origin cannot be '*', so we use a function to allow all origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins (for development)
    // In production, you should specify exact origins
    callback(null, true);
  },
  credentials: true, // Allow cookies to be sent
}));

// Middleware to parse cookies
app.use(cookieParser());

// Middleware to parse JSON bodies 
app.use(express.json({ limit: '300mb' }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Video KYC Backend API' });
});

app.use('/api', routes);

export default app;
