const fs = require('fs');

const bedMgmtPath = 'client/src/pages/Reception/sections/BedManagement.jsx';
const nursePortalPath = 'client/src/pages/Nurse/NursePortal.jsx';

function fixBedMgmt() {
    let content = fs.readFileSync(bedMgmtPath, 'utf8');

    // 1. imports
    content = content.replace(
        "import QRCode from 'qrcode'",
        "import QRCode from 'qrcode'\nimport { parseBedIdFromQR, buildBedQrUrl, getBedQrBaseUrl } from '../../../lib/bedQr'"
    );

    // 2. handleQRScan
    const oldScan = `    const handleQRScan = (data) => {\r
        // Data might be a full URL like "http://localhost:5173/bed/AIIMS-RPR-W1-B001" or just the ID\r
        const urlParts = data.trim().split('/')\r
        const bedId = urlParts[urlParts.length - 1]\r
\r
        const bed = beds.find(b => b.bedId === bedId)\r
        if (bed) {\r
            setScanMode(false)\r
            setTimeout(() => setSelected(bed), 180)\r
        } else {\r
            setScanMode(false)\r
            setMsg(\`Bed "\${bedId}" not found\`)\r
        }\r
    }`;

    const newScan = `    const handleQRScan = async (data) => {
        const bedId = parseBedIdFromQR(data)
        const bed = beds.find(b => b.bedId === bedId)
        setScanMode(false)

        if (bed) {
            setTimeout(() => setSelected(bed), 180)
            return
        }

        try {
            const r = await api.get(\`/beds/public/\${bedId}\`)
            if (r.data?.hospitalId === hospitalId) {
                setTimeout(() => setSelected(r.data), 180)
            } else {
                setMsg(\`Bed "\${bedId}" belongs to another hospital\`)
            }
        } catch {
            setMsg(\`Bed "\${bedId}" not found\`)
        }
    }`;
    content = content.replace(oldScan.replace(/\r/g, ''), newScan); // to be safe

    // 3. downloadQRPDF
    content = content.replace('const baseUrl = window.location.origin', 'const baseUrl = getBedQrBaseUrl()');
    content = content.replace('const bedUrl = `${baseUrl}/bed/${bed.bedId}`', 'const bedUrl = buildBedQrUrl(bed.bedId)');
    content = content.replace('<body>\n<div class="grid">', '<body>\n<div style="padding: 0 12px 8px; font-size: 10px; color: #666;">QR base URL: ${baseUrl}</div>\n<div class="grid">');
    content = content.replace('setTimeout(() => win.print(), 500)\n        } finally {', "setTimeout(() => win.print(), 500)\n        } catch (e) {\n            setMsg(e?.message || 'Failed to generate QR labels')\n        } finally {");

    // 4. regenerateQRCodes & buttons
    const oldRegenPoint = `    const bedsForDownload = selectedIds.size > 0 ? filtered.filter(b => selectedIds.has(b.bedId)) : filtered\r
\r
    return (\r
        <div>`;

    const newRegenPoint = `    const bedsForDownload = selectedIds.size > 0 ? filtered.filter(b => selectedIds.has(b.bedId)) : filtered

    const regenerateQRCodes = async () => {
        if (bedsForDownload.length === 0) {
            setMsg('No beds available to regenerate QR labels')
            return
        }

        const scope = selectedIds.size > 0 ? \`\${selectedIds.size} selected beds\` : \`all \${filtered.length} beds\`
        const ok = window.confirm(\`Regenerate QR labels for \${scope}?\\n\\nUse this when old labels were generated from localhost or a wrong domain.\`)
        if (!ok) return

        await downloadQRPDF(bedsForDownload)
        setMsg(\`Regenerated QR labels for \${scope}. Replace old labels to avoid white-screen scans.\`)
    }

    return (
        <div>`;

    content = content.replace(oldRegenPoint.replace(/\r/g, ''), newRegenPoint);

    const oldBtn = `<button\n                    className="btn btn-sm"\n                    style={{ background: '#f97316', color: 'white', opacity: downloading ? 0.6 : 1 }}\n                    onClick={() => downloadQRPDF(bedsForDownload)}`;

    const newBtn = `<button
                    className="btn btn-outline btn-sm"
                    onClick={regenerateQRCodes}
                    disabled={downloading}
                    title={selectedIds.size > 0 ? \`Regenerate QR for \${selectedIds.size} selected beds\` : \`Regenerate QR for all \${filtered.length} beds\`}
                >
                    <RefreshCw size={14} />
                    {selectedIds.size > 0 ? \`Regenerate \${selectedIds.size} QR\` : 'Regenerate All QR'}
                </button>
                <button
                    className="btn btn-sm"
                    style={{ background: '#f97316', color: 'white', opacity: downloading ? 0.6 : 1 }}
                    onClick={() => downloadQRPDF(bedsForDownload)}`;

    content = content.replace(oldBtn, newBtn);

    fs.writeFileSync(bedMgmtPath, content, 'utf8');
}

function fixNurse() {
    let content = fs.readFileSync(nursePortalPath, 'utf8');
    
    content = content.replace(
        "import QRScanner from '../../components/QRScanner'",
        "import QRScanner from '../../components/QRScanner'\nimport { parseBedIdFromQR } from '../../lib/bedQr'"
    );

    const oldScan = `    const handleQRScan = (data) => {\r
        // Data might be a full URL like "http://localhost:5173/bed/AIIMS-RPR-W1-B001" or just the ID\r
        const urlParts = data.trim().split('/')\r
        const bedId = urlParts[urlParts.length - 1]\r
        \r
        const bed = beds.find(b => b.bedId === bedId)\r
        if (bed) {\r
            setScanMode(false)\r
            // Small delay so the scan modal fully closes before opening the status modal\r
            setTimeout(() => setSelected(bed), 180)\r
        } else {\r
            setScanMode(false)\r
            setMsg('Bed not found: ' + bedId)\r
        }\r
    }`;

    const newScan = `    const handleQRScan = async (data) => {
        const bedId = parseBedIdFromQR(data)
        const bed = beds.find(b => b.bedId === bedId)
        setScanMode(false)

        if (bed) {
            // Small delay so the scan modal fully closes before opening the status modal
            setTimeout(() => setSelected(bed), 180)
            return
        }

        try {
            const r = await api.get(\`/beds/public/\${bedId}\`)
            if (r.data?.hospitalId === user?.hospitalId) {
                setTimeout(() => setSelected(r.data), 180)
            } else {
                setMsg('Scanned bed belongs to another hospital: ' + bedId)
            }
        } catch {
            setMsg('Bed not found: ' + bedId)
        }
    }`;

    content = content.replace(oldScan.replace(/\r/g, ''), newScan);
    fs.writeFileSync(nursePortalPath, content, 'utf8');
}

// Convert CRLF to LF in content before replace for easier matching if needed
// Actually, let's process gracefully:
function replaceSafely(path, cb) {
    let str = fs.readFileSync(path, 'utf8');
    let crlf = str.includes('\r\n');
    if (crlf) str = str.replace(/\r\n/g, '\n');
    str = cb(str);
    if (crlf) str = str.replace(/\n/g, '\r\n');
    fs.writeFileSync(path, str, 'utf8');
}

replaceSafely(bedMgmtPath, (content) => {
    // 1
    content = content.replace(
        "import QRCode from 'qrcode'",
        "import QRCode from 'qrcode'\nimport { parseBedIdFromQR, buildBedQrUrl, getBedQrBaseUrl } from '../../../lib/bedQr'"
    );

    // 2
    const oldScanReg = /    const handleQRScan = \(data\) => {[^]+?    }/;
    const newScan = `    const handleQRScan = async (data) => {
        const bedId = parseBedIdFromQR(data)
        const bed = beds.find(b => b.bedId === bedId)
        setScanMode(false)

        if (bed) {
            setTimeout(() => setSelected(bed), 180)
            return
        }

        try {
            const r = await api.get(\`/beds/public/\${bedId}\`)
            if (r.data?.hospitalId === hospitalId) {
                setTimeout(() => setSelected(r.data), 180)
            } else {
                setMsg(\`Bed "\${bedId}" belongs to another hospital\`)
            }
        } catch {
            setMsg(\`Bed "\${bedId}" not found\`)
        }
    }`;
    content = content.replace(oldScanReg, newScan);

    // 3
    content = content.replace('const baseUrl = window.location.origin', 'const baseUrl = getBedQrBaseUrl()');
    content = content.replace('const bedUrl = `${baseUrl}/bed/${bed.bedId}`', 'const bedUrl = buildBedQrUrl(bed.bedId)');
    content = content.replace('<body>\n<div class="grid">', '<body>\n<div style="padding: 0 12px 8px; font-size: 10px; color: #666;">QR base URL: ${baseUrl}</div>\n<div class="grid">');
    content = content.replace('setTimeout(() => win.print(), 500)\n        } finally {', "setTimeout(() => win.print(), 500)\n        } catch (e) {\n            setMsg(e?.message || 'Failed to generate QR labels')\n        } finally {");

    // 4
    content = content.replace(`    const bedsForDownload = selectedIds.size > 0 ? filtered.filter(b => selectedIds.has(b.bedId)) : filtered\n\n    return (\n        <div>`, `    const bedsForDownload = selectedIds.size > 0 ? filtered.filter(b => selectedIds.has(b.bedId)) : filtered\n\n    const regenerateQRCodes = async () => {\n        if (bedsForDownload.length === 0) {\n            setMsg('No beds available to regenerate QR labels')\n            return\n        }\n\n        const scope = selectedIds.size > 0 ? \\\`\\$\\{selectedIds.size\\} selected beds\\\` : \\\`all \\$\\{filtered.length\\} beds\\\`\n        const ok = window.confirm(\\\`Regenerate QR labels for \\$\\{scope\\}?\\n\\nUse this when old labels were generated from localhost or a wrong domain.\\\`)\n        if (!ok) return\n\n        await downloadQRPDF(bedsForDownload)\n        setMsg(\\\`Regenerated QR labels for \\$\\{scope\\}. Replace old labels to avoid white-screen scans.\\\`)\n    }\n\n    return (\n        <div>`);

    content = content.replace(`<button\n                    className="btn btn-sm"\n                    style={{ background: '#f97316', color: 'white', opacity: downloading ? 0.6 : 1 }}\n                    onClick={() => downloadQRPDF(bedsForDownload)}`, `<button\n                    className="btn btn-outline btn-sm"\n                    onClick={regenerateQRCodes}\n                    disabled={downloading}\n                    title={selectedIds.size > 0 ? \\\`Regenerate QR for \\$\\{selectedIds.size\\} selected beds\\\` : \\\`Regenerate QR for all \\$\\{filtered.length\\} beds\\\`}\n                >\n                    <RefreshCw size={14} />\n                    {selectedIds.size > 0 ? \\\`Regenerate \\$\\{selectedIds.size\\} QR\\\` : 'Regenerate All QR'}\n                </button>\n                <button\n                    className="btn btn-sm"\n                    style={{ background: '#f97316', color: 'white', opacity: downloading ? 0.6 : 1 }}\n                    onClick={() => downloadQRPDF(bedsForDownload)}`);

    return content;
});

replaceSafely(nursePortalPath, (content) => {
    content = content.replace(
        "import QRScanner from '../../components/QRScanner'",
        "import QRScanner from '../../components/QRScanner'\nimport { parseBedIdFromQR } from '../../lib/bedQr'"
    );

    const oldScanReg = /    const handleQRScan = \(data\) => {[^]+?    }/;
    const newScan = `    const handleQRScan = async (data) => {
        const bedId = parseBedIdFromQR(data)
        const bed = beds.find(b => b.bedId === bedId)
        setScanMode(false)

        if (bed) {
            // Small delay so the scan modal fully closes before opening the status modal
            setTimeout(() => setSelected(bed), 180)
            return
        }

        try {
            const r = await api.get(\`/beds/public/\${bedId}\`)
            if (r.data?.hospitalId === user?.hospitalId) {
                setTimeout(() => setSelected(r.data), 180)
            } else {
                setMsg('Scanned bed belongs to another hospital: ' + bedId)
            }
        } catch {
            setMsg('Bed not found: ' + bedId)
        }
    }`;
    content = content.replace(oldScanReg, newScan);
    return content;
});
console.log("Success");
