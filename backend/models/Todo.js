import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  
  title: { 
    type: String,
    required: true 
  },
  description: { type: String },
  status:      { 
    type: String, 
    enum: ['todo', 'in-progress', 'review', 'done'], 
    default: 'todo' 
  },
  
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deadline:    { type: Date }
}, { timestamps: true });


const Todo = mongoose.model('Todo', todoSchema);

export default Todo;