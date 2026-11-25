import { Router } from 'express';
import { feedbackSchema, waitlistSchema } from '../../../shared/src/index.ts';
import { logger } from '../config/logger.ts';
import { publicSubmitLimiter } from '../middleware/rateLimit.ts';

export const publicRouter = Router();

const FEEDBACK_RECIPIENT_EMAIL = 'cantal2227@gmail.com';

publicRouter.post('/feedback', publicSubmitLimiter, (req, res, next) => {
  try {
    const body = feedbackSchema.parse(req.body);
    logger.info(
      {
        topic: body.topic,
        recipient: FEEDBACK_RECIPIENT_EMAIL,
        senderEmail: body.email,
        requestId: req.requestId,
      },
      'Feedback routed for developer'
    );
    res.status(201).json({ accepted: true, recipient: FEEDBACK_RECIPIENT_EMAIL });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/waitlist', publicSubmitLimiter, (req, res, next) => {
  try {
    const body = waitlistSchema.parse(req.body);
    logger.info({ country: body.country, requestId: req.requestId }, 'Waitlist validated');
    res.status(201).json({ accepted: true });
  } catch (err) {
    next(err);
  }
});
