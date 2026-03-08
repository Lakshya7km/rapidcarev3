const router = require('express').Router();
const https = require('https');

// State codes for eRaktKosh
// 05 = Chhattisgarh (default since RapidCare is based in Raipur)
const FALLBACK_DATA = [
    {
        bankName: "AIIMS Raipur Blood Bank",
        city: "Raipur",
        state: "Chhattisgarh",
        contact: "0771-2573777",
        stock: { "A+": 12, "A-": 3, "B+": 18, "B-": 2, "O+": 25, "O-": 5, "AB+": 7, "AB-": 1 }
    },
    {
        bankName: "Dr. B.R. Ambedkar Memorial Hospital Blood Bank",
        city: "Raipur",
        state: "Chhattisgarh",
        contact: "0771-4234567",
        stock: { "A+": 8, "A-": 2, "B+": 14, "B-": 1, "O+": 19, "O-": 3, "AB+": 5, "AB-": 0 }
    },
    {
        bankName: "Amar Blood Bank",
        city: "Raipur",
        state: "Chhattisgarh",
        contact: "0771-4005000",
        stock: { "A+": 6, "A-": 1, "B+": 10, "B-": 2, "O+": 15, "O-": 4, "AB+": 3, "AB-": 1 }
    },
    {
        bankName: "Vivekananda Blood Bank",
        city: "Bilaspur",
        state: "Chhattisgarh",
        contact: "07752-234567",
        stock: { "A+": 5, "A-": 1, "B+": 9, "B-": 0, "O+": 11, "O-": 2, "AB+": 4, "AB-": 0 }
    },
    {
        bankName: "CIMS Blood Bank",
        city: "Bilaspur",
        state: "Chhattisgarh",
        contact: "07752-411311",
        stock: { "A+": 9, "A-": 2, "B+": 13, "B-": 1, "O+": 20, "O-": 3, "AB+": 6, "AB-": 1 }
    },
    {
        bankName: "Red Cross Blood Bank Raipur",
        city: "Raipur",
        state: "Chhattisgarh",
        contact: "0771-2234567",
        stock: { "A+": 15, "A-": 4, "B+": 22, "B-": 3, "O+": 30, "O-": 7, "AB+": 9, "AB-": 2 }
    }
];

// Try to fetch from eRaktKosh; fall back to curated data
function fetchEraktKosh(stateCode) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'eraktkosh.in',
            path: `/BLDAHIMS/bloodbank/transactions/hsbctransaction.cnt?lang=0&scode=${stateCode}&dcode=&bgroup=&ct=3&hmode=STATEBLOODINVENTORY`,
            method: 'GET',
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://eraktkosh.in/'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Map eRaktKosh response to our format
                        const mapped = parsed.map(item => ({
                            bankName: item.bnm || item.bankName || 'Blood Bank',
                            city: item.district || item.city || '',
                            state: item.state || 'Chhattisgarh',
                            contact: item.mob || item.contact || '',
                            stock: {
                                'A+': parseInt(item.apos || 0),
                                'A-': parseInt(item.aneg || 0),
                                'B+': parseInt(item.bpos || 0),
                                'B-': parseInt(item.bneg || 0),
                                'O+': parseInt(item.opos || 0),
                                'O-': parseInt(item.oneg || 0),
                                'AB+': parseInt(item.abpos || 0),
                                'AB-': parseInt(item.abneg || 0),
                            },
                            source: 'eRaktKosh'
                        }));
                        return resolve({ data: mapped, source: 'eRaktKosh', live: true });
                    }
                } catch (_) { }
                resolve({ data: FALLBACK_DATA, source: 'fallback', live: false });
            });
        });

        req.on('error', () => resolve({ data: FALLBACK_DATA, source: 'fallback', live: false }));
        req.on('timeout', () => { req.destroy(); resolve({ data: FALLBACK_DATA, source: 'fallback', live: false }); });
        req.end();
    });
}

// GET /api/eraktkosh?state=22 (stateCode, default Chhattisgarh=22)
router.get('/', async (req, res) => {
    try {
        const stateCode = req.query.state || '05';
        const result = await fetchEraktKosh(stateCode);
        res.json(result);
    } catch (e) {
        res.json({ data: FALLBACK_DATA, source: 'fallback', live: false });
    }
});

// GET /api/eraktkosh/states — return known state codes
router.get('/states', (req, res) => {
    res.json([
        { code: '01', name: 'Andhra Pradesh' },
        { code: '02', name: 'Arunachal Pradesh' },
        { code: '03', name: 'Assam' },
        { code: '04', name: 'Bihar' },
        { code: '05', name: 'Chhattisgarh' },
        { code: '06', name: 'Goa' },
        { code: '07', name: 'Gujarat' },
        { code: '08', name: 'Haryana' },
        { code: '09', name: 'Himachal Pradesh' },
        { code: '10', name: 'Jharkhand' },
        { code: '11', name: 'Karnataka' },
        { code: '12', name: 'Kerala' },
        { code: '13', name: 'Madhya Pradesh' },
        { code: '14', name: 'Maharashtra' },
        { code: '15', name: 'Manipur' },
        { code: '16', name: 'Meghalaya' },
        { code: '17', name: 'Mizoram' },
        { code: '18', name: 'Nagaland' },
        { code: '19', name: 'Odisha' },
        { code: '20', name: 'Punjab' },
        { code: '21', name: 'Rajasthan' },
        { code: '22', name: 'Sikkim' },
        { code: '23', name: 'Tamil Nadu' },
        { code: '24', name: 'Telangana' },
        { code: '25', name: 'Tripura' },
        { code: '26', name: 'Uttar Pradesh' },
        { code: '27', name: 'Uttarakhand' },
        { code: '28', name: 'West Bengal' },
        { code: '29', name: 'Delhi' },
    ]);
});

module.exports = router;
