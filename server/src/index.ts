import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { propertiesRouter } from './routes/properties';
import { unitsRouter } from './routes/units';
import { tenantsRouter } from './routes/tenants';
import { paymentsRouter } from './routes/payments';
import { expensesRouter } from './routes/expenses';
import { maintenanceRouter } from './routes/maintenance';
import { dashboardRouter } from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Property Manager API running on http://localhost:${PORT}`);
});
