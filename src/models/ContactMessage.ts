import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IContactMessage extends Document {
  userId: Types.ObjectId;
  senderName: string;
  senderEmail: string;
  phone: string;
  sport?: string;
  message: string;
  reply?: string;
  repliedAt?: Date;
  read: boolean;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    senderName: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true,
    },
    senderEmail: {
      type: String,
      required: [true, 'Sender email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    sport: {
      type: String,
      default: '',
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    reply: {
      type: String,
      default: '',
      trim: true,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for listing a user's messages and admin's inbox (newest first)
contactMessageSchema.index({ userId: 1, createdAt: -1 });
contactMessageSchema.index({ read: 1, createdAt: -1 });

const ContactMessage = mongoose.model<IContactMessage>(
  'ContactMessage',
  contactMessageSchema
);
export default ContactMessage;