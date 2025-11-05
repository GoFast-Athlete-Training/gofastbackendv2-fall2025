import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * GET /api/messages/:groupId
 * Get recent messages for a group (crew wall)
 */
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 50; // Default 50, max 200
    const limitValue = Math.min(limit, 200);

    if (!groupId) {
      return res.status(400).json({ 
        success: false, 
        error: 'groupId is required' 
      });
    }

    const prisma = getPrismaClient();
    
    const messages = await prisma.message.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limitValue
    });

    // Reverse to show oldest first (chronological order)
    const sortedMessages = messages.reverse();

    res.json({
      success: true,
      count: sortedMessages.length,
      groupId,
      messages: sortedMessages
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch messages'
    });
  }
});

/**
 * POST /api/messages
 * Create a new message (REST fallback - Socket.io is preferred)
 * Body: { groupId, authorId, author, content }
 */
router.post('/', async (req, res) => {
  try {
    const { groupId, authorId, author, content } = req.body;

    if (!groupId || !authorId || !author || !content) {
      return res.status(400).json({
        success: false,
        error: 'groupId, authorId, author, and content are required'
      });
    }

    const prisma = getPrismaClient();
    
    const message = await prisma.message.create({
      data: {
        groupId,
        authorId,
        author,
        content
      }
    });

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('❌ Error creating message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create message'
    });
  }
});

export default router;

