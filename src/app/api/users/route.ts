/* eslint-disable @typescript-eslint/no-unused-vars */
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';
import { Db, ObjectId, type Document, type Filter, type Sort } from 'mongodb';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth-token';
import { connectToDatabase } from '@/db/client';


interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface User {
  _id?: string | ObjectId;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'staff';
  isActive: boolean;
  isAdmin?: number;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isDefault?: boolean;
  }>;
  password?: string;
  emailVerified: boolean;
  lastLogin?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserWithStats extends User {
  orderStats?: {
    totalOrders: number;
    totalSpent: number;
    lastOrderDate?: string;
    averageOrderValue: number;
  };
}

interface PendingRegistration {
  _id?: ObjectId;
  verificationId: string;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_PAGE_LIMIT =
  Number(process.env.USERS_PAGE_LIMIT) && Number(process.env.USERS_PAGE_LIMIT) > 0
    ? Number(process.env.USERS_PAGE_LIMIT)
    : 10;
const MAX_PAGE_LIMIT =
  Number(process.env.USERS_MAX_LIMIT) && Number(process.env.USERS_MAX_LIMIT) > 0
    ? Number(process.env.USERS_MAX_LIMIT)
    : 50;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const VERIFICATION_MAX_ATTEMPTS = 5;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionRecord {
  _id: ObjectId;
  token: string;
  userId: ObjectId | string;
  expiresAt?: Date;
}

async function getSessionUser(req: NextRequest, db: Db) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);
  if (!payload?.sessionToken) {
    return null;
  }

  const session = await db
    .collection<SessionRecord>("sessions")
    .findOne({ token: payload.sessionToken });

  if (!session) {
    return null;
  }

  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await db.collection("sessions").deleteOne({ _id: session._id });
    return null;
  }

  const userId =
    typeof session.userId === "string" ? new ObjectId(session.userId) : session.userId;
  const user = await db.collection<User>("users").findOne({ _id: userId });
  return user;
}

async function requireAdmin(req: NextRequest, db: Db) {
  const user = await getSessionUser(req, db);
  if (!user || !user.isAdmin) {
    return null;
  }
  return user;
}

let emailTransporter: nodemailer.Transporter | null = null;

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(0, 15);
}

function validateRegistrationInput({
  name,
  email,
  password,
  phone
}: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): string | null {
  if (!name || !name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 3) {
    return 'Name must be at least 3 characters long';
  }
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.trim())) {
    return 'Please provide a valid email address';
  }
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (phone) {
    const numericPhone = phone.replace(/\D/g, '');
    if (numericPhone && numericPhone.length < 10) {
      return 'Phone number must include at least 10 digits';
    }
  }
  return null;
}

async function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT) || 587;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('Email server credentials are not configured');
  }

  emailTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  return emailTransporter;
}

async function sendVerificationEmail({
  recipient,
  name,
  code
}: {
  recipient: string;
  name: string;
  code: string;
}) {
  const transporter = await getEmailTransporter();
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER;

  await transporter.sendMail({
    from: fromAddress,
    to: recipient,
    subject: 'Your Robe By ShamShad verification code',
    text: `Hi ${name},

Your verification code is ${code}. It expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.

If you did not request this, please ignore this email.`,
    html: `<p>Hi ${name},</p>
<p>Your verification code is <strong style="font-size:18px;">${code}</strong>.</p>
<p>This code expires in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes. If you did not request this, you can safely ignore this email.</p>`
  });
}

// Calculate user order statistics
async function calculateUserOrderStats(db: Db, userId: string | ObjectId): Promise<{
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  averageOrderValue: number;
}> {
  try {
    const orders = await db.collection('orders').find({
      userId: typeof userId === 'string' ? new ObjectId(userId) : userId
    }).sort({ createdAt: -1 }).toArray();

    if (orders.length === 0) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
      };
    }

    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const lastOrderDate = orders[0]?.createdAt;
    const averageOrderValue = totalSpent / orders.length;

    return {
      totalOrders: orders.length,
      totalSpent,
      lastOrderDate,
      averageOrderValue
    };
  } catch (error) {
    console.error('Error calculating user order stats:', error);
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0
    };
  }
}

// Update user statistics for all users
async function updateUserStatistics(db: Db, userIds?: ObjectId[]) {
  try {
    const users = userIds 
      ? await db.collection('users').find({ _id: { $in: userIds } }).toArray()
      : await db.collection('users').find().toArray();

    for (const user of users) {
      const stats = await calculateUserOrderStats(db, user._id);
      
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            totalOrders: stats.totalOrders,
            totalSpent: stats.totalSpent,
            lastOrderDate: stats.lastOrderDate,
            updatedAt: new Date().toISOString()
          }
        }
      );
    }
  } catch (error) {
    console.error('Error updating user statistics:', error);
    throw error;
  }
}

// GET all users with pagination, search, and filtering
export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const adminUser = await requireAdmin(req, db);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const requestedLimit = searchParams.get('limit');
    const parsedLimit = requestedLimit ? parseInt(requestedLimit, 10) : NaN;
    const limit =
      Number.isNaN(parsedLimit) || parsedLimit <= 0
        ? DEFAULT_PAGE_LIMIT
        : Math.min(parsedLimit, MAX_PAGE_LIMIT);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery: Filter<Document> = {};
    
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      searchQuery.role = role;
    }
    
    if (isActive !== null && isActive !== undefined) {
      searchQuery.isActive = isActive === 'true';
    }

    // Build sort object
    const sortOptions: Sort = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    };

    // Get users with pagination (excluding password field)
    const users = await db
      .collection('users')
      .find(searchQuery, { projection: { password: 0 } })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Update statistics for fetched users
    const userIds = users.map(user => user._id);
    await updateUserStatistics(db, userIds);

    // Get updated users with correct statistics
    const updatedUsers = await db
      .collection('users')
      .find({ _id: { $in: userIds } }, { projection: { password: 0 } })
      .toArray();

    // Format users for response
    const formattedUsers = updatedUsers.map(user => ({
      ...user,
      // Ensure address field exists
      address: user.addresses && user.addresses.length > 0 ? user.addresses[0] : undefined
    }));

    // Get total count for pagination
    const totalCount = await db.collection('users').countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      users: formattedUsers,
      totalPages,
      currentPage: page,
      totalCount,
      pageLimit: limit
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST register new user (with email verification)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawStep = typeof body?.step === 'string' ? body.step.toLowerCase() : 'start';

    if (rawStep === 'verify') {
      return await handleVerificationStep(body);
    }

    return await handleRegistrationStart(body);
  } catch (error) {
    console.error('Failed to process registration:', error);
    return NextResponse.json(
      { error: 'Failed to process registration request' },
      { status: 500 }
    );
  }
}

async function handleRegistrationStart(body: Record<string, unknown>) {
  const name = typeof body?.name === 'string' ? body.name : '';
  const email = typeof body?.email === 'string' ? body.email : '';
  const phone = typeof body?.phone === 'string' ? body.phone : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const validationError = validateRegistrationInput({ name, email, password, phone });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const db = await connectToDatabase();
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
  if (existingUser) {
    return NextResponse.json(
      { error: 'A user with this email already exists' },
      { status: 409 }
    );
  }

  const verificationCollection = db.collection<PendingRegistration>('emailVerifications');
  const verificationCode = generateVerificationCode();
  const verificationId = new ObjectId().toHexString();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);
  const now = new Date();

  await verificationCollection.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        verificationId,
        codeHash: hashVerificationCode(verificationCode),
        attempts: 0,
        expiresAt,
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizePhone(phone),
          password
        },
        updatedAt: now
      },
      $setOnInsert: {
        email: normalizedEmail,
        createdAt: now
      }
    },
    { upsert: true }
  );

  await sendVerificationEmail({
    recipient: normalizedEmail,
    name: name.trim(),
    code: verificationCode
  });

  return NextResponse.json({
    message: 'Verification code sent to your email address',
    verificationId
  });
}

async function handleVerificationStep(body: Record<string, unknown>) {
  const verificationId = typeof body?.verificationId === 'string' ? body.verificationId : '';
  const codeRaw = body?.code;
  const code = typeof codeRaw === 'string' || typeof codeRaw === 'number'
    ? String(codeRaw)
    : '';
  const sanitizedCode = code.replace(/\D/g, '').slice(0, 6);

  if (!verificationId || !sanitizedCode || sanitizedCode.length !== 6) {
    return NextResponse.json(
      { error: 'A valid verification code is required' },
      { status: 400 }
    );
  }

  const db = await connectToDatabase();
  const verificationCollection = db.collection<PendingRegistration>('emailVerifications');
  const pendingRecord = await verificationCollection.findOne({ verificationId });

  if (!pendingRecord) {
    return NextResponse.json(
      { error: 'Invalid or expired verification request' },
      { status: 400 }
    );
  }

  if (pendingRecord.expiresAt.getTime() < Date.now()) {
    await verificationCollection.deleteOne({ _id: pendingRecord._id });
    return NextResponse.json(
      { error: 'Verification code has expired. Please restart registration.' },
      { status: 410 }
    );
  }

  const hashedCode = hashVerificationCode(sanitizedCode);
  if (hashedCode !== pendingRecord.codeHash) {
    const attempted = (pendingRecord.attempts ?? 0) + 1;
    if (attempted >= VERIFICATION_MAX_ATTEMPTS) {
      await verificationCollection.deleteOne({ _id: pendingRecord._id });
      return NextResponse.json(
        { error: 'Too many invalid attempts. Please restart registration.' },
        { status: 429 }
      );
    }

    await verificationCollection.updateOne(
      { _id: pendingRecord._id },
      { $set: { attempts: attempted } }
    );

    return NextResponse.json(
      { error: 'Invalid verification code. Please try again.' },
      { status: 400 }
    );
  }

  const normalizedEmail = normalizeEmail(pendingRecord.data.email);
  const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
  if (existingUser) {
    await verificationCollection.deleteOne({ _id: pendingRecord._id });
    return NextResponse.json(
      { error: 'A user with this email already exists' },
      { status: 409 }
    );
  }

  const timestamp = new Date().toISOString();
  const user: Omit<User, '_id'> = {
    name: pendingRecord.data.name,
    email: normalizedEmail,
    phone: pendingRecord.data.phone || '',
    avatar: '',
    role: 'customer',
    isAdmin: 0,
    isActive: true,
    addresses: [],
    password: pendingRecord.data.password,
    emailVerified: true,
    totalOrders: 0,
    totalSpent: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLogin: timestamp
  };

  const insertResult = await db.collection('users').insertOne(user);
  await verificationCollection.deleteOne({ _id: pendingRecord._id });

  const { password: _password, ...userWithoutPassword } = user;
  const responsePayload = {
    ...userWithoutPassword,
    _id: insertResult.insertedId.toString()
  };

  return NextResponse.json(
    {
      message: 'Registration completed successfully',
      user: responsePayload
    },
    { status: 201 }
  );
}

// PUT update user (admin only)
export async function PUT(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const adminUser = await requireAdmin(req, db);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const {
      name,
      email,
      phone,
      role,
      isActive,
      avatar,
      addresses
    } = body;
    
    if (!name && !email && !phone && !role && isActive === undefined && !avatar && !addresses) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    // Find the user
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Partial<User> & { updatedAt: string } = {
      updatedAt: new Date().toISOString()
    };
    
    if (name && name.trim() !== existingUser.name) {
      updateData.name = name.trim();
    }
    
    if (email && email.trim() !== existingUser.email) {
      // Check if new email already exists
      const duplicateUser = await db.collection('users').findOne({
        $and: [
          { _id: { $ne: new ObjectId(userId) } },
          { email: email.trim().toLowerCase() }
        ]
      });
      
      if (duplicateUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      
      updateData.email = email.trim().toLowerCase();
      updateData.emailVerified = false; // Require re-verification for email change
    }
    
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || '';
    }
    
    if (role && role !== existingUser.role) {
      const validRoles = ['admin', 'customer', 'staff'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role specified' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }
    
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }
    
    if (addresses !== undefined) {
      updateData.addresses = addresses;
    }

    // Update the user
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update statistics for this user
    await updateUserStatistics(db, [new ObjectId(userId)]);

    // Fetch updated user (excluding password)
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE user (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const adminUser = await requireAdmin(req, db);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find the user first
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has any orders
    const orderCount = await db.collection('orders').countDocuments({
      userId: new ObjectId(userId)
    });
    
    if (orderCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with associated orders',
          orderCount
        },
        { status: 400 }
      );
    }

    // Delete the user
    const result = await db.collection('users').deleteOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

