import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? ""
  })
});

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Refusing to run demo seed in production. Set ALLOW_PRODUCTION_SEED=true only for an intentional bootstrap.");
  }

  const seedPasswords = [
    process.env.SEED_ADMIN_PASSWORD,
    process.env.SEED_EMPLOYEE_PASSWORD,
    process.env.SEED_SALES_PASSWORD,
    process.env.SEED_ENGINEER_PASSWORD
  ];
  if (seedPasswords.some((password) => !password || password.length < 12)) {
    throw new Error("Set all SEED_*_PASSWORD values to at least 12 characters before running the demo seed.");
  }

  const [adminHash, employeeHash, salesHash, engineerHash] = await Promise.all(
    seedPasswords.map((password) => bcrypt.hash(password!, 12))
  );

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: adminHash,
      name: "ผู้ดูแลระบบ",
      role: "ADMIN",
      department: "Operations"
    }
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@example.com" },
    update: {},
    create: {
      email: "employee@example.com",
      passwordHash: employeeHash,
      name: "พนักงานภาคสนาม",
      role: "EMPLOYEE",
      department: "Service"
    }
  });

  const sales = await prisma.user.upsert({
    where: { email: "sales@example.com" },
    update: {},
    create: {
      email: "sales@example.com",
      passwordHash: salesHash,
      name: "ผู้แทนขาย",
      role: "SALES",
      department: "Sales"
    }
  });

  const engineer = await prisma.user.upsert({
    where: { email: "engineer@example.com" },
    update: {},
    create: {
      email: "engineer@example.com",
      passwordHash: engineerHash,
      name: "วิศวกรสำรวจ",
      role: "ENGINEER",
      department: "Engineering"
    }
  });

  await prisma.reimbursementRate.upsert({
    where: { id: "default-rate" },
    update: {
      ratePerKm: 1.5,
      kmPerLiter: 12,
      fuelPricePerLiter: 36,
      active: true
    },
    create: {
      id: "default-rate",
      name: "เรตมาตรฐาน",
      ratePerKm: 1.5,
      kmPerLiter: 12,
      fuelPricePerLiter: 36,
      active: true
    }
  });

  await prisma.vehicleEfficiencyPreset.upsert({
    where: { id: "preset-toyota-yaris-gasoline" },
    update: { make: "Toyota", model: "Yaris", fuelType: "GASOLINE", kmPerLiter: 15, active: true },
    create: { id: "preset-toyota-yaris-gasoline", make: "Toyota", model: "Yaris", fuelType: "GASOLINE", kmPerLiter: 15, active: true }
  });

  await prisma.vehicleEfficiencyPreset.upsert({
    where: { id: "preset-honda-city-gasoline" },
    update: { make: "Honda", model: "City", fuelType: "GASOLINE", kmPerLiter: 13, active: true },
    create: { id: "preset-honda-city-gasoline", make: "Honda", model: "City", fuelType: "GASOLINE", kmPerLiter: 13, active: true }
  });

  await prisma.vehicleEfficiencyPreset.upsert({
    where: { id: "preset-isuzu-dmax-diesel" },
    update: { make: "Isuzu", model: "D-Max", fuelType: "DIESEL", kmPerLiter: 11, active: true },
    create: { id: "preset-isuzu-dmax-diesel", make: "Isuzu", model: "D-Max", fuelType: "DIESEL", kmPerLiter: 11, active: true }
  });

  await prisma.vehicle.upsert({
    where: { id: "seed-vehicle-employee" },
    update: {
      userId: employee.id,
      name: "Toyota Yaris พนักงานภาคสนาม",
      make: "Toyota",
      model: "Yaris",
      licensePlate: "1กก 1234",
      fuelType: "GASOLINE",
      kmPerLiter: 15,
      active: true,
      approved: true,
      isDefault: true
    },
    create: {
      id: "seed-vehicle-employee",
      userId: employee.id,
      name: "Toyota Yaris พนักงานภาคสนาม",
      make: "Toyota",
      model: "Yaris",
      licensePlate: "1กก 1234",
      fuelType: "GASOLINE",
      kmPerLiter: 15,
      active: true,
      approved: true,
      isDefault: true
    }
  });

  await prisma.vehicle.upsert({
    where: { id: "seed-vehicle-engineer" },
    update: {
      userId: engineer.id,
      name: "Honda City วิศวกรสำรวจ",
      make: "Honda",
      model: "City",
      licensePlate: "2ขข 5678",
      fuelType: "GASOLINE",
      kmPerLiter: 13,
      active: true,
      approved: true,
      isDefault: true
    },
    create: {
      id: "seed-vehicle-engineer",
      userId: engineer.id,
      name: "Honda City วิศวกรสำรวจ",
      make: "Honda",
      model: "City",
      licensePlate: "2ขข 5678",
      fuelType: "GASOLINE",
      kmPerLiter: 13,
      active: true,
      approved: true,
      isDefault: true
    }
  });

  const projectA = await prisma.project.upsert({
    where: { code: "PRJ-00001" },
    update: {},
    create: {
      code: "PRJ-00001",
      name: "ปรับปรุงระบบไฟฟ้าอาคาร A",
      customerName: "บริษัท สยามอินดัสทรี จำกัด",
      contactName: "คุณกานต์",
      contactPhone: "081-111-2222",
      address: "แขวงสีลม เขตบางรัก กรุงเทพมหานคร",
      province: "กรุงเทพมหานคร",
      latitude: 13.725,
      longitude: 100.524,
      status: "SURVEYED",
      description: "สำรวจโหลดไฟฟ้าและพื้นที่ติดตั้งตู้ควบคุม",
      createdById: sales.id,
      ownerId: engineer.id
    }
  });

  const projectB = await prisma.project.upsert({
    where: { code: "PRJ-00002" },
    update: {},
    create: {
      code: "PRJ-00002",
      name: "ติดตั้งระบบควบคุมคลังสินค้า",
      customerName: "บริษัท โลจิสติกส์ โปร จำกัด",
      contactName: "คุณมิน",
      contactPhone: "082-333-4444",
      address: "อำเภอบางพลี จังหวัดสมุทรปราการ",
      province: "สมุทรปราการ",
      latitude: 13.602,
      longitude: 100.706,
      status: "QUOTED",
      description: "เสนอราคาและรอลูกค้าอนุมัติงบประมาณ",
      createdById: engineer.id,
      ownerId: sales.id
    }
  });

  await prisma.checkIn.upsert({
    where: { id: "seed-checkin-1" },
    update: {},
    create: {
      id: "seed-checkin-1",
      userId: employee.id,
      projectId: projectA.id,
      latitude: 13.725,
      longitude: 100.524,
      accuracy: 25,
      purpose: "SITE_SURVEY",
      note: "สำรวจพื้นที่หน้างานและถ่ายรูปประกอบ"
    }
  });

  await prisma.checkIn.upsert({
    where: { id: "seed-checkin-2" },
    update: {},
    create: {
      id: "seed-checkin-2",
      userId: engineer.id,
      projectId: projectB.id,
      latitude: 13.602,
      longitude: 100.706,
      accuracy: 18,
      purpose: "INSPECTION",
      note: "ตรวจความพร้อมก่อนเริ่มติดตั้ง"
    }
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      entityType: "Seed",
      entityId: "initial",
      action: "SEED_DATABASE",
      metadata: { users: 4, projects: 2 }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
