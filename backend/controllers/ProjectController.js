import Project from '../models/Project.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

export const createProject = async (req, res) => {
  try {
    const { title, description } = req.body;
    const newProject = new Project({
      title,
      description,
      created_by: req.user.id,
      members: [{ user: req.user.id, role: 'Owner' }]
    });
    const savedProject = await newProject.save();
    res.status(201).json(savedProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user.id }).populate('members.user', 'username name');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'username name')
      .populate({
        path: 'rooms',
        model: 'Room',
        populate: {
          path: 'allowed_members',
          model: 'User',
          select: 'username name'
        }
      });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createRoomInProject = async (req, res) => {
  try {
    const { name } = req.body;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Check if user is a member of the project
    const isMember = project.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Unauthorized' });

    const newRoom = new Room({
      name,
      project: projectId
    });
    const savedRoom = await newRoom.save();
    res.status(201).json(savedRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update project details (only Owner or project creator)
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Only owner can update
    const isOwner = project.created_by && project.created_by.toString() === req.user.id;
    if (!isOwner) return res.status(403).json({ message: 'Unauthorized' });

    const { title, description, deadline, zoom_link } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (deadline !== undefined) project.deadline = deadline;
    if (zoom_link !== undefined) project.zoom_link = zoom_link;

    const updated = await project.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a project and its associated rooms/messages (only Owner)
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.created_by && project.created_by.toString() === req.user.id;
    if (!isOwner) return res.status(403).json({ message: 'Unauthorized' });

    // Remove related rooms and messages
    await Room.deleteMany({ project: project._id });
    await Message.deleteMany({ project: project._id });

    await project.remove();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a member to a project (only Owner)
export const addMember = async (req, res) => {
  try {
    const { id } = req.params; // project id
    const { userId, role } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.created_by && project.created_by.toString() === req.user.id;
    if (!isOwner) return res.status(403).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const already = project.members.some(m => m.user.toString() === userId);
    if (already) return res.status(400).json({ message: 'User already a member' });

    project.members.push({ user: userId, role: role || 'Member' });
    await project.save();
    const populated = await Project.findById(id).populate('members.user', 'username name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove a member from a project (Owner or self)
export const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params; // project id, member user id
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.created_by && project.created_by.toString() === req.user.id;
    const isSelf = req.user.id === memberId;
    if (!isOwner && !isSelf) return res.status(403).json({ message: 'Unauthorized' });

    project.members = project.members.filter(m => m.user.toString() !== memberId);
    await project.save();
    const populated = await Project.findById(id).populate('members.user', 'username name');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

  // Add allowed member to a room (only project Owner)
  export const addRoomAllowedMember = async (req, res) => {
    try {
      const { projectId, roomId } = req.params;
      const { userId } = req.body;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      const isOwner = project.created_by && project.created_by.toString() === req.user.id;
      if (!isOwner) return res.status(403).json({ message: 'Unauthorized' });

      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ message: 'Room not found' });

      if (room.project && room.project.toString() !== projectId) return res.status(400).json({ message: 'Room does not belong to project' });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const already = room.allowed_members.some(id => id.toString() === userId);
      if (already) return res.status(400).json({ message: 'User already allowed' });

      room.allowed_members.push(userId);
      await room.save();
      res.status(201).json(room);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // Remove allowed member from a room (only project Owner)
  export const removeRoomAllowedMember = async (req, res) => {
    try {
      const { projectId, roomId, userId } = req.params;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      const isOwner = project.created_by && project.created_by.toString() === req.user.id;
      if (!isOwner) return res.status(403).json({ message: 'Unauthorized' });

      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ message: 'Room not found' });

      room.allowed_members = room.allowed_members.filter(id => id.toString() !== userId);
      await room.save();
      res.json(room);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
