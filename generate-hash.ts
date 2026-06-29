import bcrypt from "bcryptjs";

async function main() {
  const password = process.argv[2] || process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("Usage: tsx generate-hash.ts <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const isValid = await bcrypt.compare(password, hash);

  console.log(hash);
  console.log("Verification:", isValid);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
