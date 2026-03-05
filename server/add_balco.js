const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
require('dotenv').config()

const Hospital = require('./models/Hospital')
const Bed = require('./models/Bed')
const Nurse = require('./models/Nurse')
const Doctor = require('./models/Doctor')

async function addBalco() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rapidcarev2')
        console.log('Connected to DB')

        // 1. Create Hospital
        const hId = 'H-BALCO-' + Math.floor(Math.random() * 1000)

        let balco = await Hospital.findOne({ name: /BALCO/i })
        if (!balco) {
            balco = new Hospital({
                hospitalId: hId,
                name: 'BALCO Medical Centre',
                type: 'Private Hospital',
                address: {
                    street: 'Sector 36, Uparwara',
                    city: 'Naya Raipur',
                    state: 'Chhattisgarh',
                    pincode: '493661'
                },
                location: {
                    lat: 21.1232259,
                    lng: 81.772163
                },
                contact: '07712211111',
                email: 'info@balcomedicalcentre.com',
                password: 'password123',
                services: ['General Care', 'ICU', 'Emergency', 'Surgery', 'Oncology', 'Cancer Care'],
                status: 'Verified'
            })
            await balco.save()
            console.log('Added BALCO Hospital:', balco.hospitalId, ' | Login password: password123')
        } else {
            console.log('BALCO already exists:', balco.hospitalId)
        }

        const hospitalId = balco.hospitalId

        // 2. Add some beds if none exist
        const bedCount = await Bed.countDocuments({ hospitalId })
        if (bedCount === 0) {
            const beds = []
            for (let i = 1; i <= 15; i++) {
                beds.push({
                    bedId: `B-${hospitalId}-${i}`,
                    hospitalId,
                    wardNumber: 'Oncology-W1',
                    bedNumber: `ONC-${100 + i}`,
                    bedType: i <= 5 ? 'ICU' : (i <= 10 ? 'Private' : 'General'),
                    status: i <= 8 ? 'Occupied' : 'Vacant',
                    patientName: i <= 8 ? `Patient ${i}` : ''
                })
            }
            await Bed.insertMany(beds)
            console.log('Added 15 beds for BALCO')
        }

        // 3. Add Doctor
        const docCount = await Doctor.countDocuments({ hospitalId })
        if (docCount === 0) {
            await Doctor.create({
                doctorId: 'D-BALCO-01',
                hospitalId,
                name: 'Dr. Ramesh Sharma',
                specialization: 'Oncology',
                contact: '9876543210',
                availability: 'Present',
                password: 'password123'
            })
            console.log('Added Oncologist for BALCO')
        }

        console.log('BALCO Setup Complete!')
        process.exit(0)
    } catch (e) {
        console.error(e)
        process.exit(1)
    }
}

addBalco()
