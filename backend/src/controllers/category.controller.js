const categoryService = require('../services/category.service');
const ApiResponse = require('../utils/ApiResponse');

exports.listCategories = async (req, res, next) => {
  try {
    const list = await categoryService.listCategories();
    res.json(ApiResponse.success(list));
  } catch (err) {
    next(err);
  }
};
