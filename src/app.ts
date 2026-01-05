import express, { Request, Response } from 'express';
import routes from './routes';

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Video KYC Backend API' });
});

app.use(routes);

export default app;
