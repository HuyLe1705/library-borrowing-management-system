import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getReservations, decideReservation } from '../../Services/circulationService';
import './CirculationModules.css';

const labels = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt / chờ nhận', FULFILLED: 'Đã bàn giao', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };
const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
export default function BorrowRequests() {
    const loadVersion = useRef(0);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('PENDING');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total:0, totalPages:1 });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [selected, setSelected] = useState(null);
    const [copyId, setCopyId] = useState('');
    const [deadline, setDeadline] = useState('');
    const [note, setNote] = useState('');
    const load = useCallback(async () => {
        const version = ++loadVersion.current;
        setLoading(true); setError('');
        try { const result = await getReservations({ status, page, size:10 }); if (version !== loadVersion.current) return; setItems(result.items); setPagination(result.pagination); if (page > result.pagination.totalPages) setPage(result.pagination.totalPages); }
        catch (err) { if (version === loadVersion.current) setError(err.message); }
        finally { if (version === loadVersion.current) setLoading(false); }
    }, [status, page]);
    useEffect(() => { load(); }, [load]);
    const submit = async event => {
        event.preventDefault(); setBusy(true); setError(''); setMessage('');
        try {
            await decideReservation(selected.id, selected.action, { adminNote:note, ...(copyId ? { copyId:Number(copyId) } : {}), ...(deadline ? { pickupDeadline:deadline } : {}) });
            setSelected(null); setMessage('Đã xử lý yêu cầu.'); await load();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };
    const actions = item => item.status === 'PENDING' ? ['approve','reject'] : item.status === 'APPROVED' ? ['fulfill','cancel'] : [];
    const actionLabels = { approve:'Duyệt', reject:'Từ chối', fulfill:'Bàn giao sách', cancel:'Hủy giữ sách' };
    return <section className="circulation-module">
        <div className="cm-heading"><div><h1>Yêu cầu mượn sách</h1><p>Duyệt để giữ bản sao. Bàn giao khi độc giả đến nhận để tạo phiếu mượn.</p></div><button disabled={loading || busy} onClick={load}>Làm mới</button></div>
        <div className="cm-filters"><label>Trạng thái<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả</option>{Object.entries(labels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><span>{pagination.total} yêu cầu</span></div>
        {error && <div className="cm-error" role="alert">{error}</div>}{message && <div className="cm-success" role="status">{message}</div>}
        {selected && <form className="cm-decision" onSubmit={submit}><h3>{actionLabels[selected.action]} #{selected.id}</h3>
            {selected.action === 'approve' && <><label>ID bản sao (để trống để tự động chọn)<input type="number" min="1" step="1" value={copyId} onChange={e => setCopyId(e.target.value)} /></label><label>Hạn nhận (mặc định 3 ngày)<input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></label></>}
            {selected.action === 'fulfill' && <p>Xác nhận độc giả đã đến nhận đúng bản sao. Hạn mượn bắt đầu từ hôm nay.</p>}
            <label>Ghi chú<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label>
            <div className="cm-actions"><button disabled={busy}>Xác nhận</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Đóng</button></div></form>}
        <div className="cm-table-wrap"><table><thead><tr><th>Mã / Ngày gửi</th><th>Độc giả</th><th>Sách / Mã vạch</th><th>Ngày nhận / Hạn nhận</th><th>Ghi chú</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
            {loading ? <tr><td colSpan={7}>Đang tải…</td></tr> : !items.length ? <tr><td colSpan={7}>Không có yêu cầu phù hợp.</td></tr> : items.map(item => <tr key={item.id}>
                <td>#{item.id}<small>{date(item.requestDate)}</small></td><td>{item.borrowerName}<small>{item.borrowerCode}</small></td><td>{item.bookTitle}<small>{item.barcode || 'Chưa gán bản sao'}</small></td>
                <td>{date(item.expectedPickupDate)}<small>Hạn: {date(item.pickupDeadline)}</small></td><td>{item.note || '—'}<small>{item.adminNote}</small></td><td><span className={`cm-badge cm-${item.status}`}>{labels[item.status]}</span></td>
                <td><div className="cm-actions">{actions(item).map(action => <button key={action} disabled={busy || !!selected} onClick={() => { setSelected({ id:item.id, action }); setNote(''); setCopyId(''); setDeadline(''); }}>{actionLabels[action]}</button>)}</div></td>
            </tr>)}
        </tbody></table></div>
        <div className="cm-pagination"><button disabled={page <= 1 || loading || busy} onClick={() => setPage(page-1)}>Trước</button><span>{page} / {pagination.totalPages}</span><button disabled={page >= pagination.totalPages || loading || busy} onClick={() => setPage(page+1)}>Sau</button></div>
    </section>;
}
