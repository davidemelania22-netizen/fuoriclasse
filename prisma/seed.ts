import { PrismaClient } from '@prisma/client';
import { COUNTRIES } from '@football-life/game-data';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { id: country.id },
      update: {
        code: country.code,
        name: country.name,
        reputation: country.reputation,
      },
      create: {
        id: country.id,
        code: country.code,
        name: country.name,
        reputation: country.reputation,
      },
    });
  }

  const count = await prisma.country.count();
  console.log(`Seeded ${count} countries.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
