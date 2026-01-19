import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // check user exists
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // auth
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username 
      },
      process.env.JWT_SECRET || 'fallback_secret', // Add JWT_SECRET to your .env file
      { 
        expiresIn: '1d' 
      }
    );


    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name
        // email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};