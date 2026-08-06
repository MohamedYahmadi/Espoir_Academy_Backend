import mongoose, { Document, Schema } from 'mongoose';

export interface ISport extends Document {
  name: string;
  nameArabic?: string;
  price: number;
  description?: string;
  maxCapacity: number;
  minAge: number;
  maxAge: number;
  scheduleInfo?: string;
}

const sportSchema = new Schema<ISport>(
  {
    name: {
      type: String,
      required: [true, 'Sport name is required'],
      unique: true,
      trim: true,
    },
    nameArabic: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    description: {
      type: String,
      default: '',
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Max capacity is required'],
      default: 30,
      min: [1, 'Capacity must be at least 1'],
    },
    minAge: {
      type: Number,
      required: [true, 'Min age is required'],
      default: 5,
      min: [1, 'Min age must be at least 1'],
    },
    maxAge: {
      type: Number,
      required: [true, 'Max age is required'],
      default: 18,
      min: [1, 'Max age must be at least 1'],
    },
    scheduleInfo: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Sport = mongoose.model<ISport>('Sport', sportSchema);
export default Sport;
