import User from '../models/User.js';

// Search users by query (username or name)
export const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    const regex = new RegExp(q, 'i');
    const users = await User.find({ $or: [{ username: regex }, { name: regex }] }).limit(10).select('username name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default { searchUsers };
