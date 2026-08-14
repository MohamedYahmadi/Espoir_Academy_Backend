import { Types } from 'mongoose';
import Notification from '../models/Notification.js';
import Enrollment from '../models/Enrollment.js';
import Child from '../models/Child.js';
import User from '../models/User.js';
import { getIO, isSocketInitialized } from './socketService.js';

export type NotificationType =
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'SPORT_CREATED';

type NotificationDocWithTimestamps = {
  _id: unknown;
  createdAt?: Date;
};

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  sportId?: Types.ObjectId | string;
  scheduleId?: Types.ObjectId | string;
}

/**
 * Create a notification document and push it in real time
 * to the target user(s) via Socket.IO.
 */
const createAndEmit = async (
  recipientIds: (Types.ObjectId | string)[],
  input: CreateNotificationInput
): Promise<void> => {
  if (recipientIds.length === 0) return;

  const docs = recipientIds.map((recipientId) => ({
    recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
    sportId: input.sportId ?? null,
    scheduleId: input.scheduleId ?? null,
    read: false,
  }));

  const created = await Notification.insertMany(docs);

  // Push to each recipient's personal socket room (if connected)
  if (isSocketInitialized()) {
    const io = getIO();
    recipientIds.forEach((recipientId, index) => {
      const doc = created[index] as NotificationDocWithTimestamps & {
        type: string;
        title: string;
        message: string;
        sportId?: unknown;
        scheduleId?: unknown;
        read: boolean;
      };
      io.to(`user:${String(recipientId)}`).emit('notification:new', {
        id: doc._id,
        recipientId: String(recipientId),
        type: doc.type,
        title: doc.title,
        message: doc.message,
        sportId: doc.sportId ? String(doc.sportId) : null,
        scheduleId: doc.scheduleId ? String(doc.scheduleId) : null,
        read: doc.read,
        createdAt: doc.createdAt,
      });
    });
  }
};

/**
 * Notify the parents of children enrolled (APPROVED) in a given sport.
 * This is the "targeted" delivery: parents with no connection to the
 * sport do not receive anything.
 */
export const notifyParentsOfSport = async (
  sportId: Types.ObjectId | string,
  input: CreateNotificationInput
): Promise<void> => {
  try {
    // Find all APPROVED enrollments for the sport
    const enrollments = await Enrollment.find({
      sportId,
      status: 'APPROVED',
    }).select('childId');

    if (enrollments.length === 0) return;

    const childIds = enrollments.map((e) => e.childId);
    const children = await Child.find({ _id: { $in: childIds } }).select(
      'parentId'
    );

    const parentIds = [
      ...new Set(children.map((c) => String(c.parentId)).filter(Boolean)),
    ];

    await createAndEmit(parentIds, input);
  } catch (error) {
    console.error('Failed to notify parents of sport:', error);
  }
};

/**
 * Notify all active parents. Used when a brand new sport is created.
 */
export const notifyAllParents = async (
  input: CreateNotificationInput
): Promise<void> => {
  try {
    const parents = await User.find({ role: 'parent', isActive: true }).select(
      '_id'
    );
    const parentIds = parents.map((p) => p._id);
    await createAndEmit(parentIds, input);
  } catch (error) {
    console.error('Failed to notify all parents:', error);
  }
};
