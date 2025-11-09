// RunCrew Announcement Route
// POST /api/runcrew/:runCrewId/announcements
// Creates a new announcement (admin only)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

const authorizeAnnouncementAccess = async (prisma, runCrewId, athleteId) => {
  const runCrew = await prisma.runCrew.findUnique({
    where: { id: runCrewId },
    include: {
      managers: true,
      memberships: {
        select: { athleteId: true }
      }
    }
  });

  if (!runCrew) return { runCrew: null, authorized: false, canManage: false };

  const isAdmin = runCrew.runcrewAdminId === athleteId;
  const isManager = runCrew.managers?.some(manager => manager.athleteId === athleteId);
  const isMember = runCrew.memberships?.some(member => member.athleteId === athleteId);

  return {
    runCrew,
    authorized: isAdmin || isManager || isMember,
    canManage: isAdmin || isManager
  };
};

// Create announcement (admin/manager)
router.post('/:runCrewId/announcements', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { title, content } = req.body;
  const firebaseId = req.user?.uid;

  // Validation
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Title and content are required'
    });
  }

  try {
    const athlete = await prisma.athlete.findFirst({ where: { firebaseId } });
    if (!athlete) {
      return res.status(404).json({ success: false, error: 'Athlete not found' });
    }

    const { runCrew, canManage } = await authorizeAnnouncementAccess(prisma, runCrewId, athlete.id);
    if (!runCrew) {
      return res.status(404).json({ success: false, error: 'RunCrew not found' });
    }
    if (!canManage) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const announcement = await prisma.runCrewAnnouncement.create({
      data: {
        runCrewId,
        authorId: athlete.id,
        title: title.trim(),
        content: content.trim()
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });

  } catch (error) {
    console.error('❌ RUNCREW ANNOUNCEMENT CREATE ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to create announcement', message: error.message });
  }
});

// Get announcements
router.get('/:runCrewId/announcements', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const firebaseId = req.user?.uid;

  try {
    const athlete = await prisma.athlete.findFirst({ where: { firebaseId } });
    if (!athlete) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const { authorized } = await authorizeAnnouncementAccess(prisma, runCrewId, athlete.id);
    if (!authorized) return res.status(403).json({ success: false, error: 'Access denied' });

    const announcements = await prisma.runCrewAnnouncement.findMany({
      where: { runCrewId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ success: true, announcements });
  } catch (error) {
    console.error('❌ RUNCREW ANNOUNCEMENT LIST ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch announcements', message: error.message });
  }
});

// Update announcement
router.patch('/announcements/:announcementId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { announcementId } = req.params;
  const firebaseId = req.user?.uid;
  const { title, content } = req.body;

  try {
    const athlete = await prisma.athlete.findFirst({ where: { firebaseId } });
    if (!athlete) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const announcement = await prisma.runCrewAnnouncement.findUnique({
      where: { id: announcementId },
      include: {
        runCrew: {
          include: {
            managers: true
          }
        }
      }
    });

    if (!announcement) return res.status(404).json({ success: false, error: 'Announcement not found' });

    const isAdmin = announcement.runCrew.runcrewAdminId === athlete.id;
    const isManager = announcement.runCrew.managers?.some(manager => manager.athleteId === athlete.id);
    const isAuthor = announcement.authorId === athlete.id;

    if (!isAdmin && !isManager && !isAuthor) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) data.content = content.trim();

    const updated = await prisma.runCrewAnnouncement.update({
      where: { id: announcementId },
      data,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        }
      }
    });

    res.json({ success: true, message: 'Announcement updated successfully', data: updated });
  } catch (error) {
    console.error('❌ RUNCREW ANNOUNCEMENT UPDATE ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to update announcement', message: error.message });
  }
});

// Delete announcement
router.delete('/announcements/:announcementId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { announcementId } = req.params;
  const firebaseId = req.user?.uid;

  try {
    const athlete = await prisma.athlete.findFirst({ where: { firebaseId } });
    if (!athlete) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const announcement = await prisma.runCrewAnnouncement.findUnique({
      where: { id: announcementId },
      include: {
        runCrew: {
          include: {
            managers: true
          }
        }
      }
    });

    if (!announcement) return res.status(404).json({ success: false, error: 'Announcement not found' });

    const isAdmin = announcement.runCrew.runcrewAdminId === athlete.id;
    const isManager = announcement.runCrew.managers?.some(manager => manager.athleteId === athlete.id);
    const isAuthor = announcement.authorId === athlete.id;

    if (!isAdmin && !isManager && !isAuthor) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    await prisma.runCrewAnnouncement.delete({ where: { id: announcementId } });

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('❌ RUNCREW ANNOUNCEMENT DELETE ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to delete announcement', message: error.message });
  }
});

export default router;

