import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEnrollment extends Document {
  childId: Types.ObjectId;
  sportId: Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID';
  parentNotes?: string;
  schedule?: {
    day?: string;
    startTime?: string;
    endTime?: string;
  };
  submittedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required'],
      index: true,
    },
    sportId: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID'],
      default: 'UNPAID',
    },
    parentNotes: {
      type: String,
      default: '',
    },
    schedule: {
      day: {
        type: String,
        default: '',
      },
      startTime: {
        type: String,
        default: '',
      },
      endTime: {
        type: String,
        default: '',
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
export default Enrollment;