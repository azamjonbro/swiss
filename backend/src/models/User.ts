import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  createEmailVerificationToken(): string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

UserSchema.pre('save', async function preSave() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

// Returns the raw token (emailed to the user); only its SHA-256 hash is persisted,
// mirroring standard password-reset-token hygiene so a DB read alone can't be used to verify.
UserSchema.methods.createEmailVerificationToken = function createEmailVerificationToken(): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return rawToken;
};

export const User = model<IUser>('User', UserSchema);
