const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { sequelize, Thuoc, NhanVien } = require('../../src/models');

describe('Medicine CRUD & Alerts API (UC-009)', () => {
  let adminToken;
  let doctorToken;
  let testMedicine1;
  let testMedicine2;
  let testMedicine3;

  beforeAll(async () => {
    // Force sync db tables
    await sequelize.sync({ force: true });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';

    adminToken = jwt.sign(
      { userId: 1, role: 'ADMIN', username: 'admin01' },
      jwtSecret
    );

    doctorToken = jwt.sign(
      { userId: 3, role: 'BAC_SI', username: 'bacsi01' },
      jwtSecret
    );

    // Seed staff for foreign key sanity if needed (though not strictly required for Thuoc itself)
    await NhanVien.create({
      ma_nhan_vien: 1,
      ho_ten: 'Quản Trị Viên',
      vai_tro: 'ADMIN',
      ten_dang_nhap: 'admin01',
      mat_khau_hash: 'hash'
    });

    await NhanVien.create({
      ma_nhan_vien: 3,
      ho_ten: 'Bác Sĩ',
      vai_tro: 'BAC_SI',
      ten_dang_nhap: 'bacsi01',
      mat_khau_hash: 'hash'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear medicines table
    await Thuoc.destroy({ where: {} });

    // Seed medicines
    testMedicine1 = await Thuoc.create({
      ten_thuoc: 'Paracetamol 500mg',
      hoat_chat: 'Paracetamol',
      don_vi: 'Viên',
      gia: 2000,
      so_luong_ton: 100,
      han_dung: '2028-12-31',
      is_active: true
    });

    testMedicine2 = await Thuoc.create({
      ten_thuoc: 'Vitamin C 1000mg',
      hoat_chat: 'Ascorbic Acid',
      don_vi: 'Viên',
      gia: 5000,
      so_luong_ton: 8, // low stock (<= 10)
      han_dung: '2029-01-15',
      is_active: true
    });

    // Seed expiring medicine (expiring within 30 days)
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 10);
    const expiringDateStr = expiringDate.toISOString().split('T')[0];

    testMedicine3 = await Thuoc.create({
      ten_thuoc: 'Amoxicillin 500mg',
      hoat_chat: 'Amoxicillin',
      don_vi: 'Viên',
      gia: 3500,
      so_luong_ton: 50,
      han_dung: expiringDateStr, // expiring (<= 30 days)
      is_active: true
    });
  });

  describe('GET /api/medicines (List Medicines)', () => {
    it('should return paginated list of medicines for ADMIN', async () => {
      const res = await request(app)
        .get('/api/medicines?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.medicines.length).toBe(2);
      expect(res.body.data.totalItems).toBe(3);
      expect(res.body.data.totalPages).toBe(2);
    });

    it('should filter list by search keyword', async () => {
      const res = await request(app)
        .get('/api/medicines?search=Vitamin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.medicines.length).toBe(1);
      expect(res.body.data.medicines[0].ten_thuoc).toBe('Vitamin C 1000mg');
    });

    it('should block non-ADMIN from accessing listing', async () => {
      const res = await request(app)
        .get('/api/medicines')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/medicines (Create Medicine)', () => {
    it('should successfully create medicine for ADMIN with valid data', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ten_thuoc: 'Ibuprofen 400mg',
          hoat_chat: 'Ibuprofen',
          don_vi: 'Viên',
          gia: 2500,
          so_luong_ton: 120,
          han_dung: '2027-06-30'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ten_thuoc).toBe('Ibuprofen 400mg');

      // Verify db insert
      const inserted = await Thuoc.findOne({ where: { ten_thuoc: 'Ibuprofen 400mg' } });
      expect(inserted).not.toBeNull();
      expect(parseFloat(inserted.gia)).toBe(2500);
    });

    it('should reject creation if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ten_thuoc: '', // empty name
          don_vi: 'Viên',
          gia: -500 // negative price
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should block non-ADMIN roles from creating medicine', async () => {
      const res = await request(app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          ten_thuoc: 'Ibuprofen 400mg',
          don_vi: 'Viên',
          gia: 2500
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/medicines/:id (Update Medicine)', () => {
    it('should update medicine attributes for ADMIN', async () => {
      const res = await request(app)
        .put(`/api/medicines/${testMedicine1.ma_thuoc}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ten_thuoc: 'Paracetamol Extra 500mg',
          gia: 2200
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ten_thuoc).toBe('Paracetamol Extra 500mg');
      expect(parseFloat(res.body.data.gia)).toBe(2200);
    });

    it('should block non-ADMIN from updating medicine', async () => {
      const res = await request(app)
        .put(`/api/medicines/${testMedicine1.ma_thuoc}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          gia: 3000
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/medicines/:id (Delete Medicine)', () => {
    it('should soft delete medicine (set is_active to false)', async () => {
      const res = await request(app)
        .delete(`/api/medicines/${testMedicine1.ma_thuoc}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbRecord = await Thuoc.findByPk(testMedicine1.ma_thuoc);
      expect(dbRecord.is_active).toBe(false);
    });
  });

  describe('GET /api/medicines/alerts (Stock & Expiry Alerts)', () => {
    it('should return low stock and expiring items (Vitamin C & Amoxicillin)', async () => {
      const res = await request(app)
        .get('/api/medicines/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);

      const names = res.body.data.map(m => m.ten_thuoc);
      expect(names).toContain('Vitamin C 1000mg'); // low stock
      expect(names).toContain('Amoxicillin 500mg'); // expiring
      expect(names).not.toContain('Paracetamol 500mg'); // good stock, far expiry
    });
  });
});
