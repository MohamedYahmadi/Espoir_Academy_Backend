import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  type: 'SCHEDULE_CREATED' | 'SCHEDULE_UPDATED' | 'SPORT_CREATED';
  title: string;
  message: string;
  sportId?: Types.ObjectId;
  scheduleId?: Types.ObjectId;
  read: boolean;
  readAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['SCHEDULE_CREATED', 'SCHEDULE_UPDATED', 'SPORT_CREATED'],
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    sportId: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      default: null,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fetching a user's notifications, newest first
notificationSchema.index({ recipientId: 1, createdAt: -1 });
// Index for unread count
notificationSchema.index({ recipientId: 1, read: 1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
