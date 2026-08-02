import User from '../models/User.js';

/**
 * Seed default admin account if not exists
 */
export const seedAdmin = async (): Promise<void> => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@espoir.tn';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        fullName: 'System Administrator',
        email: adminEmail,
        password: adminPassword,
        phone: '+216 00 000 000',
        role: 'admin',
      });
      console.log(`👤 Admin account created: ${adminEmail}`);
    } else {
      console.log(`👤 Admin account already exists: ${adminEmail}`);
    }
  } catch (error) {
    console.error('❌ Error seeding admin account:', error);
  }
};

/**
 * Run all seeders
 */
export const seedAll = async (): Promise<void> => {
  console.log('\n🌱 Seeding default admin account...\n');
  await seedAdmin();
  console.log('\n✅ Seeding complete!\n');
};