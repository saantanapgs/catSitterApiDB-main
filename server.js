const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

/* =============================
      MIDDLEWARE DE AUTENTICAÇÃO
============================= */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token ausente." });

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

/* =============================
      REGISTRO DE USUÁRIO
============================= */
app.post("/register", async (req, res) => {
  const { name, email, phone, birthday, password, cats } = req.body;

  if (!name || !email || !phone || !birthday || !password) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "E-mail já cadastrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        birthday: new Date(birthday),
        password: hashedPassword,
        cats: {
          create: Array.isArray(cats)
            ? cats.map((cat) => ({
                name: cat.name,
                age: cat.age || 0,
                needs: cat.needs ?? null,
              }))
            : [],
        },
      },
      include: { cats: true },
    });

    res.status(201).json({
      message: "Usuário registrado com sucesso!",
      user,
    });
  } catch (err) {
    console.error("Erro no registro:", err);
    res.status(500).json({ error: "Erro ao registrar o usuário." });
  }
});

/* =============================
              LOGIN
============================= */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Usuário não encontrado." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Senha incorreta." });

    const token = jwt.sign(
      { userId: user.id, role: user.role || "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao fazer login." });
  }
});

/* =============================
        PERFIL DO USUÁRIO
============================= */
app.get("/me", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthday: true,
        role: true,
        cats: true,
      },
    });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Token inválido ou expirado." });
  }
});


/* =============================
    1. BUSCAR PERFIL DO ADMIN
============================= */
app.get("/admin/me", auth, async (req, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    if (!admin) return res.status(404).json({ error: "Admin não encontrado." });

    res.json(admin);
  } catch {
    res.status(500).json({ error: "Erro ao buscar dados do admin." });
  }
});

/* =============================
    2. ATUALIZAR DADOS BÁSICOS
============================= */
app.put("/admin/update", auth, async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, email, phone },
    });

    res.json({ message: "Dados atualizados!", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar dados." });
  }
});

/* =============================
    3. ALTERAR SENHA DO ADMIN
============================= */
app.put("/admin/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const admin = await prisma.user.findUnique({ where: { id: req.user.userId } });

    if (!admin) return res.status(404).json({ error: "Admin não encontrado." });

    const valid = await bcrypt.compare(oldPassword, admin.password);
    if (!valid) return res.status(400).json({ error: "Senha atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashed },
    });

    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Erro ao alterar senha:", err);
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
});


/* =============================
      ALTERAR SENHA DO USUÁRIO
============================= */
app.put("/user/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid)
      return res.status(400).json({ error: "Senha atual incorreta." });

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
});


/* =============================
      ATUALIZAR DADOS DO USUÁRIO
============================= */
app.put("/user/update", auth, async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, email, phone },
    });

    res.json({ message: "Dados do usuário atualizados!", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar dados do usuário." });
  }
});


/* =============================
      CRIAR NOVO SERVIÇO 
============================= */
app.post("/services", async (req, res) => {
  const { userId, adminId, petName, serviceType, date, time, notes, price } = req.body;

  if (!userId || !adminId || !serviceType || !petName || !date || !time) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  try {
    const sameDateTime = await prisma.service.findFirst({
      where: {
        date: new Date(date),
        time: time
      }
    });
    if (sameDateTime) {
      return res.status(409).json({
        error: "Já existe um serviço marcado neste dia e horário. Escolha outro horário."
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) return res.status(404).json({ error: "Admin (cuidadora) não encontrada." });

    const service = await prisma.service.create({
      data: {
        userId,
        adminId,
        petName,
        serviceType,
        date: new Date(date),
        time,
        notes: notes || "",
        price: Number(price) || 0,
      },
    });

    res.status(201).json(service);

  } catch (err) {
    console.error("Erro ao criar serviço:", err);
    res.status(500).json({ error: "Erro ao criar serviço." });
  }
});


/* =============================
      LISTAR TODOS (ADMIN)
============================= */
app.get("/services", async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        admin: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar serviços." });
  }
});

/* =============================
      LISTAR SERVIÇOS DO CLIENTE
============================= */
app.get("/services/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const services = await prisma.service.findMany({
      where: { userId: Number(userId) },
      include: { admin: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar serviços do usuário." });
  }
});

/* =============================
   LISTAR SERVIÇOS DA CUIDADORA
============================= */
app.get("/services/admin/:adminId", async (req, res) => {
  const { adminId } = req.params;

  try {
    const services = await prisma.service.findMany({
      where: { adminId: Number(adminId) },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar serviços da administradora." });
  }
});

/* =============================
      MARCAR SERVIÇO COMO CONCLUÍDO
============================= */
app.patch("/services/:id/concluir", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: { status: "concluido" }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao concluir serviço." });
  }
});

/* =============================
      LISTAR TODOS OS USUÁRIOS
============================= */
app.get("/users", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem acessar." });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthday: true,
        role: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Token inválido ou expirado." });
  }
});

/* =============================
        INICIAR SERVIDOR
============================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
