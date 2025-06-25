import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.EXPO_PUBLIC_DATABASE_URL}`);
    const body = await request.json();

    // Handle user.created event from Clerk
    if (body.type === "user.created") {
      const { id, first_name, last_name, email_addresses, username } =
        body.data;

      // Get primary email
      const primaryEmail = email_addresses.find(
        (email: any) => email.id === body.data.primary_email_address_id
      );

      if (!primaryEmail) {
        console.error("No primary email found for user");
        return Response.json(
          { error: "No primary email found" },
          { status: 400 }
        );
      }

      // Generate username if not provided
      const finalUsername =
        username || primaryEmail.email_address.split("@")[0];

      // Insert user into database
      const response = await sql`
        INSERT INTO users (
          firstname,
          lastname,
          username, 
          email, 
          clerk_id
        ) 
        VALUES (
          ${first_name || ""},
          ${last_name || ""},
          ${finalUsername}, 
          ${primaryEmail.email_address},
          ${id}
        )
        ON CONFLICT (clerk_id) DO NOTHING;`;

      console.log("User created via webhook:", response);
      return Response.json({ success: true });
    }

    return Response.json({ message: "Event not handled" });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
