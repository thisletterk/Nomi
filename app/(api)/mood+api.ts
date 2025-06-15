import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { userId, mood, label, color } = await request.json();

    if (!userId || !mood || !label || !color) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure user exists in users table
    await sql`
      INSERT INTO users (clerk_id)
      VALUES (${userId})
      ON CONFLICT (clerk_id) DO NOTHING;
    `;

    const response = await sql`
      INSERT INTO mood_entries (
        user_id, mood, label, color
      ) VALUES (
        ${userId}, ${mood}, ${label}, ${color}
      )
      RETURNING *;
    `;

    return new Response(JSON.stringify({ data: response }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error logging mood:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 });
    }

    const response = await sql`
      SELECT * FROM mood_entries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 30;
    `;

    return new Response(JSON.stringify({ data: response }), { status: 200 });
  } catch (error) {
    console.error("Error fetching mood history:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
