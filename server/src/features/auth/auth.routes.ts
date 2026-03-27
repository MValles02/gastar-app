import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { generateToken, setTokenCookie } from '../../shared/utils/token.js';
import { hashResetToken } from '../../shared/utils/reset-token.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.validators.js';
import { sendPasswordResetEmail } from './email.service.js';
import { buildGoogleAuthUrl, exchangeCodeForProfile } from './google-auth.service.js';
import {
  findUserByEmail,
  findUserById,
  createUser,
  validatePassword,
  updateUser,
  deleteUser,
  setResetToken,
  findUserByResetToken,
  resetPassword,
  findOrCreateGoogleUser,
} from './auth.service.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intentá de nuevo más tarde.' },
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await findUserByEmail(data.email);
    if (existing) {
      res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' });
      return;
    }

    const user = await createUser({ name: data.name, email: data.email, password: data.password });

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

    const user = await findUserByEmail(data.email);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const valid = await validatePassword(user, data.password);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          cotizacionPreference: user.cotizacionPreference,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
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
    const user = await updateUser(req.userId, data);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/me
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    await deleteUser(req.userId);
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

    const user = await findUserByEmail(email);
    if (user && user.passwordHash) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await setResetToken(email, hashResetToken(resetToken), resetTokenExpiry);
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

    const user = await findUserByResetToken(hashedToken);
    if (!user) {
      res.status(400).json({ error: 'Token inválido o expirado' });
      return;
    }

    await resetPassword(user.id, password);

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
    res.redirect(`${appUrl}/login?authError=access_denied`);
    return;
  }

  try {
    const profile = await exchangeCodeForProfile(code as string);

    const user = await findOrCreateGoogleUser({
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
    });

    const token = generateToken(user.id);
    setTokenCookie(res, token);
    res.redirect(`${appUrl}/`);
  } catch (err) {
    const errorCode =
      err instanceof Error && (err as Error & { code?: string }).code === 'EMAIL_NOT_VERIFIED'
        ? 'email_not_verified'
        : 'server_error';
    res.redirect(`${appUrl}/login?authError=${errorCode}`);
  }
});

export default router;
