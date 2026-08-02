import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
  childId: Types.ObjectId;
  enrollmentId: Types.ObjectId;
  amount: number;
  status: 'PENDING' | 'PAID' | 'UNPAID';
  dueDate?: Date;
  paidAt?: Date;
  notes?: string;
}

const paymentSchema = new Schema<IPayment>(
  {
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'Child ID is required'],
      index: true,
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'UNPAID'],
      default: 'UNPAID',
    },
    dueDate: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export default Payment;