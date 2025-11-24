/*
  Correção da migration anterior:

  - Mantém adminId e time como opcionais para permitir adicionar sem quebrar dados existentes.
  - Remove somente createdAt da tabela Cat.
  - Mantém alterações de role com default 'user'.
*/

-- AlterTable: Cat
ALTER TABLE "Cat"
  DROP COLUMN "createdAt",
  ALTER COLUMN "age" DROP NOT NULL;

-- AlterTable: Service
ALTER TABLE "Service"
  ADD COLUMN "adminId" INTEGER,
  ADD COLUMN "time" TEXT;

-- AlterTable: User
ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'user';

-- Foreign Key
ALTER TABLE "Service"
  ADD CONSTRAINT "Service_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
