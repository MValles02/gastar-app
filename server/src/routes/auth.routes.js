import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import prisma from '../utils/prisma.js';
import { generateToken, setTokenCookie } from '../utils/token.js';
import { hashResetToken } from '../utils/reset-token.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, updateProfileSchema } from '../validators/auth.validators.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { buildGoogleAuthUrl, exchangeCodeForProfile } from '../services/google-auth.service.js';

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: 'Salario', icon: 'banknote' },
  { name: 'Freelance', icon: 'laptop' },
  { name: 'Inversiones', icon: 'trending-up' },
  { name: 'Otros ingresos', icon: 'plus-circle' },
  { name: 'Comida', icon: 'utensils' },
  { name: 'Transporte', icon: 'car' },
  { name: 'Alquiler', icon: 'home' },
  { name: 'Entretenimiento', icon: 'gamepad-2' },
  { name: 'Salud', icon: 'heart-pulse' },
  { name: 'Educación', icon: 'graduation-cap' },
  { name: 'Ropa', icon: 'shirt' },
  { name: 'Servicios', icon: 'zap' },
  { name: 'Otros gastos', icon: 'minus-circle' },
];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intentá de nuevo más tarde.' },
});

const userPublicSelect = { id: true, email: true, name: true, cotizacionPreference: true };

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: userPublicSelect,
    });

    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user.id })),
    });

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    res.status(201).json({ data: { user } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    res.json({ data: { user: { id: user.id, email: user.email, name: user.name, cotizacionPreference: user.cotizacionPreference } } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: userPublicSelect,
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: userPublicSelect,
    });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/me
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    res.cookie('token', '', { httpOnly: true, maxAge: 0, path: '/' });
    res.json({ data: { message: 'Cuenta eliminada' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.cookie('token', '', { httpOnly: true, maxAge: 0, path: '/' });
  res.json({ data: { message: 'Sesión cerrada' } });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.passwordHash) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: hashResetToken(resetToken), resetTokenExpiry },
      });

      await sendPasswordResetEmail(email, resetToken);
    }

    res.json({ data: { message: 'Si el correo existe, se envió un enlace de recuperación' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const hashedToken = hashResetToken(token);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    res.json({ data: { message: 'Contraseña actualizada correctamente' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google
router.get('/google', (_req, res) => {
  const url = buildGoogleAuthUrl();
  res.redirect(url);
});

// GET /api/auth/google/callback
router.get('/google/callback', authLimiter, async (req, res) => {
  const appUrl = process.env.APP_URL || '';
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${appUrl}/login?authError=access_denied`);
  }

  try {
    const profile = await exchangeCodeForProfile(code);

    let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email: profile.email } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { googleId: profile.googleId },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
          },
        });
      }
    }

    const token = generateToken(user.id);
    setTokenCookie(res, token);
    res.redirect(`${appUrl}/`);
  } catch (err) {
    const errorCode = err.code === 'EMAIL_NOT_VERIFIED' ? 'email_not_verified' : 'server_error';
    res.redirect(`${appUrl}/login?authError=${errorCode}`);
  }
});

export default router;
