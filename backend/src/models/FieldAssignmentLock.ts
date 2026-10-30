import mongoose, { Schema } from 'mongoose';
// All assignment mutations serialize on this document inside a transaction.
const schema = new Schema({ _id: String, revision: { type: Number, default: 0 } }, { versionKey: false });
export default mongoose.model('FieldAssignmentLock', schema);
