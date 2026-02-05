import express from 'express';
import passport from 'passport';
import { prisma } from './prisma'; // Use the singleton
import registrationRoutes from './auth/registration';
import loginRoutes from './auth/login';
import googleRoutes from './auth/google';
import documentRoutes from './routes/documentRoutes';
import viewRoutes from './routes/viewRoutes';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(passport.initialize());

app.use('/auth', registrationRoutes);
app.use('/auth', loginRoutes);
app.use('/auth', googleRoutes);
app.use('/api/documents', documentRoutes);
app.use('/view', viewRoutes);

app.get('/', (req, res) => {
  res.send('Docusafe API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
