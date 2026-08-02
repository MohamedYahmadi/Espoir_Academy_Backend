import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChild extends Document {
  parentId: Types.ObjectId;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'Male' | 'Female';
  medicalNotes: string;
  isComplete: boolean;
  documents: {
    photoUrl?: string;
    birthCertificateUrl?: string;
    medicalCertificateUrl?: string;
  };
}

const childSchema = new Schema<IChild>(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent ID is required'],
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      required: [true, 'Gender is required'],
    },
    medicalNotes: {
      type: String,
      default: '',
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
    documents: {
      photoUrl: {
        type: String,
        default: '',
      },
      birthCertificateUrl: {
        type: String,
        default: '',
      },
      medicalCertificateUrl: {
        type: String,
        default: '',
      },
    },
  },
  { timestamps: true }
);

const Child = mongoose.model<IChild>('Child', childSchema);
export default Child;