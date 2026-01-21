import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes';

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173', 
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
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
