import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  /** Denormalised `${firstName} ${lastName}` — kept for emails and legacy records. */
  name: string;
  email: string;
  phone?: string;
  password: string;
  savedWatches: Types.ObjectId[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
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

export const User = model<IUser>('User', UserSchema);
