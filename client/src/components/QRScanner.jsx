import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }) {
    const ref = useRef()
    const onScanRef = useRef(onScan)
    const [error, setError] = useState('')
    const [started, setStarted] = useState(false)

    // Keep the ref up-to-date without re-triggering the effect
    useEffect(() => { onScanRef.current = onScan }, [onScan])

    useEffect(() => {
        if (!ref.current) return
        
        const id = 'qr-scanner-' + Date.now()
        ref.current.id = id
        
        let scanner = null;
        let mounted = true;

        // Initialize scanner after a short delay to ensure DOM is ready
        setTimeout(() => {
            if (!mounted) return;
            scanner = new Html5Qrcode(id)
            scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (data) => {
                    if (!mounted) return
                    mounted = false
                    scanner.stop().catch(() => { })
                    onScanRef.current(data)
                },
                () => { }
            ).then(() => {
                if (mounted) setStarted(true)
            }).catch((err) => {
                if (!mounted) return
                setError('Camera unavailable. Please allow camera access and try again.')
                console.warn('QR Scanner Error:', err)
            })
        }, 100);

        return () => { 
            mounted = false; 
            if (scanner) {
                try {
                    scanner.stop().catch(() => {}) 
                } catch (e) {
                    console.error('Error stopping scanner cleanup:', e)
                }
            }
        }
    }, [])

    if (error) {
        return (
            <div style={{
                padding: '24px 16px', textAlign: 'center', color: '#dc2626',
                background: '#fef2f2', borderRadius: 12, fontSize: 13, lineHeight: 1.6
            }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                <strong>Camera Error</strong>
                <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 12 }}>{error}</p>
            </div>
        )
    }

    return (
        <div>
            {!started && (
                <div style={{ textAlign: 'center', padding: 16, color: 'var(--text2)', fontSize: 12 }}>
                    <div className="spinner" style={{ margin: '0 auto 8px' }} />
                    Starting camera…
                </div>
            )}
            <div ref={ref} style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }} />
        </div>
    )
}
