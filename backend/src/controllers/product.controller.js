const productService = require('../services/product.service');
const ApiResponse = require('../utils/ApiResponse');
const parsePaging = require('../utils/parsePaging');
const { validatePrice, validateCategoryId, validateReferencePrice } = require('../utils/validators');

/**
 * 控制器只做「取参 -> 校验 -> 调 service -> 返回」，不写 SQL。
 */
exports.listProducts = async (req, res, next) => {
  try {
    const { keyword, categoryId } = req.query;
    const list = await productService.listProducts({
      keyword: keyword ? String(keyword).trim() : '',
      categoryId: categoryId || null
    });
    res.json(ApiResponse.success(list));
  } catch (err) {
    next(err);
  }
};

/**
 * 分页列表：GET /api/products/page?page=&size=&keyword=&categoryId=
 * page/size 非法时 parsePaging 直接抛 400，交由全局错误处理。
 */
exports.listProductsPaged = async (req, res, next) => {
  try {
    const { keyword, categoryId } = req.query;
    const { page, size, offset } = parsePaging(req.query, { defaultSize: 10, maxSize: 50 });

    const result = await productService.listProductsPaged({
      keyword: keyword ? String(keyword).trim() : '',
      categoryId: categoryId || null,
      page,
      size,
      offset
    });
    res.json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json(ApiResponse.fail('商品不存在', 404));
    }
    res.json(ApiResponse.success(product));
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { title, description, price, categoryId, imageUrl, referencePrice } = req.body;

    // 必填校验：标题（价格/分类/参考价校验提取到 utils/validators，失败抛 400 交 errorHandler 统一返回）
    if (!title || !String(title).trim()) {
      return res.status(400).json(ApiResponse.fail('标题不能为空', 400));
    }
    const numPrice = validatePrice(price);
    const numCategoryId = validateCategoryId(categoryId);
    const numReferencePrice = validateReferencePrice(referencePrice);

    // AI 草稿必须由卖家确认后才会走到这里；服务端不接受任何“AI 自动发布”路径。
    const product = await productService.createProduct({
      title: String(title).trim(),
      description: description || '',
      price: numPrice,
      categoryId: numCategoryId,
      imageUrl: imageUrl || '',
      referencePrice: numReferencePrice
    });
    res.status(201).json(ApiResponse.success(product, '发布成功'));
  } catch (err) {
    next(err);
  }
};

/**
 * 编辑商品：只接受白名单字段，且每个字段先过校验再落库。
 * 任一非法输入必须 400，且不得污染原数据。
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const body = req.body || {};
    const patch = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return res.status(400).json(ApiResponse.fail('标题不能为空', 400));
      }
      patch.title = body.title.trim();
    }

    if (body.price !== undefined) patch.price = validatePrice(body.price);
    if (body.categoryId !== undefined) patch.categoryId = validateCategoryId(body.categoryId);
    if (body.referencePrice !== undefined) patch.referencePrice = validateReferencePrice(body.referencePrice);

    if (body.description !== undefined) patch.description = body.description;
    if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl;

    const product = await productService.updateProduct(req.params.id, patch);
    if (!product) {
      return res.status(404).json(ApiResponse.fail('商品不存在', 404));
    }
    res.json(ApiResponse.success(product, '更新成功'));
  } catch (err) {
    next(err);
  }
};
