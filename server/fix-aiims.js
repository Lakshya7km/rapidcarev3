require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');

async function fix() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected...');

    // Fix AIIMS Raipur location coordinates & address
    const result = await Hospital.updateOne(
        { hospitalId: 'AIIMS-RPR' },
        {
            $set: {
                'location.lat': 21.2564272,
                'location.lng': 81.5795215,
                'address.street': 'Tatibandh, G.E. Road',
                services: ['Emergency', 'ICU', 'Surgery', 'Cardiology', 'Neurology', 'Paediatrics', 'Orthopaedics', 'Gynaecology', 'HDU'],
                facilities: ['Pharmacy', 'Blood Bank', 'Ambulance', 'Cafeteria', 'Parking', 'Trauma Centre', 'NICU'],
                insurance: ['CGHS', 'ECHS', 'Ayushman Bharat', 'ESI'],
                ipdStats: [
                    { type: 'General', strength: 744, occupied: 588, vacant: 156 },
                    { type: 'HDU', strength: 59, occupied: 47, vacant: 12 },
                    { type: 'ICU', strength: 125, occupied: 110, vacant: 15 },
                    { type: 'Private', strength: 34, occupied: 17, vacant: 17 },
                ]
            }
        }
    );

    console.log('✅ AIIMS-RPR updated:', result);
    console.log('   New location: lat 21.2564272, lng 81.5795215');
    console.log('   IPD Stats: General(744), HDU(59), ICU(125), Private(34)');

    await mongoose.disconnect();
    console.log('Done!');
}

fix().catch(err => { console.error(err); process.exit(1); });
