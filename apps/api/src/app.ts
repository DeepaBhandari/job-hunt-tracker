import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './middleware/error.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import jobsRouter from './routes/jobs.js';
import applicationsRouter from './routes/applications.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/companies', companiesRouter);
app.use('/jobs', jobsRouter);
app.use('/applications', applicationsRouter);

app.use(errorMiddleware);

export default app;
