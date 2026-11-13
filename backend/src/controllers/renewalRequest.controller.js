const service = require('../services/renewalRequest.service');
const wrap = require('../utils/asyncHandler');
exports.list = wrap(async (req, res) => res.json({ success: true, data: await service.list(req.query, req.user) }));
exports.create = wrap(async (req, res) => res.status(201).json({ success: true, data: await service.create(req.body, req.user) }));
exports.decide = (status) => wrap(async (req, res) => res.json({ success: true, data: await service.decide(req.params.id, status, req.body, req.user) }));
