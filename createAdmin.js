const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcrypt")

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@email.com" },
  })

  if (existing) {
    console.log("Admin já existe.")
    return
  }

  const hashedPassword = await bcrypt.hash("luizaadmin123", 10)

  const user = await prisma.user.create({
    data: {
      name: "Luiza",
      email: "petsitterluiza@gmail.com",
      phone: "79992340123",
      birthday: new Date("1996-11-04"),
      password: hashedPassword,
      role: "admin",
    },
  })

  console.log("Usuário admin criado:", user)
}

main()
  .then(() => {
    console.log("Finalizado com sucesso.")
    process.exit(0)
  })
  .catch((e) => {
    console.error("Erro ao criar admin:", e)
    process.exit(1)
  })
