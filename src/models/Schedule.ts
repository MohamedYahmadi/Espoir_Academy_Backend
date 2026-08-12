import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISchedule extends Document {
  sportId: Types.ObjectId;
  date?: Date;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  groupName?: string;
  minAge?: number;
  maxAge?: number;
  maxCapacity?: number;
  coachName?: string;
  location?: string;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    sportId: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport ID is required'],
      index: true,
    },
    date: {
      type: Date,
      default: null,
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: [true, 'Day of week is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    groupName: {
      type: String,
      default: '',
    },
    minAge: {
      type: Number,
      min: [1, 'Min age must be at least 1'],
    },
    maxAge: {
      type: Number,
      min: [1, 'Max age must be at least 1'],
    },
    maxCapacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1'],
    },
    coachName: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
export default Schedule;