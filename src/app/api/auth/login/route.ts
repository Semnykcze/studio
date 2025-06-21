
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyUserPassword } from '@/lib/db';

const loginSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { username, password } = validation.data;

    const user = await verifyUserPassword(username, password);

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    // In a real app, you would generate a JWT or session cookie here.
    // For now, we just return the user data (without the password hash).
    const { passwordHash, ...userResponse } = user;

    return NextResponse.json({ message: 'Login successful!', user: userResponse });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
