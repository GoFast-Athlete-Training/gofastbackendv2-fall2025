// Athlete Service - Business logic for athlete operations
// Based on athlete-first architecture

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class AthleteService {
  /**
   * Find athlete by Firebase ID
   */
  static async findByFirebaseId(firebaseId) {
    return await prisma.athlete.findFirst({
      where: { firebaseId }
    });
  }

  /**
   * Find athlete by email
   */
  static async findByEmail(email) {
    return await prisma.athlete.findFirst({
      where: { email }
    });
  }

  /**
   * Create new athlete
   */
  static async create(athleteData) {
    return await prisma.athlete.create({
      data: athleteData
    });
  }

  /**
   * Update athlete
   */
  static async update(id, updateData) {
    return await prisma.athlete.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Get all athletes
   */
  static async getAll() {
    return await prisma.athlete.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get athlete by ID
   */
  static async getById(id) {
    return await prisma.athlete.findUnique({
      where: { id }
    });
  }

  /**
   * Delete athlete
   */
  static async delete(id) {
    return await prisma.athlete.delete({
      where: { id }
    });
  }
}

export default AthleteService;

export async function findAthleteByStravaId(stravaId) {
  return await prisma.athlete.findUnique({ where: { strava_id: stravaId } });
}

// Resolve athleteId from various client param spellings
export function resolveAthleteId(source) {
  if (!source) return undefined;
  const candidates = [
    'athleteId', 'athletesId', 'athlete_id', 'athletes_id', 'athleteid', 'athletesid', 'state'
  ];
  for (const key of candidates) {
    const val = source[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return undefined;
}

