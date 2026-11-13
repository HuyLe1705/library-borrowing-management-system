import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getFines, createFine, payFine } from '../../Services/circulationService';
import './CirculationModules.css';
const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

export default function Fines({ reader = false }) {
    const loadVersion = useRef(0);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('');
    const [userCode, setUserCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [borrowRecordId, setBorrowRecordId] = useState('');
    const [reason, setReason] = useState('');
    const [selected, setSelected] = useState(null);
    const load = useCallback(async () => {
        const version = ++loadVersion.current;
        setLoading(true); setError('');
        try { const result = await getFines({ status, userCode: reader ? undefined : userCode.trim() }); if (version === loadVersion.current) setItems(result); }
        catch (err) { if (version === loadVersion.current) setError(err.message); }
        finally { if (version === loadVersion.current) setLoading(false); }
    }, [status, userCode, reader]);
    useEffect(() => { load(); }, [load]);
    const execute = async (work, success) => {
        setBusy(true); setError(''); setMessage('');
        try { await work(); setMessage(success); setSelected(null); setFormOpen(false); setBorrowRecordId(''); setReason(''); await load(); }
        catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };
    return <section className="circulation-module">
        <div className="cm-heading"><div><h1>{reader ? 'Khoản phạt của tôi' : 'Quản lý xử phạt'}</h1><p>Phạt quá hạn 5.000đ/ngày, chốt khi trả sách. {reader ? 'Vui lòng nộp phạt tại quầy thư viện.' : 'Hệ thống tự lập phiếu khi tiếp nhận sách trả quá hạn.'}</p></div>
            <div className="cm-actions"><button disabled={loading || busy} onClick={load}>Làm mới</button>{!reader && <button disabled={busy} onClick={() => setFormOpen(!formOpen)}>Lập phiếu phạt</button>}</div></div>
        <div className="cm-filters"><label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option><option value="UNPAID">Chưa thanh toán</option><option value="PAID">Đã thanh toán</option></select></label>
            {!reader && <label>Mã độc giả<input placeholder="VD: SV001" value={userCode} onChange={e => setUserCode(e.target.value)} /></label>}
            <strong>Chưa thu (theo bộ lọc): {money(items.filter(i => i.status === 'UNPAID').reduce((sum,i) => sum + Number(i.amount),0))}</strong></div>
        {error && <div className="cm-error" role="alert">{error}</div>}{message && <div className="cm-success" role="status">{message}</div>}
        {formOpen && !reader && <form className="cm-decision" onSubmit={e => { e.preventDefault(); execute(() => createFine({ borrowRecordId:Number(borrowRecordId), reason }), 'Đã lập phiếu phạt.'); }}>
            <h3>Lập bổ sung cho phiếu trả quá hạn chưa có khoản phạt</h3><p>Số ngày và số tiền được tính từ hạn trả và ngày trả đã lưu.</p>
            <label>Mã phiếu mượn<input type="number" min="1" step="1" required value={borrowRecordId} onChange={e => setBorrowRecordId(e.target.value)} /></label>
            <label>Lý do / ghi chú<textarea maxLength={255} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy}>Lập phiếu</button></form>}
        {selected && <div className="cm-decision"><h3>Xác nhận đã thu {money(selected.amount)}</h3><p>Phiếu phạt #{selected.id} · {selected.borrowerName} ({selected.borrowerCode}). Chỉ xác nhận sau khi đã nhận tiền.</p>
            <div className="cm-actions"><button disabled={busy} onClick={() => execute(() => payFine(selected.id), 'Đã ghi nhận thu tiền phạt.')}>Đã nhận tiền</button><button disabled={busy} onClick={() => setSelected(null)}>Đóng</button></div></div>}
        <div className="cm-table-wrap"><table><thead><tr><th>Phiếu phạt</th>{!reader && <th>Độc giả</th>}<th>Sách / Phiếu mượn</th><th>Quá hạn</th><th>Số tiền</th><th>Lý do</th><th>Thanh toán</th>{!reader && <th>Thao tác</th>}</tr></thead><tbody>
            {loading ? <tr><td colSpan={8}>Đang tải…</td></tr> : !items.length ? <tr><td colSpan={8}>Không có khoản phạt phù hợp.</td></tr> : items.map(item => <tr key={item.id}>
                <td>#{item.id}<small>{date(item.createdAt)}</small></td>{!reader && <td>{item.borrowerName}<small>{item.borrowerCode}</small></td>}
                <td>{item.bookTitle}<small>{item.barcode} · Phiếu #{item.borrowRecordId}</small></td><td>{item.overdueDays} ngày</td><td><strong>{money(item.amount)}</strong></td><td>{item.reason}</td>
                <td><span className={`cm-badge cm-${item.status}`}>{item.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>{item.paidAt && <small>{date(item.paidAt)}</small>}</td>
                {!reader && <td>{item.status === 'UNPAID' && <button disabled={busy || !!selected} onClick={() => setSelected(item)}>Thu tiền</button>}</td>}
            </tr>)}
        </tbody></table></div>
    </section>;
}
