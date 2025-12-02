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

  const hashedPassword = await bcrypt.hash("rebecaadmin123", 10)

  const user = await prisma.user.create({
    data: {
      name: "Rebeca",
      email: "petsitterrebeca@gmail.com",
      phone: "79987543367",
      birthday: new Date("2000-09-27"),
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
