import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';
const SALT_ROUNDS = 10;

// ─── Đăng ký ────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, fullName, department, role } = req.body as {
      username: string;
      password: string;
      fullName: string;
      department: string;
      role?: string;
    };

    // Validate đầu vào
    if (!username || !password || !fullName || !department) {
      res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    // Kiểm tra username đã tồn tại chưa
    const existing = await User.findOne({ username });
    if (existing) {
      res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      username,
      passwordHash,
      fullName,
      department,
      role: role || 'user',
    });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: message });
  }
});

// ─── Đăng nhập ──────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username: string; password: string };

    if (!username || !password) {
      res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      return;
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: message });
  }
});

export default router;
