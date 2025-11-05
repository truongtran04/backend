import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient()
async function main() {

    const saltOrRounds = 10;

    const user = await prisma.user.create({
        data: {
            email: 'admin@gmail.com',
            password_hash: await bcrypt.hash('12345678', saltOrRounds),
            role: "admin"
        }
    })
    console.log({ user })
}
main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })