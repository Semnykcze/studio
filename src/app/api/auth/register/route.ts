
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createUser, findUserByUsername } from '@/lib/db';

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long.").max(20, "Username must be no more than 20 characters long."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { username, password } = validation.data;

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
    }

    const newUser = await createUser(username, password);

    // Omit passwordHash from the response
    const { passwordHash, ...userResponse } = newUser;

    return NextResponse.json({ message: 'User registered successfully!', user: userResponse }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    // Again, be cautious about writing to the filesystem in a serverless environment.
    if (error instanceof Error && (error.message.includes('EACCES') || error.message.includes('EROFS'))) {
        return NextResponse.json({ error: 'Database write error. The file system is likely read-only.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
