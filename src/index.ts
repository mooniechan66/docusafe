import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Docusafe API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
