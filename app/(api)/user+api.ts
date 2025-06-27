import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.EXPO_PUBLIC_DATABASE_URL}`);
    const {
      firstname,
      lastname,
      username,
      email,
      clerkId,
      date_of_birth,
      gender,
    } = await request.json();

    if (
      !firstname ||
      !lastname ||
      !username ||
      !email ||
      !clerkId ||
      !date_of_birth ||
      !gender
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await sql`
      INSERT INTO users (
        firstname,
        lastname,
        username, 
        email, 
        clerk_id,
        date_of_birth,
        gender
      ) 
      VALUES (
        ${firstname},
        ${lastname},
        ${username}, 
        ${email},
        ${clerkId},
        ${date_of_birth},
        ${gender}
      )
      ON CONFLICT (clerk_id) DO NOTHING;`;

    return new Response(JSON.stringify({ data: response }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
