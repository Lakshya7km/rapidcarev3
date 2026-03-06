const router = require('express').Router();
const https = require('https');

// State codes for eRaktKosh
// 05 = Chhattisgarh (default since RapidCare is based in Raipur)
const FALLBACK_DATA = [];

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
