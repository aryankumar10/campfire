import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: { 
      type: String,
      required: true ,
      unique: true
    },
    
    // Optional Project Mapping
    // If this is null, it's a "Standalone Room" (Global chat)
    // If it has an ID, it belongs to that specific project
    project: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Project',
      required: false ,
      default: null
    },

    // Access Control
    // If this array is empty, it means "Public to everyone in the project/context"
    // If it has User IDs, ONLY those users can join
    allowed_members: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }],
  }, 
  { 
    timestamps: true 
  }
);

const Room = mongoose.model('Room', roomSchema);

export default Room;