require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
const Doctor = require('./models/Doctor');
const Nurse = require('./models/Nurse');
const Ambulance = require('./models/Ambulance');
const Bed = require('./models/Bed');
const BloodBank = require('./models/BloodBank');
const Announcement = require('./models/Announcement');
const SuperAdmin = require('./models/SuperAdmin');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB — seeding...');

    // SuperAdmin
    const existAdmin = await SuperAdmin.findOne({ username: 'admin' });
    if (!existAdmin) {
        await new SuperAdmin({ username: 'admin', password: 'test@1234' }).save();
        console.log('✅ SuperAdmin created');
    } else console.log('ℹ️  SuperAdmin already exists');

    // Hospitals
    const hospitals = [
        {
            hospitalId: 'AIIMS-RPR', name: 'AIIMS Raipur', contact: '0771-2573777',
            password: 'test@1234', email: 'aiims@hospital.in',
            address: { street: 'Tatibandh, G.E. Road', city: 'Raipur', district: 'Raipur', state: 'Chhattisgarh' },
            location: { lat: 21.2564272, lng: 81.5795215 },
            services: ['Emergency', 'ICU', 'Surgery', 'Cardiology', 'Neurology', 'Paediatrics', 'Orthopaedics', 'Gynaecology', 'HDU'],
            facilities: ['Pharmacy', 'Blood Bank', 'Ambulance', 'Cafeteria', 'Parking', 'Trauma Centre', 'NICU'],
            insurance: ['CGHS', 'ECHS', 'Ayushman Bharat', 'ESI'],
        },
        {
            hospitalId: 'RMC-RPR', name: 'Raipur Medical Centre', contact: '0771-4012345',
            password: 'test@1234', email: 'rmc@hospital.in',
            address: { street: 'Shankar Nagar', city: 'Raipur', district: 'Raipur', state: 'Chhattisgarh' },
            location: { lat: 21.2457, lng: 81.6494 },
            services: ['Emergency', 'General Medicine', 'Orthopaedics'],
            facilities: ['Pharmacy', 'Blood Bank', 'Ambulance'],
            insurance: ['CGHS', 'Ayushman Bharat'],
        }
    ];
    for (const h of hospitals) {
        const exists = await Hospital.findOne({ hospitalId: h.hospitalId });
        if (!exists) { await new Hospital(h).save(); console.log(`✅ Hospital ${h.hospitalId} created`); }
        else console.log(`ℹ️  Hospital ${h.hospitalId} already exists`);
    }

    // Doctors
    const doctors = [
        { doctorId: 'DOC-AIIMS-01', hospitalId: 'AIIMS-RPR', name: 'Dr. Anil Kumar', speciality: 'Cardiology', qualification: 'MBBS, MD', experience: '15 years', password: 'test@1234' },
        { doctorId: 'DOC-AIIMS-02', hospitalId: 'AIIMS-RPR', name: 'Dr. Priya Sharma', speciality: 'Neurology', qualification: 'MBBS, DM', experience: '10 years', password: 'test@1234' },
        { doctorId: 'DOC-RMC-01', hospitalId: 'RMC-RPR', name: 'Dr. Suresh Verma', speciality: 'Orthopaedics', qualification: 'MBBS, MS', experience: '8 years', password: 'test@1234' },
    ];
    for (const d of doctors) {
        const exists = await Doctor.findOne({ doctorId: d.doctorId });
        if (!exists) { await new Doctor(d).save(); console.log(`✅ Doctor ${d.doctorId} created`); }
        else console.log(`ℹ️  Doctor ${d.doctorId} already exists`);
    }

    // Nurses
    const nurses = [
        { nurseId: 'NURSE-AIIMS-01', hospitalId: 'AIIMS-RPR', name: 'Nurse Anjali Gupta', mobile: '9876543210', password: 'test@1234' },
        { nurseId: 'NURSE-AIIMS-02', hospitalId: 'AIIMS-RPR', name: 'Nurse Kavita Singh', mobile: '9876543211', password: 'test@1234' },
        { nurseId: 'NURSE-RMC-01', hospitalId: 'RMC-RPR', name: 'Nurse Rita Patel', mobile: '9876543212', password: 'test@1234' },
    ];
    for (const n of nurses) {
        const exists = await Nurse.findOne({ nurseId: n.nurseId });
        if (!exists) { await new Nurse(n).save(); console.log(`✅ Nurse ${n.nurseId} created`); }
        else console.log(`ℹ️  Nurse ${n.nurseId} already exists`);
    }

    // Ambulances
    const ambulances = [
        {
            ambulanceId: 'AMB-AIIMS-01', hospitalId: 'AIIMS-RPR', vehicleNumber: 'CG04-AB-1234', password: 'test@1234',
            emt: { name: 'Ravi Yadav', emtId: 'EMT-AIIMS-01', mobile: '9988776655' },
            pilot: { name: 'Sunil Tiwari', pilotId: 'PLT-AIIMS-01', mobile: '9988776644' }
        },
        {
            ambulanceId: 'AMB-AIIMS-02', hospitalId: 'AIIMS-RPR', vehicleNumber: 'CG04-AB-5678', password: 'test@1234',
            emt: { name: 'Deepak Sahu', emtId: 'EMT-AIIMS-02', mobile: '9988776633' },
            pilot: { name: 'Ajay Nayak', pilotId: 'PLT-AIIMS-02', mobile: '9988776622' }
        },
        {
            ambulanceId: 'AMB-RMC-01', hospitalId: 'RMC-RPR', vehicleNumber: 'CG04-CD-4321', password: 'test@1234',
            emt: { name: 'Rahul Mishra', emtId: 'EMT-RMC-01', mobile: '9988776611' },
            pilot: { name: 'Vikram Singh', pilotId: 'PLT-RMC-01', mobile: '9988776600' }
        }
    ];
    for (const a of ambulances) {
        const exists = await Ambulance.findOne({ ambulanceId: a.ambulanceId });
        if (!exists) { await new Ambulance(a).save(); console.log(`✅ Ambulance ${a.ambulanceId} created`); }
        else console.log(`ℹ️  Ambulance ${a.ambulanceId} already exists`);
    }

    // Beds for AIIMS — matching real IPD data (scaled for demo)
    // General: 744 total, 588 occupied, 156 vacant
    // HDU:      59 total,  47 occupied,  12 vacant
    // ICU:     125 total, 110 occupied,  15 vacant
    // Private:  34 total,  17 occupied,  17 vacant
    const bedTypes = [
        { ward: 'GEN', type: 'General', total: 744, occupied: 588 },
        { ward: 'HDU', type: 'HDU', total: 59, occupied: 47 },
        { ward: 'ICU', type: 'ICU', total: 125, occupied: 110 },
        { ward: 'PVT', type: 'Private', total: 34, occupied: 17 },
    ];
    for (const b of bedTypes) {
        // Seed only the first 30 beds per type for demo (keeping ratio)
        const seedCount = Math.min(30, b.total);
        const occRatio = b.occupied / b.total;
        const occupiedCount = Math.round(seedCount * occRatio);
        for (let i = 1; i <= seedCount; i++) {
            const num = String(i).padStart(3, '0');
            const bedId = `AIIMS-RPR-${b.ward}-B${num}`;
            const exists = await Bed.findOne({ bedId });
            if (!exists) {
                const status = i <= occupiedCount ? 'Occupied' : 'Vacant';
                await new Bed({ bedId, hospitalId: 'AIIMS-RPR', bedNumber: `B${num}`, wardNumber: b.ward, bedType: b.type, status }).save();
            }
        }
    }
    console.log('✅ Beds seeded for AIIMS-RPR (General:744, HDU:59, ICU:125, Private:34)');
    // Store actual IPD totals in hospital record for display
    await Hospital.updateOne({ hospitalId: 'AIIMS-RPR' }, {
        $set: {
            ipdStats: [
                { type: 'General', strength: 744, occupied: 588, vacant: 156 },
                { type: 'HDU', strength: 59, occupied: 47, vacant: 12 },
                { type: 'ICU', strength: 125, occupied: 110, vacant: 15 },
                { type: 'Private', strength: 34, occupied: 17, vacant: 17 },
            ]
        }
    });

    // Blood Bank for AIIMS
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    for (const bt of bloodTypes) {
        const exists = await BloodBank.findOne({ hospitalId: 'AIIMS-RPR', bloodType: bt });
        if (!exists) await new BloodBank({ hospitalId: 'AIIMS-RPR', bloodType: bt, units: Math.floor(Math.random() * 20) + 5 }).save();
    }
    console.log('✅ Blood Bank seeded for AIIMS-RPR');

    // Announcements
    const ann = await Announcement.findOne({ hospitalId: 'AIIMS-RPR' });
    if (!ann) {
        await new Announcement({ hospitalId: 'AIIMS-RPR', title: 'OPD Timings Updated', content: 'OPD now open from 8 AM to 6 PM on weekdays.', priority: 'Medium' }).save();
        console.log('✅ Announcement created');
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Super Admin  | admin           | test@1234');
    console.log('Reception    | AIIMS-RPR       | test@1234');
    console.log('Reception    | RMC-RPR         | test@1234');
    console.log('Doctor       | DOC-AIIMS-01    | test@1234');
    console.log('Nurse        | NURSE-AIIMS-01  | test@1234');
    console.log('Ambulance    | AMB-AIIMS-01    | test@1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
