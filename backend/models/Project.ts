import mongoose from 'mongoose';


// members in the project
const memberSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  role: { 
    type: String, 
    default: 'Member' 
  }
});


const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: false,
      trim: true,
      minlength: 3,
    },
    description: {
      type: String,
      default: '',
    },
    
    members: [memberSchema], 

    deadline:    { type: Date },
    zoom_link:   { type: String },
    
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
  }
);

// Virtual Populate - Automatically find rooms linked to this project
projectSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'project'
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
