const repository = require('../repositories/fine.repository');
const borrowService = require('./borrow.service');
const activity = require('./activityLog.service');
const validate = require('../utils/validation');
const HttpError = require('../utils/httpError');
module.exports = {
    list(query, user) {
        if (query.status && !['UNPAID','PAID'].includes(query.status)) throw new HttpError(400, 'Trạng thái phiếu phạt không hợp lệ.');
        return repository.list(query, user);
    },
    async create(payload = {}, user) {
        const data = await repository.create(validate.id(payload.borrowRecordId), validate.note(payload.reason,255), user);
        await activity.log({ action: 'CREATE_FINE', user, targetType: 'FINE', targetId: data.id, details: `Lập phiếu phạt #${data.id}: ${data.amount} VNĐ` });
        return data;
    },
    pay: (id, user) => borrowService.payFine(id, user),
};
