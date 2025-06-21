
import { JSONFilePreset } from 'lowdb/node';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import path from 'path';

// Define the structure for a single history item
export interface HistoryItem {
  id: string;
  timestamp: string;
  action: string; // e.g., 'PROMPT_GENERATED', 'IMAGE_GENERATED'
  details: string; // e.g., the prompt itself or image URL
  cost: number;
}

// Define the structure for a user
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  credits: number;
  isPremium: boolean;
  isAdmin: boolean;
  history: HistoryItem[];
  createdAt: string;
}

// Define the overall database schema
export interface DbSchema {
  users: User[];
}

const defaultData: DbSchema = { users: [] };

// Path to the JSON file. Using process.cwd() ensures the path is relative to the project root.
const dbFilePath = path.join(process.cwd(), 'db.json');

// Initialize the database with default data if the file doesn't exist.
async function getDb() {
    // Note: In a serverless environment, this file might be read-only or ephemeral.
    // Writes might not persist across deployments or server restarts.
    return await JSONFilePreset<DbSchema>(dbFilePath, defaultData);
}

// --- User Management Functions ---

/**
 * Finds a user by their username.
 * @param username - The username to search for.
 * @returns The user object if found, otherwise undefined.
 */
export async function findUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  return db.data.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

/**
 * Creates a new user and saves them to the database.
 * @param username - The new user's username.
 * @param password - The new user's plain text password.
 * @returns The newly created user object.
 */
export async function createUser(username: string, password: string): Promise<User> {
  const db = await getDb();

  if (await findUserByUsername(username)) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  
  const newUser: User = {
    id: randomUUID(),
    username,
    passwordHash,
    credits: 100, // Default credits for a new user
    isPremium: false,
    isAdmin: false,
    history: [],
    createdAt: new Date().toISOString(),
  };

  db.data.users.push(newUser);
  await db.write();

  return newUser;
}

/**
 * Verifies a user's password.
 * @param username - The user's username.
 * @param password - The password to verify.
 * @returns The user object if the password is correct, otherwise null.
 */
export async function verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await findUserByUsername(username);
    if (!user) {
        return null;
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
    return isPasswordCorrect ? user : null;
}
