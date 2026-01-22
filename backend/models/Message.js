import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  project: { 
    type: mongoose.Schema.Types.ObjectId, ref: 'Project', 
    required: true 
  },
  room_id: { 
    type: mongoose.Schema.Types.ObjectId, ref: 'Room', 
    required: true 
  },
  sender:  { 
    type: mongoose.Schema.Types.ObjectId, ref: 'User', 
    required: true 
  },
  
  content: { 
    type: String, 
    required: true 
  },
  attachment: { 
    type: String, 
    default: null
  }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;