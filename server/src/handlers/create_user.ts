import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      // All fields are already properly typed from the database
      // total_points defaults to 0 via database default
      // created_at and updated_at are set via database defaults
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};