import { config } from "dotenv";
config({ path: ".env.local" });

import readline from "node:readline/promises";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";

// Parse CLI flags: --email=... --password=... --name=...
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: { email?: string; password?: string; name?: string } = {};

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      parsed.email = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--password=")) {
      parsed.password = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--name=")) {
      parsed.name = arg.split("=")[1]?.trim();
    }
  }

  return parsed;
}

async function main() {
  console.log("\n🛡️  Oris EMR - Super Admin Credentials Manager\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const cliArgs = parseArgs();

    // Find existing Super Admin
    const [existingAdmin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "SUPER_ADMIN"))
      .limit(1);

    if (existingAdmin) {
      console.log(`Current Super Admin Account in Database:`);
      console.log(`- ID:    ${existingAdmin.id}`);
      console.log(`- Name:  ${existingAdmin.name}`);
      console.log(`- Email: ${existingAdmin.email}\n`);
    } else {
      console.log("⚠️  No Super Admin account found in database. A new Super Admin will be created.\n");
    }

    // Determine Email
    let newEmail = cliArgs.email;
    if (!newEmail) {
      const defaultEmail = existingAdmin ? existingAdmin.email : "admin@orisemr.com";
      const answer = (await rl.question(`Enter new email (leave blank to keep '${defaultEmail}'): `)).trim();
      newEmail = answer || defaultEmail;
    }

    // Determine Name
    let newName = cliArgs.name;
    if (!newName) {
      const defaultName = existingAdmin ? existingAdmin.name : "Platform Super Admin";
      const answer = (await rl.question(`Enter name (leave blank to keep '${defaultName}'): `)).trim();
      newName = answer || defaultName;
    }

    // Determine Password
    let newPassword = cliArgs.password;
    if (!newPassword) {
      newPassword = (await rl.question(
        `Enter new secure password (min 8 chars${existingAdmin ? ", leave blank to keep unchanged" : ""}): `
      )).trim();
    }

    if (newPassword && newPassword.length < 8) {
      console.error("\n❌ Error: Password must be at least 8 characters long.");
      rl.close();
      process.exit(1);
    }

    if (existingAdmin) {
      // 1. Update user record
      await db
        .update(schema.users)
        .set({
          email: newEmail.toLowerCase().trim(),
          name: newName.trim(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existingAdmin.id));

      // 2. Update password hash if provided
      if (newPassword) {
        const hashedPassword = await hashPassword(newPassword);

        // Check if credential account exists
        const [existingAccount] = await db
          .select()
          .from(schema.accounts)
          .where(eq(schema.accounts.userId, existingAdmin.id))
          .limit(1);

        if (existingAccount) {
          await db
            .update(schema.accounts)
            .set({
              password: hashedPassword,
              updatedAt: new Date(),
            })
            .where(eq(schema.accounts.id, existingAccount.id));
        } else {
          await db.insert(schema.accounts).values({
            id: crypto.randomUUID(),
            userId: existingAdmin.id,
            accountId: existingAdmin.id,
            providerId: "credential",
            password: hashedPassword,
          });
        }
        console.log("🔒 Password securely re-hashed and updated in database.");
      }

      console.log("\n✅ Super Admin account updated successfully!");
      console.log(`- Login Email: ${newEmail.toLowerCase().trim()}`);
      console.log(`- Name:        ${newName.trim()}`);
      if (newPassword) {
        console.log(`- Password:    Updated successfully`);
      } else {
        console.log(`- Password:    Unchanged`);
      }
    } else {
      // Bootstrap brand new Super Admin
      if (!newPassword) {
        console.error("\n❌ Error: Password is required to create a new Super Admin account.");
        rl.close();
        process.exit(1);
      }

      const authResult = await auth.api.signUpEmail({
        body: {
          name: newName.trim(),
          email: newEmail.toLowerCase().trim(),
          password: newPassword,
        },
      });

      if (authResult?.user) {
        await db
          .update(schema.users)
          .set({
            role: "SUPER_ADMIN",
            tenantId: null,
            status: "active",
            emailVerified: true,
          })
          .where(eq(schema.users.id, authResult.user.id));

        console.log("\n✅ Initial Super Admin created successfully!");
        console.log(`- Login Email: ${newEmail.toLowerCase().trim()}`);
        console.log(`- Name:        ${newName.trim()}`);
      }
    }

    console.log("\nYou can now sign in at /login with these credentials.\n");
  } finally {
    rl.close();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Failed to update Super Admin:", err);
  process.exit(1);
});
