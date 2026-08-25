import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  /** Denormalised `${firstName} ${lastName}` — kept for emails and legacy records. */
  name: string;
  email: string;
  phone?: string;
  password: string;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpires?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  savedWatches: Types.ObjectId[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  createEmailVerificationToken(): string;
  createPasswordResetToken(): string;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    // Not required at the schema level: registration demands both halves, but a
    // legacy single-word `name` must migrate without inventing a surname.
    lastName: { type: String, trim: true, maxlength: 60, default: '' },
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Stored in canonical "+digits" form (see utils/phone). Sparse so the
    // pre-phone accounts already in the database keep validating.
    phone: { type: String, trim: true, unique: true, sparse: true },
    password: { type: String, required: true, minlength: 8, select: false },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    savedWatches: [{ type: Schema.Types.ObjectId, ref: 'Watch' }],
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Accounts created before the name was split store only `name`; derive the two
// halves from it so those records validate — and are backfilled — the next time
// they are saved (signing in is enough). The email local-part is the last resort
// for a record that has neither, so a legacy sign-in can never fail validation.
UserSchema.pre('validate', function preValidate() {
  if (!this.firstName) {
    const source = (this.name || '').trim() || (this.email || '').split('@')[0] || 'Guest';
    const [first, ...rest] = source.split(/\s+/);
    this.firstName = first;
    if (!this.lastName) this.lastName = rest.join(' ');
  }
  this.name = `${this.firstName} ${this.lastName ?? ''}`.trim();
});

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

UserSchema.methods.createPasswordResetToken = function createPasswordResetToken(): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  return rawToken;
};

export const User = model<IUser>('User', UserSchema);
