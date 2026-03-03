import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }) {
    const ref = useRef()
    useEffect(() => {
        const id = 'qr-scanner-' + Date.now()
        ref.current.id = id
        const scanner = new Html5Qrcode(id)
        scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } },
            (data) => { scanner.stop().catch(() => { }); onScan(data) },
            () => { }
        ).catch(() => { })
        return () => { scanner.stop().catch(() => { }) }
    }, [onScan])
    return <div ref={ref} style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }} />
}
