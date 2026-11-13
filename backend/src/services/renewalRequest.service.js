const repository = require('../repositories/renewalRequest.repository');
const log = require('./activityLog.service');
const validate = require('../utils/validation');
const HttpError = require('../utils/httpError');

module.exports = {
    list(query, user) {
        if (query.status && !['PENDING','APPROVED','REJECTED','CANCELLED'].includes(query.status)) throw new HttpError(400, 'Trạng thái không hợp lệ.');
        return repository.list(query, user);
    },
    async create(payload = {}, user) {
        const data = await repository.create(validate.id(payload.borrowRecordId), validate.note(payload.note), user);
        await log.log({ action: 'RENEWAL_REQUEST', user, targetType: 'RENEWAL_REQUEST', targetId: data.id, details: `Gửi yêu cầu gia hạn phiếu #${payload.borrowRecordId}` });
        return data;
    },
    async decide(id, status, payload = {}, user) {
        if (status !== 'CANCELLED' && !validate.staff(user)) throw new HttpError(403, 'Chỉ thủ thư được duyệt yêu cầu.');
        const data = await repository.decide(validate.id(id), status, validate.note(payload.adminNote), user);
        await log.log({ action: `${status}_RENEWAL`, user, targetType: 'RENEWAL_REQUEST', targetId: data.id, details: `Yêu cầu gia hạn #${id}: ${status}` });
        return data;
    },
};
