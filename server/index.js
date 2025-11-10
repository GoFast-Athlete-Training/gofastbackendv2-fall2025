import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

const parseAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    return null;
  }

  const items = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin: allowedOrigins ?? true,
  }),
);
app.use(express.json());

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const mapVolunteerRecord = (record) => ({
  id: record.id,
  name: record.name,
  email: record.email,
  role: record.role,
  note: record.note,
  createdAt: record.createdAt.toISOString(),
});

app.get('/healthz', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/volunteer/input', async (request, response) => {
  const name = normalizeString(request.body?.name);
  const email = normalizeString(request.body?.email);
  const role = normalizeString(request.body?.role);
  const noteRaw = normalizeString(request.body?.note ?? '');

  if (!name || !email || !role) {
    return response.status(400).json({
      error: 'Please include a name, email, and volunteer role.',
    });
  }

  try {
    const newEntry = await prisma.volunteerInput.create({
      data: {
        name,
        email,
        role,
        note: noteRaw || null,
      },
    });

    return response.status(201).json({ data: mapVolunteerRecord(newEntry) });
  } catch (error) {
    console.error('Failed to create volunteer input', error);
    return response.status(500).json({
      error: 'Unable to save volunteer signup right now. Please try again later.',
    });
  }
});

app.get('/api/volunteer/input', async (_request, response) => {
  try {
    const entries = await prisma.volunteerInput.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return response.json({ data: entries.map(mapVolunteerRecord) });
  } catch (error) {
    console.error('Failed to load volunteer roster', error);
    return response.status(500).json({
      error: 'Unable to load volunteer roster right now. Please try again later.',
    });
  }
});

const port = Number.parseInt(process.env.PORT ?? '4000', 10);

const server = app.listen(port, () => {
  console.log(`Volunteer API server listening on port ${port}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);


