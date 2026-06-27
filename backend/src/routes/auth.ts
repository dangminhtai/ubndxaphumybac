import { Router, Request, Response } from 'express';
import User from '../models/User';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username: string; password: string };

    if (!username || !password) {
      res.status(400).json({ error: 'Username và password là bắt buộc' });
      return;
    }

    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({
        username,
        passwordHash: 'mock_hash',
        fullName: 'Nguyễn Văn A',
        role: 'admin',
        department: 'UBND Cấp Xã'
      });
    }

    res.json({
      token: 'mock_jwt_token',
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({ error: message });
  }
});

export default router;
