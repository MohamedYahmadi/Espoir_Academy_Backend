import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: 'admin' | 'parent';
  isActive: boolean;
  isVerified: boolean;
  profilePicture?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    role: {
      type: String,
      enum: ['admin', 'parent'],
      default: 'parent',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      // Default true so existing accounts (and the seeded admin) remain
      // usable; new registrations explicitly set this to false.
      type: Boolean,
      default: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationToken: String,
    emailVerificationExpire: Date,
  },
  { timestamps: true }
);

// Partial unique index: only one active user per email (allows deactivated emails to be reused)
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate and hash reset password token
userSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return resetToken;
};

// Generate and hash email verification token (valid for 24 hours)
userSchema.methods.getEmailVerificationToken = function (): string {
  const verificationToken = crypto.randomBytes(20).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return verificationToken;
};

// Remove password from JSON output
userSchema.set('toJSON', {
  transform: (_doc: IUser, ret: Partial<IUser>) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpire;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpire;
    return ret;
  },
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;