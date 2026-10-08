const productService = require('../services/product.service');
const ApiResponse = require('../utils/ApiResponse');
const parsePaging = require('../utils/parsePaging');

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

    // 必填校验：标题、价格、分类
    if (!title || !String(title).trim()) {
      return res.status(400).json(ApiResponse.fail('标题不能为空', 400));
    }
    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      return res.status(400).json(ApiResponse.fail('价格不合法', 400));
    }
    if (!categoryId) {
      return res.status(400).json(ApiResponse.fail('请选择分类', 400));
    }

    // AI 草稿必须由卖家确认后才会走到这里；服务端不接受任何“AI 自动发布”路径。
    const product = await productService.createProduct({
      title: String(title).trim(),
      description: description || '',
      price: numPrice,
      categoryId: Number(categoryId),
      imageUrl: imageUrl || '',
      referencePrice: referencePrice != null ? Number(referencePrice) : null
    });
    res.status(201).json(ApiResponse.success(product, '发布成功'));
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json(ApiResponse.fail('商品不存在', 404));
    }
    res.json(ApiResponse.success(product, '更新成功'));
  } catch (err) {
    next(err);
  }
};
