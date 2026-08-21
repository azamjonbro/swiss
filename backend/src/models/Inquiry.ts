import { Schema, model, Document, Types } from 'mongoose';

export interface IInquiry extends Document {
  name: string;
  phone: string;
  email: string;
  watch?: Types.ObjectId;
  message: string;
  status: 'new' | 'contacted' | 'completed' | 'cancelled';
  createdAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    watch: { type: Schema.Types.ObjectId, ref: 'Watch' },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'completed', 'cancelled'],
      default: 'new',
    },
  },
  { timestamps: true },
);

export const Inquiry = model<IInquiry>('Inquiry', InquirySchema);
